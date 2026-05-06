import { generateObject } from "ai"
import { z } from "zod"
import { recommend, type GeneratorInput, type Performance, type Vibe } from "@/lib/recommend"
import { generateResponseSchema, type GenerateResponse } from "@/lib/generate-schema"
import { LIBRARIES } from "@/lib/stack-data"
import { computePerfReport } from "@/lib/bundle-sizes"
import { createClient } from "@/lib/supabase/server"
import { signatureSchema, type Signature } from "@/lib/signature"
import { withFallback } from "@/lib/ai-models"

export const maxDuration = 30

// ---------------------------------------------------------------------------
// Input contract
// ---------------------------------------------------------------------------
//
// Two shapes accepted, with `inspirationId` as the discriminator:
//
//   1. Free-form: prompt + vibe + audience + includePaid are all required.
//      This is the original behaviour from before Phase 3.
//
//   2. Inspiration-conditioned: pass `inspirationId` and the server pulls
//      the stored Signature, then fills any missing free-form fields from
//      it. Lets the share page's "More like this" button send a single id
//      and get fully contextual variants.
//
// All free-form fields are optional in the schema — we validate the
// "either or" rule manually after parsing so error messages are clearer.
// ---------------------------------------------------------------------------

const inputSchema = z.object({
  prompt: z.string().min(4).max(800).optional(),
  vibe: z.enum(["minimal", "bold", "editorial", "playful", "experimental"]).optional(),
  audience: z.enum(["consumer", "enterprise", "developer", "creative"]).optional(),
  includePaid: z.boolean().optional(),
  /**
   * Optional motion tolerance from the slider. Each variant gets its own
   * effective motionLevel — performance mode clamps to min(level, 1),
   * maximalist clamps to max(level, 2). Defaults to the signature's
   * motionLevel when an inspiration is provided, else 2.
   */
  motionLevel: z
    .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
    .optional(),
  /**
   * When set, the server fetches the stored Signature for this inspiration
   * and seeds vibe / audience / performance / motionLevel / palette / fonts
   * from it. Subject to RLS — we can only read inspirations the caller owns
   * or that are explicitly is_public=true.
   */
  inspirationId: z.string().uuid().optional(),
})

type Mode = "performance" | "balanced" | "maximalist"

