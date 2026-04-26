// ---------------------------------------------------------------------------
// /api/inspire — Phase 1 ingestion endpoint
// ---------------------------------------------------------------------------
//
// Vision-in / vision-out. Accepts an image upload OR a Mobbin/Dribbble/etc URL,
// extracts a canonical Signature, and persists it to the inspirations table.
//
// Flow:
//   1. Auth gate (Supabase). RLS already enforces this on insert; we 401 early
//      so the user gets a clean error before bytes are uploaded.
//   2. Parse FormData → bytes (file) or fetchOgImage(url) → bytes
//   3. SHA-256 the bytes. Per-user cache lookup; return early on hit.
//   4. Decode + run deterministic k-means palette extraction (lib/palette.ts).
//   5. Upload to Blob if user-uploaded. OG keeps the source imageUrl.
//   6. Call Gemini 3 Flash via generateText + Output.object() with the image
//      and the deterministic palette as input context.
//   7. Validate Gemini's palette against our deterministic hexes; fall back
//      to heuristic assignRoles() if Gemini wandered.
//   8. Persist Signature to inspirations row, return { inspirationId, signature }.
// ---------------------------------------------------------------------------

import { generateText, Output } from "ai"
import { put } from "@vercel/blob"
import { createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import {
  signatureSchema,
  type Signature,
  type SourceType,
  type PaletteSwatch,
} from "@/lib/signature"
import { extractPaletteFromPixels, hexToRgb } from "@/lib/palette"
import { assignRoles, type RawPalette } from "@/lib/palette"
import { fetchOgImage, isOgAllowedDomain } from "@/lib/og"

export const maxDuration = 60
export const runtime = "nodejs"

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024 // 12MB

// ---------------------------------------------------------------------------
// Schema for the LLM step.
//   - We omit `source` (server-attached).
//   - Palette stays in the schema so Gemini fills role + name + hex from the
//     deterministic five we provided. We post-validate that every hex Gemini
//     returned matches one of ours; if not, we fall back to assignRoles().
// ---------------------------------------------------------------------------
const generationSchema = signatureSchema.omit({ source: true })

export async function POST(req: Request) {
  // 1) Auth gate
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Sign in to extract a signature." }, { status: 401 })
  }

  // 2) Parse input → bytes
  const ct = req.headers.get("content-type") ?? ""
  let bytes: ArrayBuffer
  let sourceType: SourceType
  let sourceRef: string
  let mediaType = "image/png"

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData()
      const ogUrl = (form.get("ogUrl") as string | null)?.trim() || null
      const file = form.get("file") as File | null

      if (ogUrl) {
        const og = await fetchOgImage(ogUrl)
        if (!og.ok) return Response.json({ error: og.error }, { status: 400 })
        bytes = og.bytes
        sourceType = "og"
        sourceRef = og.imageUrl
        mediaType = "image/jpeg"
      } else if (file) {
        if (file.size === 0)
          return Response.json({ error: "Image file is empty." }, { status: 400 })
        if (file.size > MAX_UPLOAD_BYTES)
          return Response.json({ error: "Image is too large (max 12MB)." }, { status: 400 })
        if (!file.type.startsWith("image/"))
          return Response.json({ error: "File must be an image." }, { status: 400 })
        bytes = await file.arrayBuffer()
        sourceType = "image"
        sourceRef = file.name || "upload"
        mediaType = file.type || "image/png"
      } else {
        return Response.json({ error: "Provide a file or ogUrl." }, { status: 400 })
      }
    } else {
      // JSON path — only supports ogUrl.
      const body = (await req.json().catch(() => ({}))) as { ogUrl?: string }
      const ogUrl = body.ogUrl?.trim()
      if (!ogUrl) return Response.json({ error: "Provide a file or ogUrl." }, { status: 400 })
      const og = await fetchOgImage(ogUrl)
      if (!og.ok) return Response.json({ error: og.error }, { status: 400 })
      bytes = og.bytes
      sourceType = "og"
      sourceRef = og.imageUrl
      mediaType = "image/jpeg"
    }
  } catch (e) {
    console.error("[v0] /api/inspire input error:", e)
    return Response.json({ error: "Could not read input." }, { status: 400 })
  }

  // 3) Hash + per-user cache lookup
  const sourceHash = createHash("sha256").update(Buffer.from(bytes)).digest("hex")
  {
    const { data: cached } = await supabase
      .from("inspirations")
      .select("id, signature")
      .eq("owner_id", user.id)
      .eq("source_hash", sourceHash)
      .maybeSingle()
    if (cached?.signature) {
      return Response.json({
        inspirationId: cached.id,
        signature: cached.signature,
        cached: true,
      })
    }
  }

  // 4) Decode + deterministic palette extraction (sharp)
  let deterministicPalette: PaletteSwatch[]
  let rawPalette: RawPalette = []
  try {
    const sharp = (await import("sharp")).default
    const { data, info } = await sharp(Buffer.from(bytes))
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({ width: 96, height: 96, fit: "inside", withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const stride = info.channels
    const pixels = []
    for (let i = 0; i + 2 < data.length; i += stride) {
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
    }
    deterministicPalette = extractPaletteFromPixels(pixels)
    // Build a parallel RawPalette so we can fall back to assignRoles() if
    // Gemini's palette doesn't match our deterministic hexes.
    rawPalette = deterministicPalette.map((s) => ({
      rgb: hexToRgb(s.hex),
      hex: s.hex,
      population: 1,
    }))
  } catch (e) {
    console.error("[v0] /api/inspire palette decode failed:", e)
    return Response.json({ error: "Couldn't decode that image." }, { status: 400 })
  }

  // 5) Upload to Blob if user-uploaded. OG keeps the source imageUrl.
  let screenshotUrl: string
  if (sourceType === "image") {
    try {
      const ext = mediaType.split("/")[1]?.split("+")[0] || "png"
      const path = `inspirations/${user.id}/${sourceHash}.${ext}`
      const blob = await put(path, Buffer.from(bytes), {
        access: "public",
        addRandomSuffix: false,
        contentType: mediaType,
      })
      screenshotUrl = blob.url
      sourceRef = blob.url
    } catch (e) {
      console.error("[v0] /api/inspire blob upload failed:", e)
      return Response.json({ error: "Couldn't store the image." }, { status: 500 })
    }
  } else {
    screenshotUrl = sourceRef
  }

  // 6) Multimodal Gemini call. Pre-extracted hex values are passed in as
  //    text context — Gemini's job is to assign roles + names + the rest of
  //    the signature, not to invent hex values from a thumbnail.
  const palettePromptList = deterministicPalette
    .map((s, i) => `  ${i + 1}. ${s.hex}`)
    .join("\n")

  const system = `You are Prism, a senior design director extracting a structured Signature from a single piece of visual reference.

OUTPUT CONTRACT:
- Fill every field in the schema. The Signature is consumed by a recommender that needs sharp, decisive answers.
- The palette MUST contain exactly five swatches whose hex values are the five we extracted deterministically below — copy them verbatim. Your job is to assign one role and one short evocative name per swatch.
  - Roles: 'bg' (background), 'fg' (foreground/text), 'accent' (brand/CTA), 'muted' (secondary surface), 'highlight' (loud detail). Each role appears exactly once.
- Vibe and audience MUST come from the canonical enums in the schema. No improvisation.
- contentSignature is one literal sentence: what does this site or image show?
- vibeStatement is one short evocative phrase about the aesthetic. audienceStatement is one sentence on who this is for.
- contentHooks: extract any actual headline / CTA / nav labels you can read in the image so a redesigned PreviewPane can read as 'same content, redone' rather than a sparse imitation. Skip any field you can't see.
- libraryHints: 0–6 short library names that would be a fit (e.g. 'three.js', 'gsap', 'framer-motion', 'lenis'). Hints, not commitments.
- brief: a self-contained 60–200 word designer-to-designer prompt that captures the inspiration so vividly another designer could rebuild a related site from it alone.
- Avoid purple/violet roles unless the image is genuinely purple-led.`

  const userText = `Extract a Signature from the attached image.

DETERMINISTIC PALETTE (use these hex values verbatim, assign roles + names):
${palettePromptList}

Return the full Signature as structured output.`

  let llmSignature: Omit<Signature, "source">
  try {
    const { output } = await generateText({
      model: "google/gemini-3-flash",
      output: Output.object({ schema: generationSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image", image: Buffer.from(bytes), mediaType },
          ],
        },
      ],
      system,
    })
    llmSignature = output as Omit<Signature, "source">
  } catch (e) {
    console.error("[v0] /api/inspire LLM call failed:", e)
    return Response.json(
      { error: "Couldn't extract a signature from that image. Try a different one." },
      { status: 502 }
    )
  }

  // 7) Validate palette: every hex must match a deterministic hex (case-insensitive).
  //    If Gemini wandered, we keep its role/name semantics where possible by mapping
  //    the closest deterministic hex; otherwise fall back to assignRoles().
  const detSet = new Set(deterministicPalette.map((s) => s.hex.toLowerCase()))
  const gemPalette = llmSignature.palette ?? []
  const allMatched = gemPalette.length === 5 && gemPalette.every((s) => detSet.has(s.hex.toLowerCase()))
  const allRolesPresent =
    new Set(gemPalette.map((s) => s.role)).size === 5
  const finalPalette: PaletteSwatch[] =
    allMatched && allRolesPresent
      ? gemPalette.map((s) => ({ ...s, hex: s.hex.toLowerCase() }))
      : assignRoles(rawPalette)

  // 8) Persist signature
  const signature: Signature = {
    ...llmSignature,
    palette: finalPalette,
    source: { type: sourceType, ref: sourceRef, hash: sourceHash },
  }

  const { data: inserted, error: insertError } = await supabase
    .from("inspirations")
    .insert({
      owner_id: user.id,
      source_type: sourceType,
      source_ref: sourceRef,
      source_hash: sourceHash,
      screenshot_url: screenshotUrl,
      signature: signature as unknown as Record<string, unknown>,
      is_public: false,
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    console.error("[v0] /api/inspire insert failed:", insertError)
    // Non-fatal: return the signature anyway so the UI still works.
    return Response.json({ inspirationId: null, signature, cached: false })
  }

  return Response.json({
    inspirationId: inserted.id as string,
    signature,
    cached: false,
  })
}
