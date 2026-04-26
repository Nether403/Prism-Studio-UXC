/**
 * HTML content extraction for the rebuild pipeline.
 *
 * The whole point of scraping content (in addition to the screenshot) is so
 * the redesigned PreviewPane can render with the SAME nav labels, the SAME
 * section headlines, and the SAME hero alt text — making the side-by-side
 * read as "this site, redone" instead of "less than the original."
 *
 * Defenses:
 *  - 5s fetch timeout via AbortController.
 *  - 2MB body cap (we slice the buffer hard; if a site is bigger than that,
 *    the slice is still a usable hero+nav region).
 *  - Pinned `redirect: "manual"` — the URL was DNS-validated upstream;
 *    silently following a redirect into a private range would defeat the
 *    SSRF check. Caller should re-validate the redirect target if any.
 *  - User-agent identifies us so site owners can opt out via robots.
 */

import { load, type CheerioAPI } from "cheerio"

const FETCH_TIMEOUT_MS = 5000
const MAX_BODY_BYTES = 2 * 1024 * 1024 // 2MB

export type ScrapedContent = {
  title: string | null
  description: string | null
  h1: string | null
  navLabels: string[]
  sectionHeadlines: string[]
  heroAlt: string | null
  primaryCta: string | null
  bodyTextSample: string | null
  ogImage: string | null
}

export type ScrapeResult =
  | { ok: true; content: ScrapedContent; finalUrl: string; redirected: boolean }
  | { ok: false; reason: string; code: "fetch_failed" | "redirect_blocked" | "non_html" | "timeout" }

export async function scrapeContent(url: URL): Promise<ScrapeResult> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      signal: ctrl.signal,
      redirect: "manual",
      headers: {
        "user-agent": "UXC-Bot/1.0 (+https://uxc.me; site-rebuild)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        "accept-language": "en-US,en;q=0.9",
      },
    })
  } catch (e) {
    clearTimeout(timer)
    if ((e as Error).name === "AbortError") {
      return { ok: false, reason: "Page fetch timed out.", code: "timeout" }
    }
    return { ok: false, reason: "Page fetch failed.", code: "fetch_failed" }
  }

  // Block silent redirects. If a site 301s, we don't follow because the
  // target may be in a private IP range that wasn't validated.
  if (res.status >= 300 && res.status < 400) {
    clearTimeout(timer)
    return {
      ok: false,
      reason: "Page redirected. Try the final URL directly.",
      code: "redirect_blocked",
    }
  }

  if (!res.ok) {
    clearTimeout(timer)
    return { ok: false, reason: `Page returned ${res.status}.`, code: "fetch_failed" }
  }

  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("html")) {
    clearTimeout(timer)
    return { ok: false, reason: "Page is not HTML.", code: "non_html" }
  }

  // Read with a hard byte cap. Sites that ship 50MB of inline JSON state
  // (modern SPAs, hi looking at you) get truncated — fine, the head+hero
  // region is what we actually parse.
  let bytes: ArrayBuffer
  try {
    if (!res.body) {
      bytes = await res.arrayBuffer()
    } else {
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let total = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          total += value.byteLength
          if (total >= MAX_BODY_BYTES) {
            try {
              await reader.cancel()
            } catch {
              /* fine */
            }
            break
          }
        }
      }
      const merged = new Uint8Array(Math.min(total, MAX_BODY_BYTES))
      let offset = 0
      for (const chunk of chunks) {
        const remaining = merged.length - offset
        if (remaining <= 0) break
        const slice = chunk.subarray(0, remaining)
        merged.set(slice, offset)
        offset += slice.byteLength
      }
      bytes = merged.buffer.slice(0, offset)
    }
  } catch {
    clearTimeout(timer)
    return { ok: false, reason: "Failed to read page body.", code: "fetch_failed" }
  }
  clearTimeout(timer)

  const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  const $ = load(html)
  const content = extractContent($, url)

  return {
    ok: true,
    content,
    finalUrl: url.toString(),
    redirected: false,
  }
}

