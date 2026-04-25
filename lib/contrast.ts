/**
 * WCAG contrast utilities for OKLCH theme tokens.
 *
 * Convert OKLCH → linear sRGB → relative luminance → contrast ratio.
 * Constants from Björn Ottosson's OKLab matrices (https://bottosson.github.io).
 */

export type Rgb = { r: number; g: number; b: number }

/** Parse "oklch(L C H)" or "oklch(L C H / a)" — alpha ignored. */
export function parseOklch(input: string): { l: number; c: number; h: number } | null {
  const m = input
    .trim()
    .match(/^oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+)(?:deg)?\s*(?:\/\s*[0-9.]+%?)?\s*\)$/i)
  if (!m) return null
  const l = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1])
  const c = m[2].endsWith("%") ? (parseFloat(m[2]) / 100) * 0.4 : parseFloat(m[2])
  const h = parseFloat(m[3])
  if (Number.isNaN(l) || Number.isNaN(c) || Number.isNaN(h)) return null
  return { l, c, h }
}

/** OKLCH → linear sRGB (clamped to [0, 1]). */
export function oklchToLinearRgb(oklch: { l: number; c: number; h: number }): Rgb {
  const hRad = (oklch.h * Math.PI) / 180
  const a = oklch.c * Math.cos(hRad)
  const b = oklch.c * Math.sin(hRad)

  // OKLab → LMS (cube)
  const l_ = oklch.l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = oklch.l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = oklch.l - 0.0894841775 * a - 1.291485548 * b
  const lc = l_ * l_ * l_
  const mc = m_ * m_ * m_
  const sc = s_ * s_ * s_

  // LMS → linear sRGB
  const r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc
  const bl = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc

  return {
    r: clamp01(r),
    g: clamp01(g),
    b: clamp01(bl),
  }
}

/** Relative luminance (Y) for already-linear sRGB. */
export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
}

/** WCAG 2.1 contrast ratio between two OKLCH strings. Returns NaN if invalid. */
export function contrastRatio(fg: string, bg: string): number {
  const a = parseOklch(fg)
  const b = parseOklch(bg)
  if (!a || !b) return Number.NaN
  const ya = relativeLuminance(oklchToLinearRgb(a))
  const yb = relativeLuminance(oklchToLinearRgb(b))
  const [hi, lo] = ya >= yb ? [ya, yb] : [yb, ya]
  return (hi + 0.05) / (lo + 0.05)
}

export type ContrastGrade = "AAA" | "AA" | "AA-large" | "fail"

/** WCAG grade for body-text foreground/background. */
export function gradeContrast(ratio: number): ContrastGrade {
  if (!isFinite(ratio)) return "fail"
  if (ratio >= 7) return "AAA"
  if (ratio >= 4.5) return "AA"
  if (ratio >= 3) return "AA-large"
  return "fail"
}

export type ContrastCheck = {
  ratio: number
  grade: ContrastGrade
  /** Display string e.g. "12.4:1". */
  ratioLabel: string
}

export function checkContrast(fg: string, bg: string): ContrastCheck {
  const ratio = contrastRatio(fg, bg)
  return {
    ratio,
    grade: gradeContrast(ratio),
    ratioLabel: isFinite(ratio) ? `${ratio.toFixed(1)}:1` : "—",
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}
