import type { PaletteRole, PaletteSwatch } from "./signature"

// ---------------------------------------------------------------------------
// Deterministic palette extraction
// ---------------------------------------------------------------------------
//
// The contract: extract five hex values from an image deterministically, then
// hand them to Gemini as input context. Gemini's job is to assign roles and
// names, not to eyeball hex values from a thumbnail.
//
// This module is split into two layers:
//   1. `kmeansPalette()` — pure function over an RGB pixel buffer. No I/O.
//   2. `extractPalette()` — async wrapper that decodes an image and calls (1).
//
// Image decoding is intentionally pluggable. Today the wrapper throws unless
// you pass a pre-decoded buffer; when we add `sharp` (or `node-vibrant`) the
// `decodeImage()` function becomes real and `extractPalette()` works on URLs
// and ArrayBuffers without any caller changes.
// ---------------------------------------------------------------------------

export type Rgb = { r: number; g: number; b: number }
export type RawPalette = { hex: string; population: number; rgb: Rgb }[]

const DEFAULT_K = 5
const DEFAULT_ITERATIONS = 12

// ---------------------------------------------------------------------------
// k-means
// ---------------------------------------------------------------------------

function distanceSq(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

function meanColor(pixels: Rgb[]): Rgb {
  if (pixels.length === 0) return { r: 0, g: 0, b: 0 }
  let r = 0
  let g = 0
  let b = 0
  for (const p of pixels) {
    r += p.r
    g += p.g
    b += p.b
  }
  const n = pixels.length
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}

/**
 * Deterministic farthest-first seeding. Reproducible across runs (no Math.random).
 * Picks the first centroid as the brightest pixel, then each subsequent centroid
 * as the pixel farthest from any existing centroid.
 */
function seedCentroids(pixels: Rgb[], k: number): Rgb[] {
  if (pixels.length === 0) return []
  let brightestIdx = 0
  let brightestL = -1
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i]
    const l = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b
    if (l > brightestL) {
      brightestL = l
      brightestIdx = i
    }
  }
  const centroids: Rgb[] = [pixels[brightestIdx]]
  while (centroids.length < k && centroids.length < pixels.length) {
    let maxDist = -1
    let pickIdx = 0
    for (let i = 0; i < pixels.length; i++) {
      let minD = Infinity
      for (const c of centroids) {
        const d = distanceSq(pixels[i], c)
        if (d < minD) minD = d
      }
      if (minD > maxDist) {
        maxDist = minD
        pickIdx = i
      }
    }
    centroids.push(pixels[pickIdx])
  }
  return centroids
}

/**
 * Pure-JS k-means clustering on an RGB pixel buffer.
 * Returns clusters sorted by population (descending), with the median hex per cluster.
 *
 * Not exported as the public API — most callers want `extractPalette()`.
 */
export function kmeansPalette(
  pixels: Rgb[],
  k = DEFAULT_K,
  iterations = DEFAULT_ITERATIONS
): RawPalette {
  if (pixels.length === 0) return []
  const effectiveK = Math.min(k, pixels.length)
  let centroids = seedCentroids(pixels, effectiveK)
  const assignments = new Int32Array(pixels.length)

  for (let iter = 0; iter < iterations; iter++) {
    let moved = 0
    // Assign
    for (let i = 0; i < pixels.length; i++) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const d = distanceSq(pixels[i], centroids[c])
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best
        moved++
      }
    }
    // Update
    const buckets: Rgb[][] = Array.from({ length: centroids.length }, () => [])
    for (let i = 0; i < pixels.length; i++) buckets[assignments[i]].push(pixels[i])
    centroids = buckets.map((b, idx) => (b.length === 0 ? centroids[idx] : meanColor(b)))
    if (moved === 0) break
  }

  // Final population count
  const counts = new Array<number>(centroids.length).fill(0)
  for (let i = 0; i < pixels.length; i++) counts[assignments[i]]++

  const palette: RawPalette = centroids.map((c, i) => ({
    rgb: c,
    hex: rgbToHex(c),
    population: counts[i],
  }))
  palette.sort((a, b) => b.population - a.population)
  return palette
}

// ---------------------------------------------------------------------------
// Role assignment
// ---------------------------------------------------------------------------

