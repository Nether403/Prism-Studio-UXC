// ---------------------------------------------------------------------------
// OG-image extraction with domain allowlist + SSRF guards
// ---------------------------------------------------------------------------
//
// Used by /api/from-image when the user pastes a Mobbin / Dribbble / Behance
// URL instead of uploading. We do NOT scrape authenticated feeds — only the
// public OG-image meta tag, which the source site explicitly publishes for
// link previews. Per-domain allowlist keeps the route from being abused as a
// generic image-fetch proxy.
// ---------------------------------------------------------------------------

const ALLOWED_DOMAINS = new Set<string>([
  "mobbin.com",
  "www.mobbin.com",
  "dribbble.com",
  "www.dribbble.com",
  "behance.net",
  "www.behance.net",
  "pinterest.com",
  "www.pinterest.com",
  "uxarchive.com",
  "www.uxarchive.com",
  "screenlane.com",
  "www.screenlane.com",
  "godly.website",
  "www.godly.website",
])

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe[89ab][0-9a-f]:/i,
]

const HTML_FETCH_TIMEOUT_MS = 8_000
const IMAGE_FETCH_TIMEOUT_MS = 12_000
const HTML_MAX_BYTES = 256 * 1024 // 256KB cap on HTML body — OG meta is in <head>
const IMAGE_MAX_BYTES = 12 * 1024 * 1024 // 12MB cap on the OG image itself

const USER_AGENT = "UXC-Bot/1.0 (+https://uxc.me; signature-extraction)"

export type OgFetchResult =
  | {
      ok: true
      bytes: ArrayBuffer
      sourceUrl: string
      imageUrl: string
      hostname: string
    }
  | { ok: false; error: string }

/**
 * Domain allowlist check. Exposed so UI code can validate before posting.
 */
export function isOgAllowedDomain(host: string): boolean {
  return ALLOWED_DOMAINS.has(host.toLowerCase())
}

export function listAllowedOgDomains(): string[] {
  return Array.from(ALLOWED_DOMAINS).filter((d) => !d.startsWith("www."))
}

function isPrivateHost(host: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(host))
}

function pickOgImageUrl(html: string): string | null {
  // Try og:image first, then twitter:image. Tolerant of attribute order.
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]*\scontent=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*\sproperty=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]*\scontent=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*\sname=["']twitter:image["']/i,
  ]
  for (const re of patterns) {
    const m = re.exec(html)
    if (m && m[1]) return m[1].trim()
  }
  return null
}

/**
 * Fetch and validate an OG image from a Mobbin/Dribbble/Behance/etc URL.
 *
 * Hard guarantees:
 *   - Only http(s) schemes
 *   - Only allowlisted domains for the source page
 *   - OG image URL itself must not resolve to an obvious private/loopback host
 *   - Timeouts on both fetches
 *   - Hard byte caps on both responses
 *
 * Returns the decoded image bytes plus the resolved imageUrl for provenance.
 */
export async function fetchOgImage(input: string): Promise<OgFetchResult> {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Only http(s) URLs are supported." }
  }
  if (!isOgAllowedDomain(url.hostname)) {
    return {
      ok: false,
      error:
        "That domain isn't supported. Try Mobbin, Dribbble, Behance, Pinterest, UXArchive, Screenlane, or Godly.",
    }
  }

  // 1) Fetch HTML head, slice to cap, parse OG image url
  const htmlController = new AbortController()
  const htmlTimer = setTimeout(() => htmlController.abort(), HTML_FETCH_TIMEOUT_MS)
  let html: string
  try {
    const res = await fetch(url.toString(), {
      signal: htmlController.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      redirect: "manual",
    })
    if (res.status >= 300 && res.status < 400) {
      return { ok: false, error: "Source page redirected. Try the final URL directly." }
    }
    if (!res.ok) {
      return { ok: false, error: `Source returned HTTP ${res.status}.` }
    }
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.toLowerCase().includes("text/html")) {
      return { ok: false, error: "Source page isn't HTML." }
    }
    // Hard cap reading: pull at most HTML_MAX_BYTES
    const reader = res.body?.getReader()
    if (!reader) {
      const text = await res.text()
      html = text.slice(0, HTML_MAX_BYTES)
    } else {
      const chunks: Uint8Array[] = []
      let total = 0
      while (total < HTML_MAX_BYTES) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        total += value.byteLength
      }
      try {
        await reader.cancel()
      } catch {
        // ignore
      }
      const merged = new Uint8Array(Math.min(total, HTML_MAX_BYTES))
      let offset = 0
      for (const c of chunks) {
        if (offset >= merged.byteLength) break
        const slice = c.subarray(0, Math.min(c.byteLength, merged.byteLength - offset))
        merged.set(slice, offset)
        offset += slice.byteLength
      }
      html = new TextDecoder("utf-8", { fatal: false }).decode(merged)
    }
  } catch (e) {
    console.error("[v0] og: html fetch failed", e)
    return { ok: false, error: "Couldn't fetch that page (timeout or network error)." }
  } finally {
    clearTimeout(htmlTimer)
  }

  const ogRaw = pickOgImageUrl(html)
  if (!ogRaw) {
    return {
      ok: false,
      error: "No OG image found on that page. Try a different post or upload the image directly.",
    }
  }

  let imageUrl: URL
  try {
    imageUrl = new URL(ogRaw, url.toString())
  } catch {
    return { ok: false, error: "OG image URL on that page was malformed." }
  }
  if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
    return { ok: false, error: "OG image must be served over http(s)." }
  }
  if (isPrivateHost(imageUrl.hostname)) {
    return { ok: false, error: "OG image points to a private network." }
  }

  // 2) Fetch the image bytes
  const imgController = new AbortController()
  const imgTimer = setTimeout(() => imgController.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(imageUrl.toString(), {
      signal: imgController.signal,
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
    })
    if (res.status >= 300 && res.status < 400) {
      return { ok: false, error: "OG image redirected. Upload the image directly instead." }
    }
    if (!res.ok) {
      return { ok: false, error: `OG image returned HTTP ${res.status}.` }
    }
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.toLowerCase().startsWith("image/")) {
      return { ok: false, error: "OG URL didn't return an image." }
    }
    const lenHeader = Number(res.headers.get("content-length") ?? 0)
    if (lenHeader > IMAGE_MAX_BYTES) {
      return { ok: false, error: "OG image is too large." }
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength === 0) {
      return { ok: false, error: "OG image is empty." }
    }
    if (buf.byteLength > IMAGE_MAX_BYTES) {
      return { ok: false, error: "OG image is too large." }
    }
    return {
      ok: true,
      bytes: buf,
      sourceUrl: input,
      imageUrl: imageUrl.toString(),
      hostname: url.hostname,
    }
  } catch (e) {
    console.error("[v0] og: image fetch failed", e)
    return { ok: false, error: "Couldn't fetch the OG image (timeout or network error)." }
  } finally {
    clearTimeout(imgTimer)
  }
}
