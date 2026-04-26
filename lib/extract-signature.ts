// ---------------------------------------------------------------------------
// lib/extract-signature.ts — the canonical signature pipeline.
// ---------------------------------------------------------------------------
//
// One pure function called by every ingestion path:
//   - /api/inspire (Phase 1: image / clipboard / OG-image)
//   - /api/rebuild (Phase 2: live URL rebuild)
//   - scripts/evals (Phase 4: prompt regression harness)
//
// Inputs already-decoded bytes + optional scraped content. Outputs a Signature
// plus quality metrics so callers can track palette drift over time.
//
// Side effects: ONE Gemini multimodal call. No DB, no auth, no quota, no I/O
// other than the model call itself. That is what makes the eval harness
// possible — it imports this directly and skips every route guard.
// ---------------------------------------------------------------------------

import { generateText, Output } from "ai"
import {
  signatureSchema,
  type Signature,
  type SourceType,
  type PaletteSwatch,
} from "@/lib/signature"
import {
  extractPaletteFromPixels,
  assignRoles,
  hexToRgb,
  type RawPalette,
} from "@/lib/palette"

// LLM step omits `source` (caller attaches) but keeps everything else,
// including `palette`, so Gemini has a slot to copy our deterministic hexes
// into with role + name semantics layered on top.
const generationSchema = signatureSchema.omit({ source: true })

/** Optional scraped content for URL ingestion. Goes into the prompt as text. */
export type ScrapedHints = {
  title?: string | null
  description?: string | null
  h1?: string | null
  navLabels?: string[]
  sectionHeadlines?: string[]
  heroAlt?: string | null
  primaryCta?: string | null
  bodyTextSample?: string | null
}

export type ExtractSignatureInput = {
  /** Raw image bytes — screenshot, upload, or fetched OG image. */
  imageBytes: ArrayBuffer
  /** Media type (image/png, image/jpeg, …) for the multimodal call. */
  mediaType?: string
  /** Source descriptor written into signature.source. */
  source: {
    type: SourceType
    ref: string
    hash: string
    /** Hostname (URL ingestion only). Surfaced in the prompt for context. */
    hostname?: string
  }
  /** Optional URL-only context that helps the model fill contentHooks. */
  scraped?: ScrapedHints | null
}

export type ExtractSignatureResult = {
  signature: Signature
  /** The five hexes we extracted before the model ran. Useful for debugging. */
  deterministicPalette: PaletteSwatch[]
  /** True if Gemini's palette was a clean match for the deterministic five. */
  paletteMatched: boolean
  /** True if Gemini emitted exactly five distinct roles. */
  rolesValid: boolean
}