// ----------------------------------------------------------------------------
// Extractors
// ----------------------------------------------------------------------------

function clean(s: string | null | undefined): string | null {
  if (!s) return null
  const trimmed = s.replace(/\s+/g, " ").trim()
  return trimmed.length === 0 ? null : trimmed
}

function extractContent($: CheerioAPI, url: URL): ScrapedContent {
  const title =
    clean($('meta[property="og:title"]').attr("content")) ||
    clean($('meta[name="twitter:title"]').attr("content")) ||
    clean($("title").first().text()) ||
    null

  const description =
    clean($('meta[property="og:description"]').attr("content")) ||
    clean($('meta[name="description"]').attr("content")) ||
    clean($('meta[name="twitter:description"]').attr("content")) ||
    null

  const h1 = clean($("h1").first().text()) || null

  // Nav labels — collect anchor text inside <nav> or <header>, dedupe, drop
  // anything obviously not a label (very long strings, raw URLs, empty).
  const navTexts = new Set<string>()
  $("nav a, header nav a, header a").each((_, el) => {
    const t = clean($(el).text())
    if (!t) return
    if (t.length > 32) return // probably a CTA paragraph, not a nav label
    if (t.startsWith("http")) return
    navTexts.add(t)
  })
  const navLabels = Array.from(navTexts).slice(0, 8)

  // Section headlines — the first 3 h2/h3 outside nav/footer.
  const sectionHeadlines: string[] = []
  $("h2, h3")
    .not("nav h2, nav h3, footer h2, footer h3")
    .each((_, el) => {
      if (sectionHeadlines.length >= 3) return false
      const t = clean($(el).text())
      if (t && t.length <= 200) sectionHeadlines.push(t)
      return undefined
    })

  // Hero alt — first non-icon img, with a width hint when available.
  let heroAlt: string | null = null
  $("img").each((_, el) => {
    if (heroAlt) return false
    const $el = $(el)
    const alt = clean($el.attr("alt"))
    if (!alt) return undefined
    const w = parseInt($el.attr("width") || "0", 10)
    const looksIconish = alt.length < 4 || /icon|logo|sprite/i.test(alt)
    if (w >= 200 || (!Number.isNaN(w) && w === 0 && !looksIconish)) {
      heroAlt = alt
    }
    return undefined
  })

  // Primary CTA — first button/anchor whose text matches an action verb set.
  const ctaPatterns = /\b(get started|sign up|try (it|now|free)|start (free|now|building)|book a demo|request access|join (the )?(beta|waitlist)|buy|subscribe|download|get the app|launch|create account)\b/i
  let primaryCta: string | null = null
  $("a, button").each((_, el) => {
    if (primaryCta) return false
    const t = clean($(el).text())
    if (t && ctaPatterns.test(t) && t.length <= 60) {
      primaryCta = t
    }
    return undefined
  })

  // Body text sample — first ~600 chars of visible <p> outside nav/footer/aside.
  let textBuf = ""
  $("main p, article p, section p, body > p")
    .not("nav p, footer p, aside p, [aria-hidden] p")
    .each((_, el) => {
      const t = clean($(el).text())
      if (!t) return undefined
      textBuf += (textBuf ? " " : "") + t
      if (textBuf.length >= 600) return false
      return undefined
    })
  const bodyTextSample = textBuf.length > 0 ? textBuf.slice(0, 600) : null

  // Resolve og:image to absolute (for the screenshot fallback path).
  const ogRaw = clean($('meta[property="og:image"]').attr("content"))
  let ogImage: string | null = null
  if (ogRaw) {
    try {
      ogImage = new URL(ogRaw, url).toString()
    } catch {
      ogImage = null
    }
  }

  return {
    title,
    description,
    h1,
    navLabels,
    sectionHeadlines,
    heroAlt,
    primaryCta,
    bodyTextSample,
    ogImage,
  }
}
