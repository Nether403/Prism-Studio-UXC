// ---------------------------------------------------------------------------
// scripts/evals/fixtures.ts — reference set for prompt regression detection.
// ---------------------------------------------------------------------------
//
// Each fixture is one piece of visual reference + the source metadata we want
// the model to "see". The eval runner feeds these to extractSignature() and
// records the resulting signature; the diff tool compares two runs.
//
// ADDING FIXTURES:
//   - Use varied vibes / audiences / motion levels — diversity matters more
//     than count. 12-25 fixtures is plenty.
//   - Prefer 'url' fixtures pointing at a publicly-served image (CDN, OG
//     image, Vercel Blob). 'file' fixtures must live somewhere committed.
//   - Pick image URLs that won't rot. If you need stability guarantees, copy
//     the asset into Vercel Blob via /from-image and use that URL.
// ---------------------------------------------------------------------------

import type { SourceType } from "@/lib/signature"

export type EvalFixtureInput =
  /** Fetch this URL at run time. Must return image/* bytes. */
  | { kind: "url"; url: string }
  /** Read this file path (relative to repo root) at run time. */
  | { kind: "file"; path: string }
  /** Inline base64-encoded bytes. Useful for tiny deterministic fixtures. */
  | { kind: "base64"; data: string; mediaType: string }

export type EvalFixture = {
  /** Stable, filesystem-safe id used as the result filename. */
  id: string
  /** Human-readable label. */
  label: string
  /** What kind of source this represents — flows through to signature.source.type. */
  sourceType: SourceType
  /** Human-readable source ref (URL, filename, etc). */
  sourceRef: string
  /** Where the bytes come from. */
  input: EvalFixtureInput
  /** Optional scraped hints. Use for url-style fixtures where you want the
   *  model to see real page content alongside the screenshot. */
  scraped?: {
    title?: string
    description?: string
    h1?: string
    navLabels?: string[]
    sectionHeadlines?: string[]
    heroAlt?: string
    primaryCta?: string
  }
  /** Free-form tags (vibe hint, audience hint) for filtering/diff grouping. */
  tags?: string[]
}

// ---------------------------------------------------------------------------
// Starter set. The patterns matter more than the specific URLs — once the
// harness runs against a few fixtures of varied character, you can grow it.
//
// All seed fixtures point at long-lived public image CDNs. If any rot, the
// runner will skip them with a clear message — it does not pretend a missing
// fixture is a "no signature change" eval.
// ---------------------------------------------------------------------------
export const FIXTURES: EvalFixture[] = [
  // Minimal / editorial photography — should land on calm, editorial vibes.
  {
    id: "minimal-architecture-01",
    label: "Minimal architecture (concrete + light)",
    sourceType: "image",
    sourceRef: "unsplash:minimal-architecture",
    input: {
      kind: "url",
      url: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1024&q=80",
    },
    tags: ["vibe:minimal", "vibe:editorial"],
  },
  {
    id: "warm-document-01",
    label: "Open notebook on warm wood",
    sourceType: "image",
    sourceRef: "unsplash:warm-notebook",
    input: {
      kind: "url",
      url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1024&q=80",
    },
    tags: ["vibe:editorial", "vibe:warm"],
  },

  // Bold / saturated graphics — should escalate motion and accent saturation.
  {
    id: "neon-arcade-01",
    label: "Neon arcade signage at night",
    sourceType: "image",
    sourceRef: "unsplash:neon-arcade",
    input: {
      kind: "url",
      url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1024&q=80",
    },
    tags: ["vibe:neon", "motion:expressive"],
  },
  {
    id: "bold-poster-01",
    label: "High-contrast color blocks",
    sourceType: "image",
    sourceRef: "unsplash:color-blocks",
    input: {
      kind: "url",
      url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1024&q=80",
    },
    tags: ["vibe:bold", "vibe:brutalist"],
  },

  // Nature / organic — should pick up earth tones, lower motion.
  {
    id: "organic-forest-01",
    label: "Sun through forest canopy",
    sourceType: "image",
    sourceRef: "unsplash:forest-canopy",
    input: {
      kind: "url",
      url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1024&q=80",
    },
    tags: ["vibe:organic", "audience:lifestyle"],
  },

  // Dark / luxury — should pick a deep bg with high-saturation accent.
  {
    id: "luxury-dark-01",
    label: "Dark portrait with rim light",
    sourceType: "image",
    sourceRef: "unsplash:dark-portrait",
    input: {
      kind: "url",
      url: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1024&q=80",
    },
    tags: ["vibe:luxury", "vibe:dark"],
  },

  // Tech / cinematic — should pick up cool tones, high motion hint.
  {
    id: "tech-circuit-01",
    label: "Circuit board macro",
    sourceType: "image",
    sourceRef: "unsplash:circuit",
    input: {
      kind: "url",
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1024&q=80",
    },
    tags: ["vibe:cinematic", "audience:dev"],
  },

  // Playful / pastel — should pick warm pastel palette, lower performance hint.
  {
    id: "playful-pastel-01",
    label: "Pastel still life",
    sourceType: "image",
    sourceRef: "unsplash:pastel-still-life",
    input: {
      kind: "url",
      url: "https://images.unsplash.com/photo-1503602642458-232111445657?w=1024&q=80",
    },
    tags: ["vibe:playful", "vibe:pastel"],
  },
]

// Convenience: filter fixtures by tag prefix, used by the runner CLI.
export function filterFixtures(filter?: string): EvalFixture[] {
  if (!filter) return FIXTURES
  const f = filter.toLowerCase()
  return FIXTURES.filter(
    (fix) =>
      fix.id.toLowerCase().includes(f) ||
      fix.label.toLowerCase().includes(f) ||
      (fix.tags ?? []).some((t) => t.toLowerCase().includes(f)),
  )
}
