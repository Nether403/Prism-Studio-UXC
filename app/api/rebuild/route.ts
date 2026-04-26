// ---------------------------------------------------------------------------
// /api/rebuild — Phase 2 entry point: live-rebuild any URL.
// ---------------------------------------------------------------------------
//
// Pipeline (every step fail-closed):
//   1. Auth gate (Supabase)
//   2. Per-IP rate limit  — 30/hour sliding window
//   3. URL validation     — scheme, blocklist, DNS-resolved private-IP guard
//   4. robots.txt         — best-effort, conservative-allow
//   5. Pre-flight quota   — read-only; debit only on full success
//   6. Cache lookup       — per-owner (owner_id, source_hash) on inspirations
//   7. Capture + scrape   — parallel; capture via lib/capture provider chain
//   8. Decode + palette   — deterministic, fed INTO the multimodal call
//   9. Signature          — generateText + Output.object(signatureSchema)
//                           on Gemini 3 Flash, screenshot bytes inline
//  10. Validate palette   — same drift guard as inspire route
//  11. Persist            — write to inspirations(source_type='url')
//  12. Consume quota      — success-only billing
//
// Variant generation is a separate roundtrip to /api/variants — keeps the
// first paint fast (capture + signature ~10s; variants ~10s after).
// ---------------------------------------------------------------------------

import { generateText, Output } from "ai"
import { createHash } from "node:crypto"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  signatureSchema,
  type Signature,
  type PaletteSwatch,
} from "@/lib/signature"
import {
  extractPaletteFromPixels,
  assignRoles,
  type RawPalette,
} from "@/lib/palette"
import { captureScreenshot } from "@/lib/capture"
import { validateRebuildUrl, checkRobots } from "@/lib/url-guard"
import { scrapeContent, type ScrapedContent } from "@/lib/scrape"
import {
  rebuildRateLimit,
  consumeRebuildQuota,
  readRebuildQuota,
  getClientIp,
  type QuotaStatus,
} from "@/lib/ratelimit"

export const runtime = "nodejs"
export const maxDuration = 60

const generationSchema = signatureSchema.omit({ source: true })
const inputSchema = z.object({
  url: z.string().min(4).max(2048),
})

type ErrorResponse = { error: string; code: string; detail?: unknown }

function err(code: string, error: string, status: number, detail?: unknown) {
  return Response.json({ error, code, detail } satisfies ErrorResponse, { status })
}

/**
 * Normalize a URL into a stable cache key form:
 *  - lowercase scheme + host
 *  - drop default ports
 *  - drop hash
 *  - keep path verbatim (case-sensitive)
 *  - keep search params but sorted
 */
function normalizeUrl(url: URL): string {
  const u = new URL(url.toString())
  u.hash = ""
  u.protocol = u.protocol.toLowerCase()
  u.hostname = u.hostname.toLowerCase()
  if (
    (u.protocol === "http:" && u.port === "80") ||
    (u.protocol === "https:" && u.port === "443")
  ) {
    u.port = ""
  }
  if (u.searchParams) {
    const entries = [...u.searchParams.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )
    u.search = ""
    for (const [k, v] of entries) u.searchParams.append(k, v)
  }
  return u.toString()
}