// ---------------------------------------------------------------------------
// 1. Decode image bytes → 96×96 RGB pixels via sharp.
//    Dynamically imported to keep sharp out of any client bundle that
//    accidentally imports lib/* by way of the Signature type.
// ---------------------------------------------------------------------------
async function decodeForPalette(bytes: ArrayBuffer) {
  const sharp = (await import("sharp")).default
  const buf = Buffer.from(bytes)
  const meta = await sharp(buf).metadata()
  const inferredMediaType = meta.format ? `image/${meta.format}` : "image/png"

  const { data, info } = await sharp(buf)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize({ width: 96, height: 96, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const stride = info.channels
  const pixels: { r: number; g: number; b: number }[] = []
  for (let i = 0; i + 2 < data.length; i += stride) {
    pixels.push({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! })
  }
  return { pixels, inferredMediaType }
}

// ---------------------------------------------------------------------------
// 2. Build the system + user prompts. Centralized here so /api/inspire,
//    /api/rebuild, and the eval harness all see the same prompt — that's
//    what makes the eval baseline meaningful.
// ---------------------------------------------------------------------------
function buildSystemPrompt(): string {
  return `You are Prism, a senior design director extracting a structured Signature from a single piece of visual reference.

OUTPUT CONTRACT:
- Fill every field in the schema. The Signature is consumed by a recommender that needs sharp, decisive answers.
- The palette MUST contain exactly five swatches whose hex values are the five we extracted deterministically below — copy them verbatim. Your job is to assign one role and one short evocative name per swatch.
  - Roles: 'bg' (background), 'fg' (foreground/text), 'accent' (brand/CTA), 'muted' (secondary surface), 'highlight' (loud detail). Each role appears exactly once.
- 'vibe' must come from the canonical enum. 'audience' must come from the canonical enum. 'performanceHint' must come from the canonical enum (max | balanced | rich).
- contentSignature: one literal sentence — what does this site or image SHOW or DO?
- vibeStatement: one short evocative phrase about the aesthetic.
- audienceStatement: one sentence on who this is for, in plain product language.
- contentHooks: extract REAL content where you can see or read it (nav labels, headlines, hero alt, CTA). Skip fields you can't see. Do NOT paraphrase.
- libraryHints: 0–6 short tokens (e.g. 'three.js', 'gsap', 'framer-motion', 'lenis', 'tailwind'). Hints, not commitments.
- motionLevel: 0=static, 1=subtle, 2=expressive, 3=cinematic.
- brief: a self-contained 60–200 word designer-to-designer prompt that captures the inspiration so vividly another designer could rebuild a related site from it alone.
- Avoid purple/violet roles unless the source is genuinely purple-led.`
}

function buildUserPrompt(input: ExtractSignatureInput, paletteList: string): string {
  const { source, scraped } = input

  const sourceLine =
    source.type === "url"
      ? `Source URL: ${source.ref}${source.hostname ? `\nHostname: ${source.hostname}` : ""}`
      : `Source: ${source.type} (${source.ref})`

  const contentBlock = scraped
    ? [
        scraped.title && `Title: ${scraped.title}`,
        scraped.description && `Description: ${scraped.description}`,
        scraped.h1 && `H1: ${scraped.h1}`,
        scraped.navLabels?.length && `Navigation: ${scraped.navLabels.join(" | ")}`,
        scraped.sectionHeadlines?.length &&
          `Section headlines:\n  - ${scraped.sectionHeadlines.join("\n  - ")}`,
        scraped.heroAlt && `Hero alt: ${scraped.heroAlt}`,
        scraped.primaryCta && `Primary CTA: ${scraped.primaryCta}`,
        scraped.bodyTextSample && `Body excerpt: ${scraped.bodyTextSample}`,
      ]
        .filter(Boolean)
        .join("\n")
    : ""

  return [
    sourceLine,
    "",
    "DETERMINISTIC PALETTE (use these hex values verbatim, assign roles + names):",
    paletteList,
    contentBlock ? "\nEXTRACTED CONTENT (use the literal text where relevant):" : "",
    contentBlock,
    "",
    contentBlock
      ? "Analyze the attached image alongside the palette and content. Return the full Signature as structured output."
      : "Analyze the attached image alongside the palette. Return the full Signature as structured output.",
  ]
    .filter((s) => s !== null && s !== undefined)
    .join("\n")
}

// ---------------------------------------------------------------------------
// 3. Public entry point.
// ---------------------------------------------------------------------------
export async function extractSignature(
  input: ExtractSignatureInput,
  opts?: { model?: string },
): Promise<ExtractSignatureResult> {
  const model = opts?.model ?? "google/gemini-3-flash"

  // Decode + palette extraction (deterministic, sharp-backed).
  const { pixels, inferredMediaType } = await decodeForPalette(input.imageBytes)
  const rawPalette: RawPalette = extractPaletteFromPixels(pixels, { k: 5 })
  const deterministicPalette = assignRoles(rawPalette)

  const paletteList = deterministicPalette
    .map((s, i) => `  ${i + 1}. ${s.hex}`)
    .join("\n")

  // Multimodal call.
  const mediaType = input.mediaType ?? inferredMediaType ?? "image/png"
  const { output } = await generateText({
    model,
    output: Output.object({ schema: generationSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildUserPrompt(input, paletteList) },
          { type: "image", image: Buffer.from(input.imageBytes), mediaType },
        ],
      },
    ],
    system: buildSystemPrompt(),
  })

  const llmSignature = output as Omit<Signature, "source">

  // Palette drift guard. Gemini sometimes wanders one digit on the hex —
  // when that happens we fall back to the deterministic + heuristic-role pass
  // so the downstream PreviewPane never ships with hallucinated colors.
  const detSet = new Set(deterministicPalette.map((s) => s.hex.toLowerCase()))
  const gemPalette = llmSignature.palette ?? []
  const paletteMatched =
    gemPalette.length === 5 && gemPalette.every((s) => detSet.has(s.hex.toLowerCase()))
  const rolesValid = new Set(gemPalette.map((s) => s.role)).size === 5

  const finalPalette: PaletteSwatch[] =
    paletteMatched && rolesValid
      ? gemPalette.map((s) => ({ ...s, hex: s.hex.toLowerCase() }))
      : assignRoles(rawPalette)

  // Defensive: if a role is somehow missing from finalPalette, repair from
  // hexToRgb on the deterministic five so the signature shape stays valid.
  if (finalPalette.length !== 5) {
    const repaired = assignRoles(
      deterministicPalette.map((s) => ({
        rgb: hexToRgb(s.hex),
        hex: s.hex,
        population: 1,
      })),
    )
    finalPalette.splice(0, finalPalette.length, ...repaired)
  }

  const signature: Signature = {
    ...llmSignature,
    palette: finalPalette,
    source: {
      type: input.source.type,
      ref: input.source.ref,
      hash: input.source.hash,
    },
  }

  return {
    signature,
    deterministicPalette,
    paletteMatched,
    rolesValid,
  }
}
