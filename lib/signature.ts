import { z } from "zod"
import type { Audience, GeneratorInput, Performance, Vibe } from "./recommend"

// ---------------------------------------------------------------------------
// Canonical Signature schema
// ---------------------------------------------------------------------------
//
// One shape, every ingestion path. URL rebuild, image upload, OG-image scrape,
// and clipboard paste all converge on this. `recommend()` only ever sees a
// Signature — it does not learn about each input mode.
//
// The Vibe / Audience / Performance enums mirror the literal unions in
// `lib/recommend.ts` exactly so `signatureToGeneratorInput()` is a no-op cast,
// not a translation layer that can drift.
// ---------------------------------------------------------------------------

export const VIBES = ["minimal", "bold", "editorial", "playful", "experimental"] as const
export const AUDIENCES = ["consumer", "enterprise", "developer", "creative"] as const
export const PERFORMANCES = ["max", "balanced", "rich"] as const

export const SOURCE_TYPES = ["url", "image", "og", "paste"] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export const LAYOUT_PATTERNS = [
  "split-hero",
  "brutalist-grid",
  "editorial",
  "dashboard",
  "marketing",
  "portfolio",
  "ecommerce",
  "other",
] as const
export type LayoutPattern = (typeof LAYOUT_PATTERNS)[number]

export const PALETTE_ROLES = ["bg", "fg", "accent", "muted", "highlight"] as const
export type PaletteRole = (typeof PALETTE_ROLES)[number]

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export const paletteSwatchSchema = z.object({
  hex: z
    .string()
    .regex(HEX_RE, "Hex must be #RRGGBB or #RRGGBBAA")
    .describe("Hex color string, e.g. '#1a1a1a'."),
  role: z
    .enum(PALETTE_ROLES)
    .describe(
      "Semantic role: 'bg' (background), 'fg' (foreground/text), 'accent' (brand/CTA), 'muted' (secondary surface), 'highlight' (loud detail)."
    ),
  name: z
    .string()
    .min(1)
    .max(40)
    .describe("Short evocative name for the swatch, e.g. 'graphite' or 'phosphor'."),
})
export type PaletteSwatch = z.infer<typeof paletteSwatchSchema>

export const fontPairSchema = z.object({
  display: z
    .string()
    .min(1)
    .describe(
      "Display/heading face. Prefer one of the known faces in lib/generate-schema.ts when possible."
    ),
  body: z.string().min(1).describe("Body face. Prefer the known faces in lib/generate-schema.ts."),
  category: z
    .enum(["sans", "serif", "mono", "display"])
    .describe("High-level category of the display face."),
})
export type FontPair = z.infer<typeof fontPairSchema>

export const sourceMetaSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  ref: z
    .string()
    .min(1)
    .describe(
      "URL for source_type='url' or 'og', blob storage path for 'image', SHA hash for 'paste'."
    ),
  hash: z
    .string()
    .optional()
    .describe("SHA-256 of the captured/uploaded image bytes. Used as the cache key."),
})
export type SourceMeta = z.infer<typeof sourceMetaSchema>

export const signatureSchema = z.object({
  source: sourceMetaSchema.describe("Where this signature came from."),

  vibe: z
    .enum(VIBES)
    .describe(
      "Best-fit vibe from the canonical set. This maps directly onto GeneratorInput.vibe."
    ),
  audience: z
    .enum(AUDIENCES)
    .describe("Best-fit audience. Maps directly onto GeneratorInput.audience."),

  contentSignature: z
    .string()
    .min(1)
    .max(280)
    .describe("One sentence describing what this site or image IS — the literal content."),
  vibeStatement: z
    .string()
    .min(1)
    .max(160)
    .describe("One short phrase capturing the aesthetic, e.g. 'editorial brutalism in monochrome'."),
  audienceStatement: z
    .string()
    .min(1)
    .max(160)
    .describe("One sentence on who this is for, in plain product language."),

  palette: z
    .array(paletteSwatchSchema)
    .length(5)
    .describe(
      "Exactly five swatches, one per role. Hex values should come from a deterministic extraction step — Gemini's job is to assign roles and names, not to invent the hex values."
    ),
  fonts: fontPairSchema,

  layoutPattern: z.enum(LAYOUT_PATTERNS),
  motionLevel: z
    .number()
    .int()
    .min(0)
    .max(3)
    .describe("0 = static, 1 = subtle, 2 = expressive, 3 = experimental/maximalist."),
  motionCues: z
    .array(z.string().min(1).max(60))
    .max(6)
    .describe("Short tags describing motion you observe, e.g. 'parallax', 'pinned-scroll', 'ticker'."),

  libraryHints: z
    .array(z.string().min(1).max(40))
    .max(8)
    .describe(
      "Library ids from lib/stack-data.ts that the signature suggests. Hints, not commitments — recommend() makes the final call."
    ),
  contentHooks: z
    .object({
      headline: z.string().max(120).optional(),
      subhead: z.string().max(200).optional(),
      cta: z.string().max(40).optional(),
      navLabels: z.array(z.string().max(40)).max(8).optional(),
      sectionHeadlines: z.array(z.string().max(120)).max(6).optional(),
      heroAlt: z.string().max(200).optional(),
    })
    .describe(
      "Real content extracted from the source so the PreviewPane reads as 'same site, redone' rather than a sparse imitation. Optional everywhere — pure-image signatures may have none."
    ),

  performanceHint: z
    .enum(PERFORMANCES)
    .describe("Suggested performance budget for recommend(). UI may override."),

  brief: z
    .string()
    .min(20)
    .max(800)
    .describe(
      "Self-contained prompt handed to recommend() and to the 'Open in v0' deep link. Should read like a designer briefing another designer."
    ),
})
export type Signature = z.infer<typeof signatureSchema>

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

export type SignatureOverrides = Partial<{
  vibe: Vibe
  audience: Audience
  performance: Performance
  includePaid: boolean
  prompt: string
}>

/**
 * Convert a Signature into a GeneratorInput for `recommend()`.
 * Every field has a sensible default; UI overrides take precedence.
 */
export function signatureToGeneratorInput(
  signature: Signature,
  overrides: SignatureOverrides = {}
): GeneratorInput {
  return {
    prompt: overrides.prompt ?? signature.brief,
    vibe: overrides.vibe ?? signature.vibe,
    audience: overrides.audience ?? signature.audience,
    performance: overrides.performance ?? signature.performanceHint,
    includePaid: overrides.includePaid ?? true,
  }
}

/**
 * Build a stable v0 deep-link from a Signature's brief.
 * URL contract: https://v0.app/?prompt=<encoded brief>
 */
export function signatureToV0DeepLink(signature: Signature): string {
  const params = new URLSearchParams({ prompt: signature.brief })
  return `https://v0.app/?${params.toString()}`
}

/**
 * Resolve a swatch by role with a graceful fallback.
 * Useful when handing palette into the theme generator.
 */
export function paletteByRole(signature: Signature): Record<PaletteRole, PaletteSwatch> {
  const map = {} as Record<PaletteRole, PaletteSwatch>
  for (const swatch of signature.palette) {
    if (!map[swatch.role]) map[swatch.role] = swatch
  }
  // Fill any missing role with the closest available swatch so consumers can
  // always read every role without a null check.
  for (const role of PALETTE_ROLES) {
    if (!map[role]) map[role] = signature.palette[0]
  }
  return map
}