export async function POST(req: Request) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return err("unauthenticated", "You must be signed in to rebuild a site.", 401)
  }

  // ── 2. Rate limit (per-IP backstop) ──────────────────────────────────────
  const ip = getClientIp(req)
  const rl = await rebuildRateLimit.limit(ip)
  if (!rl.success) {
    return err(
      "ip_rate_limited",
      "Too many rebuilds from this address. Try again in a few minutes.",
      429,
    )
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err("invalid_body", "Body must be valid JSON.", 400)
  }
  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) {
    return err("invalid_input", "Invalid input.", 400, parsed.error.issues)
  }

  // ── 3. URL validation ────────────────────────────────────────────────────
  const validation = await validateRebuildUrl(parsed.data.url)
  if (!validation.ok) {
    return err(validation.code, validation.reason, 400)
  }
  const { url, hostname } = validation

  // ── 4. robots.txt ────────────────────────────────────────────────────────
  const robots = await checkRobots(url)
  if (!robots.allowed) {
    return err("robots_disallowed", robots.reason || "robots.txt disallows this path.", 403)
  }

  // ── 5. Pre-flight quota ──────────────────────────────────────────────────
  const preQuota = await readRebuildQuota(user.id)
  if (!preQuota.ok) {
    return err(
      "quota_exhausted",
      `You've used your ${preQuota.limit} daily rebuilds. Resets at ${preQuota.resetAt}.`,
      429,
      { quota: preQuota },
    )
  }

  // ── 6. Cache lookup (per-owner, on normalized URL hash) ──────────────────
  const normalized = normalizeUrl(url)
  const sourceHash = createHash("sha256").update(normalized).digest("hex")

  const cached = await supabase
    .from("inspirations")
    .select("id, signature, screenshot_url, generated_stack_id")
    .eq("owner_id", user.id)
    .eq("source_hash", sourceHash)
    .maybeSingle()

  if (cached.data?.signature) {
    return Response.json({
      inspirationId: cached.data.id,
      signature: cached.data.signature as unknown as Signature,
      screenshot: cached.data.screenshot_url
        ? { url: cached.data.screenshot_url, width: 1280, height: 800 }
        : null,
      content: null,
      watermark: makeWatermark(hostname),
      quota: preQuota,
      cached: true,
      generatedStackId: cached.data.generated_stack_id,
    } satisfies RebuildSuccess)
  }

  // ── 7. Capture + scrape in parallel ──────────────────────────────────────
  const [captureResult, scrapeResult] = await Promise.allSettled([
    captureScreenshot(normalized),
    scrapeContent(url),
  ])

  if (captureResult.status === "rejected") {
    return err(
      "capture_failed",
      "We could not capture this site. The site may be blocking screenshot tools or the capture provider is down.",
      502,
      String(captureResult.reason),
    )
  }
  const capture = captureResult.value
  const scrape = scrapeResult.status === "fulfilled" ? scrapeResult.value : null

  // ── 8. Fetch screenshot bytes ONCE, then decode + palette ───────────────
  // Reused for the multimodal call so we don't double-fetch the CDN URL.
  let screenshotBytes: ArrayBuffer
  try {
    const r = await fetch(capture.pngUrl)
    if (!r.ok) throw new Error(`screenshot fetch ${r.status}`)
    screenshotBytes = await r.arrayBuffer()
  } catch (e) {
    return err(
      "capture_fetch_failed",
      "Captured the screenshot but could not download it for analysis.",
      502,
      String(e),
    )
  }

  let rawPalette: RawPalette
  let mediaType: string
  let pixels: { r: number; g: number; b: number }[]
  try {
    const sharp = (await import("sharp")).default
    const meta = await sharp(Buffer.from(screenshotBytes)).metadata()
    mediaType = `image/${meta.format ?? "png"}`
    const { data, info } = await sharp(Buffer.from(screenshotBytes))
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({ width: 96, height: 96, fit: "inside", withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const stride = info.channels
    pixels = []
    for (let i = 0; i + 2 < data.length; i += stride) {
      pixels.push({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! })
    }
    rawPalette = extractPaletteFromPixels(pixels, { k: 5 })
  } catch (e) {
    return err(
      "palette_failed",
      "We captured the site but could not analyze its palette.",
      502,
      String(e),
    )
  }

  const deterministicPalette: PaletteSwatch[] = assignRoles(rawPalette)
  const palettePromptList = deterministicPalette
    .map((s, i) => `  ${i + 1}. ${s.hex}`)
    .join("\n")

  // ── 9. Signature: structured multimodal call ────────────────────────────
  const contentHint = scrape?.ok
    ? [
        scrape.content.title && `Title: ${scrape.content.title}`,
        scrape.content.description && `Description: ${scrape.content.description}`,
        scrape.content.h1 && `H1: ${scrape.content.h1}`,
        scrape.content.navLabels.length > 0 &&
          `Navigation: ${scrape.content.navLabels.join(" | ")}`,
        scrape.content.sectionHeadlines.length > 0 &&
          `Section headlines:\n  - ${scrape.content.sectionHeadlines.join("\n  - ")}`,
        scrape.content.heroAlt && `Hero alt: ${scrape.content.heroAlt}`,
        scrape.content.primaryCta && `Primary CTA: ${scrape.content.primaryCta}`,
        scrape.content.bodyTextSample && `Body excerpt: ${scrape.content.bodyTextSample}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "(content scrape failed — relying on screenshot only)"

  const system = `You are Prism, a senior design director analyzing a captured website to produce a structured Signature.

OUTPUT CONTRACT:
- Fill every field in the schema. The Signature is consumed by a recommender that needs sharp, decisive answers.
- The palette MUST contain exactly five swatches whose hex values are the five we extracted deterministically below — copy them verbatim. Your job is to assign one role and one short evocative name per swatch.
  - Roles: 'bg' (background), 'fg' (foreground/text), 'accent' (brand/CTA), 'muted' (secondary surface), 'highlight' (loud detail). Each role appears exactly once.
- 'vibe' must come from the canonical enum. 'audience' must come from the canonical enum. 'performanceHint' must come from the canonical enum (max | balanced | rich).
- contentSignature: one literal sentence — what does this site DO?
- vibeStatement: one short evocative phrase about the aesthetic.
- audienceStatement: one sentence on who this is for, in plain product language.
- contentHooks: extract REAL content from the scraped HTML below. Use the actual nav labels, section headlines, hero alt, and CTA — do NOT paraphrase. This is what makes the redesign read as "the same site, redone" instead of a sparse imitation.
- libraryHints: 3–6 short tokens (e.g. 'three.js', 'gsap', 'framer-motion', 'lenis', 'tailwind').
- motionLevel: 0=static, 1=subtle, 2=expressive, 3=cinematic.
- brief: a self-contained 60–200 word designer-to-designer prompt that captures the site's purpose, audience, and signature visual qualities. This is what gets handed to recommend() verbatim.
- Avoid purple/violet roles unless the source is genuinely purple-led.
- Your goal is NOT to imitate the source pixel-for-pixel — it's to capture its essence so the redesign reads as a fresh interpretation.`

  const userText = `Source URL: ${normalized}
Hostname: ${hostname}

DETERMINISTIC PALETTE (use these hex values verbatim, assign roles + names):
${palettePromptList}

EXTRACTED CONTENT (use the literal text where relevant):
${contentHint}

Analyze the attached screenshot together with the palette and content. Return the full Signature as structured output.`

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
            { type: "image", image: Buffer.from(screenshotBytes), mediaType },
          ],
        },
      ],
      system,
    })
    llmSignature = output as Omit<Signature, "source">
  } catch (e) {
    console.error("[v0] /api/rebuild LLM call failed:", e)
    return err(
      "signature_failed",
      "Captured the site but could not analyze it. Try again in a moment.",
      502,
      String(e),
    )
  }

  // ── 10. Palette drift guard (same as inspire route) ─────────────────────
  const detSet = new Set(deterministicPalette.map((s) => s.hex.toLowerCase()))
  const gemPalette = llmSignature.palette ?? []
  const allMatched =
    gemPalette.length === 5 && gemPalette.every((s) => detSet.has(s.hex.toLowerCase()))
  const allRolesPresent = new Set(gemPalette.map((s) => s.role)).size === 5
  const finalPalette: PaletteSwatch[] =
    allMatched && allRolesPresent
      ? gemPalette.map((s) => ({ ...s, hex: s.hex.toLowerCase() }))
      : assignRoles(rawPalette)

  // ── 11. Persist ──────────────────────────────────────────────────────────
  const signature: Signature = {
    ...llmSignature,
    palette: finalPalette,
    source: { type: "url", ref: normalized, hash: sourceHash },
  }

  const insert = await supabase
    .from("inspirations")
    .insert({
      owner_id: user.id,
      source_type: "url",
      source_ref: normalized,
      source_hash: sourceHash,
      screenshot_url: capture.pngUrl,
      signature: signature as unknown as Record<string, unknown>,
      is_public: false,
    })
    .select("id")
    .single()

  if (insert.error || !insert.data) {
    return err(
      "persist_failed",
      "Generated the signature but could not save it.",
      500,
      insert.error?.message,
    )
  }

  // ── 12. Consume quota (success-only billing) ────────────────────────────
  const postQuota = await consumeRebuildQuota(user.id)

  return Response.json({
    inspirationId: insert.data.id,
    signature,
    screenshot: { url: capture.pngUrl, width: capture.width, height: capture.height },
    content: scrape?.ok ? scrape.content : null,
    watermark: makeWatermark(hostname),
    quota: postQuota,
    cached: false,
  } satisfies RebuildSuccess)
}

function makeWatermark(hostname: string) {
  return {
    label: "Prism reinterpretation",
    sourceHostname: hostname,
    disclaimer: `Not affiliated with ${hostname}. Source captured via public crawl.`,
  }
}

export type RebuildSuccess = {
  inspirationId: string
  signature: Signature
  screenshot: { url: string; width: number; height: number } | null
  content: ScrapedContent | null
  watermark: { label: string; sourceHostname: string; disclaimer: string }
  quota: QuotaStatus
  cached: boolean
  generatedStackId?: string | null
}
