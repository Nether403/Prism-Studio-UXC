// ---------------------------------------------------------------------------
// /api/inspire — Phase 1 ingestion endpoint
// ---------------------------------------------------------------------------
//
// Vision-in / vision-out. Accepts an image upload OR a Mobbin/Dribbble/etc URL,
// extracts a canonical Signature, and persists it to the inspirations table.
//
// All signature-extraction logic lives in lib/extract-signature.ts so this
// route, /api/rebuild, and the eval harness all share one prompt + one schema.
// ---------------------------------------------------------------------------

import { put } from "@vercel/blob"
import { createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { type Signature, type SourceType } from "@/lib/signature"
import { fetchOgImage } from "@/lib/og"
import { extractSignature } from "@/lib/extract-signature"

export const maxDuration = 60
export const runtime = "nodejs"

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024 // 12MB

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

  // 4) Upload to Blob if user-uploaded (so the dashboard card has a thumbnail).
  //    OG keeps the source imageUrl.
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

  // 5) Run the canonical extraction pipeline (decode → palette → Gemini → drift guard).
  let signature: Signature
  try {
    const result = await extractSignature({
      imageBytes: bytes,
      mediaType,
      source: { type: sourceType, ref: sourceRef, hash: sourceHash },
    })
    signature = result.signature
    if (!result.paletteMatched) {
      console.warn("[v0] /api/inspire palette drift; fell back to deterministic roles", {
        owner: user.id,
        sourceHash,
      })
    }
  } catch (e) {
    console.error("[v0] /api/inspire extractSignature failed:", e)
    return Response.json(
      { error: "Couldn't extract a signature from that image. Try a different one." },
      { status: 502 }
    )
  }

  // 6) Persist signature
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
