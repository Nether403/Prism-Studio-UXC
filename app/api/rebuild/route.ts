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
//   8. Signature          — extractSignature() (lib/extract-signature.ts)
//   9. Persist            — write to inspirations(source_type='url')
//  10. Consume quota      — success-only billing
//
// Variant generation is a separate roundtrip to /api/variants — keeps the
// first paint fast (capture + signature ~10s; variants ~10s after).
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { type Signature } from "@/lib/signature"
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
import { extractSignature } from "@/lib/extract-signature"

export const runtime = "nodejs"
export const maxDuration = 60

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

  // Phase 5 escape hatch — `?force=1` skips the public cache lookup so the
  // user can demand a fresh capture even if someone else has already
  // captured this URL publicly.
  const force = new URL(req.url).searchParams.get("force") === "1"

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

  // ── 6.5 Public cache lookup ──────────────────────────────────────────────
  //
  // Phase 5: cross-user reuse. If someone else has rebuilt this URL and
  // marked the resulting inspiration public, we clone the signature into
  // an owned row, bump cache_hit_count on the parent, and skip the
  // capture/extract pipeline entirely. This also DOESN'T consume the
  // user's daily quota — cached responses are free.
  //
  // `?force=1` opts out, for when the public version is stale.
  if (!force) {
    const { data: publicHit } = await supabase
      .from("inspirations")
      .select("id, signature, screenshot_url, source_ref, cache_hit_count")
      .eq("source_hash", sourceHash)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (publicHit?.signature) {
      const { data: cloned, error: cloneErr } = await supabase
        .from("inspirations")
        .insert({
          owner_id: user.id,
          source_type: "url",
          source_ref: publicHit.source_ref,
          source_hash: sourceHash,
          screenshot_url: publicHit.screenshot_url,
          signature: publicHit.signature as Record<string, unknown>,
          parent_inspiration_id: publicHit.id,
          is_public: false,
        })
        .select("id")
        .single()

      if (!cloneErr && cloned) {
        const { data: bumped } = await supabase.rpc("bump_cache_hit", {
          p_inspiration_id: publicHit.id,
        })
        const cacheHits =
          typeof bumped === "number" ? bumped : (publicHit.cache_hit_count ?? 0) + 1

        return Response.json({
          inspirationId: cloned.id,
          signature: publicHit.signature as unknown as Signature,
          screenshot: publicHit.screenshot_url
            ? { url: publicHit.screenshot_url, width: 1280, height: 800 }
            : null,
          content: null,
          watermark: makeWatermark(hostname),
          quota: preQuota,
          cached: true,
          cachedFromPublic: true,
          parentInspirationId: publicHit.id,
          cacheHits,
        } satisfies RebuildSuccess)
      }
      console.warn("[v0] /api/rebuild public-cache clone failed; falling back:", cloneErr)
    }
  }

  // ── 7. Capture + scrape in parallel ──────────────────────────────────────
  const [captureResult, scrapeResult] = await Promise.allSettled([
    captureScreenshot({ url: normalized }),
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

  // ── 8. Fetch screenshot bytes ONCE, then run the extraction pipeline. ────
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

  let signature: Signature
  try {
    const result = await extractSignature({
      imageBytes: screenshotBytes,
      source: { type: "url", ref: normalized, hash: sourceHash, hostname },
      scraped: scrape?.ok
        ? {
            title: scrape.content.title,
            description: scrape.content.description,
            h1: scrape.content.h1,
            navLabels: scrape.content.navLabels,
            sectionHeadlines: scrape.content.sectionHeadlines,
            heroAlt: scrape.content.heroAlt,
            primaryCta: scrape.content.primaryCta,
            bodyTextSample: scrape.content.bodyTextSample,
          }
        : null,
    })
    signature = result.signature
    if (!result.paletteMatched) {
      console.warn("[v0] /api/rebuild palette drift; fell back to deterministic roles", {
        owner: user.id,
        url: normalized,
      })
    }
  } catch (e) {
    console.error("[v0] /api/rebuild extractSignature failed:", e)
    return err(
      "signature_failed",
      "Captured the site but could not analyze it. Try again in a moment.",
      502,
      String(e),
    )
  }

  // ── 9. Persist ───────────────────────────────────────────────────────────
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

  // ── 10. Consume quota (success-only billing) ────────────────────────────
  const postQuota = await consumeRebuildQuota(user.id)

  return Response.json({
    inspirationId: insert.data.id,
    signature,
    screenshot: { url: capture.pngUrl, width: 1280, height: 800 },
    content: scrape?.ok ? scrape.content : null,
    watermark: makeWatermark(hostname),
    quota: postQuota,
    cached: false,
  } satisfies RebuildSuccess)
}

function makeWatermark(hostname: string) {
  return {
    label: "UXC reinterpretation",
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
  /** Set when the cached payload originated from a public capture by
   *  another user (Phase 5 cross-user cache hit). */
  cachedFromPublic?: boolean
  /** The public inspiration row this response was cloned from. */
  parentInspirationId?: string
  /** Updated cache_hit_count on the public parent after this hit. */
  cacheHits?: number
}