function relativeLuminance({ r, g, b }: Rgb): number {
  const f = (v: number) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function saturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

/**
 * Assign canonical PaletteRoles to the raw clusters.
 * Heuristic:
 *   - lightest cluster -> bg
 *   - darkest cluster -> fg
 *   - most-saturated remaining -> accent
 *   - lowest-saturation remaining -> muted
 *   - leftover -> highlight
 *
 * Always returns exactly 5 swatches. If fewer than 5 clusters were found,
 * roles are filled by duplicating the closest match — never returns null.
 */
export function assignRoles(raw: RawPalette): PaletteSwatch[] {
  if (raw.length === 0) {
    const fallback: PaletteSwatch = { hex: "#000000", role: "bg", name: "void" }
    return [
      fallback,
      { ...fallback, role: "fg", name: "void" },
      { ...fallback, role: "accent", name: "void" },
      { ...fallback, role: "muted", name: "void" },
      { ...fallback, role: "highlight", name: "void" },
    ]
  }

  const pool = [...raw]
  const out: Partial<Record<PaletteRole, PaletteSwatch>> = {}

  // bg = lightest
  pool.sort((a, b) => relativeLuminance(b.rgb) - relativeLuminance(a.rgb))
  const bg = pool.shift()!
  out.bg = { hex: bg.hex, role: "bg", name: paletteHexName(bg.hex) }

  // fg = darkest of what's left
  pool.sort((a, b) => relativeLuminance(a.rgb) - relativeLuminance(b.rgb))
  const fg = pool.shift() ?? bg
  out.fg = { hex: fg.hex, role: "fg", name: paletteHexName(fg.hex) }

  // accent = most-saturated of what's left
  pool.sort((a, b) => saturation(b.rgb) - saturation(a.rgb))
  const accent = pool.shift() ?? fg
  out.accent = { hex: accent.hex, role: "accent", name: paletteHexName(accent.hex) }

  // muted = lowest-saturation of what's left
  pool.sort((a, b) => saturation(a.rgb) - saturation(b.rgb))
  const muted = pool.shift() ?? accent
  out.muted = { hex: muted.hex, role: "muted", name: paletteHexName(muted.hex) }

  // highlight = whatever is left, or the next-most-populous fallback
  const highlight = pool.shift() ?? raw[Math.min(raw.length - 1, 2)]
  out.highlight = {
    hex: highlight.hex,
    role: "highlight",
    name: paletteHexName(highlight.hex),
  }

  return [out.bg!, out.fg!, out.accent!, out.muted!, out.highlight!]
}

// ---------------------------------------------------------------------------
// Image decoding (pluggable)
// ---------------------------------------------------------------------------

/**
 * Decode an image (URL, data URL, or ArrayBuffer) into an RGB pixel buffer,
 * downsampled to roughly 96x96 for k-means speed. ~9000 samples is plenty for
 * a 5-cluster extraction and keeps the sharp pass under ~50ms on cold start.
 *
 * The decode is intentionally narrow: alpha is dropped (premultiplied against
 * white so transparent corners read as background, not pollution), images are
 * fitted "inside" so aspect ratio is preserved, and the input upper bound is
 * clamped server-side by the route — this function trusts its inputs.
 */
async function decodeImage(input: string | ArrayBuffer): Promise<Rgb[]> {
  // Dynamic import: sharp is server-only and we don't want it pulled into any
  // accidental client bundle that imports `extractPaletteFromPixels` directly.
  const sharp = (await import("sharp")).default

  let buffer: Buffer
  if (typeof input === "string") {
    if (input.startsWith("data:")) {
      const comma = input.indexOf(",")
      buffer = Buffer.from(input.slice(comma + 1), "base64")
    } else {
      const res = await fetch(input)
      if (!res.ok) {
        throw new Error(`[palette] decodeImage fetch failed: ${res.status}`)
      }
      buffer = Buffer.from(await res.arrayBuffer())
    }
  } else {
    buffer = Buffer.from(input)
  }

  const { data, info } = await sharp(buffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize({ width: 96, height: 96, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const stride = info.channels
  const pixels: Rgb[] = []
  for (let i = 0; i + 2 < data.length; i += stride) {
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
  }
  return pixels
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Highest-level entry point. Decode an image and return five role-assigned swatches.
 * Throws today (see decodeImage); kept as the public surface so Phase 1 callers
 * import the right name.
 */
export async function extractPalette(input: string | ArrayBuffer): Promise<PaletteSwatch[]> {
  const pixels = await decodeImage(input)
  return extractPaletteFromPixels(pixels)
}

/**
 * Synchronous entry point for callers that already have decoded pixels —
 * useful from a server action that uses sharp or canvas inline, or from tests.
 */
export function extractPaletteFromPixels(pixels: Rgb[]): PaletteSwatch[] {
  const raw = kmeansPalette(pixels, DEFAULT_K, DEFAULT_ITERATIONS)
  return assignRoles(raw)
}

// ---------------------------------------------------------------------------
// Hex helpers
// ---------------------------------------------------------------------------

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => clamp255(n).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return { r: 0, g: 0, b: 0 }
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

/**
 * Tiny offline namer for raw hex values — Gemini will overwrite these with
 * better names, but we ship a sane default so the UI never renders 'undefined'
 * if the LLM call fails or is skipped.
 */
function paletteHexName(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const l = relativeLuminance({ r, g, b })
  const s = saturation({ r, g, b })
  if (l > 0.85) return s < 0.05 ? "paper" : "blush"
  if (l < 0.08) return "ink"
  if (s < 0.08) return l > 0.5 ? "fog" : "graphite"
  if (r > g && r > b) return "ember"
  if (g > r && g > b) return "moss"
  if (b > r && b > g) return "cobalt"
  return "amber"
}