const MODES: Array<{
  id: Mode
  label: string
  blurb: string
  perf: Performance
  vibeShift?: Vibe
  /** Library ids to *always* exclude for this mode (heaviest 3D / physics). */
  exclude?: string[]
  /** Forced extra tags to push into the recommend engine. */
  extraTags?: string[]
}> = [
  {
    id: "performance",
    label: "Performance-first",
    blurb: "Lean stack. Build-time wins. Motion is restrained, no WebGL.",
    perf: "max",
    exclude: ["threejs", "r3f", "drei", "rapier", "spline", "webgpu", "ogl", "matter"],
    extraTags: ["fast", "performance", "minimal"],
  },
  {
    id: "balanced",
    label: "Balanced",
    blurb: "The middle path. One hero moment, the rest restrained.",
    perf: "balanced",
  },
  {
    id: "maximalist",
    label: "Maximalist",
    blurb: "Maximum visual ceiling. 3D, physics, particles, the works.",
    perf: "rich",
    vibeShift: "experimental",
    extraTags: ["3d", "experimental", "shaders", "particles", "bold"],
  },
]

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}))
  const parsed = inputSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
  }

  const raw = parsed.data

  // ---------------------------------------------------------------------
  // Resolve the effective input. If an inspirationId is provided, pull the
  // stored signature and use it to fill any missing fields. This is what
  // lets `<MoreLikeThis>` send just `{ inspirationId }` and get coherent
  // variants back without re-stating the brief.
  // ---------------------------------------------------------------------
  let signature: Signature | null = null
  let resolvedInspirationId: string | null = null

  if (raw.inspirationId) {
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from("inspirations")
      .select("id, signature")
      .eq("id", raw.inspirationId)
      .maybeSingle()

    if (error) {
      return Response.json({ error: "Failed to load inspiration" }, { status: 500 })
    }
    if (!row) {
      return Response.json({ error: "Inspiration not found or not accessible" }, { status: 404 })
    }

    const sigParse = signatureSchema.safeParse(row.signature)
    if (!sigParse.success) {
      return Response.json(
        { error: "Stored signature is malformed; cannot generate variants from it." },
        { status: 422 },
      )
    }
    signature = sigParse.data
    resolvedInspirationId = row.id
  }

  // Merge signature defaults into the input. Explicit input always wins.
  const baseInput = {
    prompt: raw.prompt ?? signature?.brief ?? null,
    vibe: raw.vibe ?? signature?.vibe ?? null,
    audience: raw.audience ?? signature?.audience ?? null,
    includePaid: raw.includePaid ?? true,
    motionLevel: raw.motionLevel ?? (signature?.motionLevel as 0 | 1 | 2 | 3 | undefined) ?? 2,
  }

  if (!baseInput.prompt || !baseInput.vibe || !baseInput.audience) {
    return Response.json(
      {
        error:
          "Missing required input. Provide prompt + vibe + audience, or an inspirationId whose signature includes them.",
      },
      { status: 400 },
    )
  }

  // ---------------------------------------------------------------------
  // Per-variant generation. Each mode rebuilds `recommend()` with its own
  // performance budget + tag bias, then asks the model for a fresh theme +
  // rationale. When a signature is in play, that signature's palette,
  // fonts, and library hints are injected into the per-mode prompt so the
  // variants read as "the same brief reinterpreted" rather than three
  // unrelated stacks.
  // ---------------------------------------------------------------------
  const variants = await Promise.all(
    MODES.map(async (mode) => {
      const userMotion = baseInput.motionLevel
      const effectiveMotion: 0 | 1 | 2 | 3 =
        mode.id === "performance"
          ? (Math.min(userMotion, 1) as 0 | 1)
          : mode.id === "maximalist"
            ? (Math.max(userMotion, 2) as 2 | 3)
            : userMotion

      const input: GeneratorInput = {
        prompt: baseInput.prompt!,
        vibe: mode.vibeShift ?? baseInput.vibe!,
        audience: baseInput.audience!,
        performance: mode.perf,
        includePaid: baseInput.includePaid,
        motionLevel: effectiveMotion,
      }

      // Tag bias: combine mode tags with signature library hints (when
      // present) so recommend() leans toward libraries the source used
      // before being told to.
      const tagBias = [
        ...(mode.extraTags ?? []),
        ...(signature?.libraryHints ?? []).slice(0, 4),
      ]
      const directionLine = tagBias.length > 0 ? `\n\nDirection: ${tagBias.join(", ")}.` : ""

      // Recommend with mode constraints
      const rec = recommend({
        ...input,
        prompt: `${input.prompt}${directionLine}`,
      })

      let stack = rec.stack
      if (mode.exclude && mode.exclude.length > 0) {
        stack = stack.filter((s) => !mode.exclude!.includes(s.id))
      }
      // Always keep nextjs + tailwind as the baseline
      const must = ["nextjs", "tailwind"]
      for (const id of must) {
        if (!stack.find((s) => s.id === id)) {
          const lib = LIBRARIES.find((l) => l.id === id)
          if (lib) {
            stack = [
              ...stack,
              { ...lib, score: 0, reasons: ["foundation"] },
            ]
          }
        }
      }
      // Cap at 7
      stack = stack.slice(0, 7)

      const stackList = stack
        .map((lib, i) => `${i + 1}. id="${lib.id}" — ${lib.name} (${lib.category}): ${lib.tagline}`)
        .join("\n")

      // Signature-aware system prompt addendum. We instruct the model to
      // honor the source palette/fonts/vibe statement only when a signature
      // is available — otherwise the existing free-form behavior applies.
      const signatureBlock = signature
        ? `

SOURCE INSPIRATION (the user is asking for variants OF this captured signature):
- Content: ${signature.contentSignature}
- Vibe statement: ${signature.vibeStatement}
- Audience statement: ${signature.audienceStatement}
- Layout pattern: ${signature.layoutPattern}
- Source palette (anchor your theme to these — adapt, don't copy verbatim):
${signature.palette.map((s) => `    ${s.role.padEnd(10)} ${s.hex} (${s.name})`).join("\n")}
- Source fonts: display=${signature.fonts.display}, body=${signature.fonts.body}, category=${signature.fonts.category}

When generating this variant, riff on the source signature for THIS mode's character. Performance-first should distill the palette to its quietest two colors. Maximalist may push saturation, add a highlight. Balanced stays close to the source.`
        : ""

      const system = `You are UXC, an opinionated design director. Generate a tightly-scoped variant of a stack proposal.

This is the "${mode.label}" variant: ${mode.blurb}

RULES:
- Theme colors MUST be OKLCH CSS strings: oklch(L C H).
- Pick one display + one body font.
- Match audience and vibe; if maximalist, lean expressive; if performance, lean restrained.
- Avoid purple/violet unless the brief demands it.
- Reasons must be sharp and specific — no boilerplate.${signatureBlock}`

      const userPrompt = `BRIEF:
"""
${baseInput.prompt}
"""

VARIANT: ${mode.label} — ${mode.blurb}
VIBE: ${input.vibe}
AUDIENCE: ${input.audience}
PERFORMANCE BUDGET: ${input.performance}
INCLUDE PAID/AUTH-REQUIRED: ${input.includePaid}

STACK (one reason per library, in order, using the given id):
${stackList}

Produce headline, rationale, per-library reasons, and a custom theme that fits this variant's character.`

      try {
        const { object } = await withFallback((model) =>
          generateObject({
            model,
            system,
            prompt: userPrompt,
            schema: generateResponseSchema,
          })
        )

        const stackIds = stack.map((s) => s.id)
        const perfReport = computePerfReport(stackIds)

        return {
          mode: mode.id,
          label: mode.label,
          blurb: mode.blurb,
          stackIds,
          perfReport,
          impactScore: rec.impactScore,
          ai: object as GenerateResponse,
        }
      } catch (e) {
        console.error("[v0] variant generation failed", mode.id, e)
        return {
          mode: mode.id,
          label: mode.label,
          blurb: mode.blurb,
          stackIds: stack.map((s) => s.id),
          perfReport: computePerfReport(stack.map((s) => s.id)),
          impactScore: rec.impactScore,
          ai: null as GenerateResponse | null,
          error: "Generation failed for this variant.",
        }
      }
    }),
  )

  return Response.json({
    variants,
    // Echo back so the client can wire variant cards to the right lineage
    // when the user picks one. Stays null in the free-form path.
    inspirationId: resolvedInspirationId,
    sourceVibe: baseInput.vibe,
    sourceAudience: baseInput.audience,
    sourcePrompt: baseInput.prompt,
    sourceIncludePaid: baseInput.includePaid,
  })
}

export type VariantsResponse = {
  variants: Array<{
    mode: Mode
    label: string
    blurb: string
    stackIds: string[]
    perfReport: ReturnType<typeof computePerfReport>
    impactScore: number
    ai: GenerateResponse | null
    error?: string
  }>
  inspirationId: string | null
  sourceVibe: string
  sourceAudience: string
  sourcePrompt: string
  sourceIncludePaid: boolean
}
