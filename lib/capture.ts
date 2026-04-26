// ---------------------------------------------------------------------------
// Capture provider abstraction
// ---------------------------------------------------------------------------
//
// The contract: `captureScreenshot(opts)` returns a CaptureResult regardless
// of which provider is doing the work. Microlink is provider #1 today.
// Browserless and Browserbase are stubbed so the shape is fixed before any
// route imports it — when the free tier rate-limits in public, we swap a
// provider, not a route.
//
// Conventions:
//   - Caller passes a URL. SSRF validation happens in the API route, not here
//     (this module assumes the URL has already been vetted).
//   - The result image is fetched once so we can compute a SHA-256 hash for
//     caching downstream signatures by image bytes, not by URL.
//   - 768px-wide downscaling is intentionally NOT done here. It belongs in a
//     thumbnail step that runs before the multimodal call, and depends on the
//     same image-decoding library palette extraction will eventually use.
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto"

export type CaptureProvider = "microlink" | "browserless" | "browserbase" | "mock"

export type CaptureOptions = {
  url: string
  viewport?: { width: number; height: number }
  fullPage?: boolean
  // Soft deadline. Providers that don't support it will ignore it.
  timeoutMs?: number
}

export type CaptureResult = {
  pngUrl: string // absolute URL to the captured PNG (provider CDN today; blob later)
  hash: string // SHA-256 of the captured image bytes — the canonical cache key
  bytes: number
  capturedAt: string // ISO timestamp
  provider: CaptureProvider
  meta?: {
    title?: string
    description?: string
    ogImage?: string
  }
}

const DEFAULT_VIEWPORT = { width: 1440, height: 900 }
const DEFAULT_TIMEOUT_MS = 15_000

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Capture a screenshot using the first configured provider that succeeds.
 * Order: env-configured preferred provider -> microlink -> [future fallbacks].
 */
export async function captureScreenshot(opts: CaptureOptions): Promise<CaptureResult> {
  const order = providerOrder()
  let lastErr: unknown = null
  for (const provider of order) {
    try {
      switch (provider) {
        case "microlink":
          return await captureWithMicrolink(opts)
        case "browserless":
          return await captureWithBrowserless(opts)
        case "browserbase":
          return await captureWithBrowserbase(opts)
        case "mock":
          return await captureWithMock(opts)
      }
    } catch (err) {
      lastErr = err
      // Try the next provider rather than failing the whole capture.
      continue
    }
  }
  throw new Error(
    `[capture] all providers failed. Last error: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  )
}

function providerOrder(): CaptureProvider[] {
  const preferred = (process.env.CAPTURE_PROVIDER as CaptureProvider | undefined) ?? "microlink"
  const fallbacks: CaptureProvider[] = ["microlink", "browserless", "browserbase"]
  const seen = new Set<CaptureProvider>()
  const order: CaptureProvider[] = []
  for (const p of [preferred, ...fallbacks]) {
    if (!seen.has(p)) {
      order.push(p)
      seen.add(p)
    }
  }
  return order
}

// ---------------------------------------------------------------------------
// Microlink (provider #1)
// ---------------------------------------------------------------------------

async function captureWithMicrolink(opts: CaptureOptions): Promise<CaptureResult> {
  const viewport = opts.viewport ?? DEFAULT_VIEWPORT
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const params = new URLSearchParams({
    url: opts.url,
    screenshot: "true",
    meta: "true",
    embed: "screenshot.url",
    "viewport.width": String(viewport.width),
    "viewport.height": String(viewport.height),
    fullPage: opts.fullPage ? "true" : "false",
  })

  const apiKey = process.env.MICROLINK_API_KEY
  const headers: HeadersInit = apiKey ? { "x-api-key": apiKey } : {}

  // The `embed=screenshot.url` parameter makes Microlink redirect to the PNG.
  // We follow the redirect, then read the bytes for hashing.
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  let pngUrl: string
  let bytes: ArrayBuffer
  try {
    const res = await fetch(`https://api.microlink.io/?${params.toString()}`, {
      headers,
      signal: ac.signal,
      redirect: "follow",
    })
    if (!res.ok) {
      throw new Error(`microlink ${res.status} ${res.statusText}`)
    }
    pngUrl = res.url
    bytes = await res.arrayBuffer()
  } finally {
    clearTimeout(t)
  }

  // Microlink's metadata endpoint is a separate call — fetch in parallel for the
  // free tier. Failures are non-fatal; we still return the screenshot.
  const meta = await fetchMicrolinkMeta(opts.url, apiKey).catch(() => undefined)

  return {
    pngUrl,
    hash: sha256(bytes),
    bytes: bytes.byteLength,
    capturedAt: new Date().toISOString(),
    provider: "microlink",
    meta,
  }
}

async function fetchMicrolinkMeta(
  url: string,
  apiKey: string | undefined
): Promise<CaptureResult["meta"]> {
  const params = new URLSearchParams({ url, meta: "true" })
  const headers: HeadersInit = apiKey ? { "x-api-key": apiKey } : {}
  const res = await fetch(`https://api.microlink.io/?${params.toString()}`, { headers })
  if (!res.ok) return undefined
  const json = (await res.json()) as {
    data?: { title?: string; description?: string; image?: { url?: string } }
  }
  return {
    title: json.data?.title,
    description: json.data?.description,
    ogImage: json.data?.image?.url,
  }
}

// ---------------------------------------------------------------------------
// Browserless (stub — provider #2 for when Microlink rate-limits)
// ---------------------------------------------------------------------------

async function captureWithBrowserless(opts: CaptureOptions): Promise<CaptureResult> {
  const token = process.env.BROWSERLESS_TOKEN
  if (!token) throw new Error("[capture] BROWSERLESS_TOKEN not set")
  void opts
  // TODO: implement using https://docs.browserless.io/.
  // Will fetch a PNG from https://chrome.browserless.io/screenshot?token=...
  throw new Error("[capture] browserless provider not yet implemented")
}

// ---------------------------------------------------------------------------
// Browserbase (stub — provider #3, headed browser for SPA-heavy sites)
// ---------------------------------------------------------------------------

async function captureWithBrowserbase(opts: CaptureOptions): Promise<CaptureResult> {
  const apiKey = process.env.BROWSERBASE_API_KEY
  if (!apiKey) throw new Error("[capture] BROWSERBASE_API_KEY not set")
  void opts
  // TODO: implement using Browserbase's session API for sites that need
  // longer waits or auth pre-flight.
  throw new Error("[capture] browserbase provider not yet implemented")
}

// ---------------------------------------------------------------------------
// Mock (test/dev only)
// ---------------------------------------------------------------------------

async function captureWithMock(opts: CaptureOptions): Promise<CaptureResult> {
  // Returns a fixed transparent 1x1 PNG. Used by unit tests and storybook.
  const ONE_BY_ONE_PNG_B64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
  const bytes = Uint8Array.from(atob(ONE_BY_ONE_PNG_B64), (c) => c.charCodeAt(0))
  return {
    pngUrl: `data:image/png;base64,${ONE_BY_ONE_PNG_B64}`,
    hash: sha256(bytes.buffer),
    bytes: bytes.byteLength,
    capturedAt: new Date().toISOString(),
    provider: "mock",
    meta: { title: opts.url },
  }
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

function sha256(buf: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buf)).digest("hex")
}
