import { generateObject } from "ai"
import { z } from "zod"
import { recommend, type GeneratorInput, type Performance, type Vibe } from "@/lib/recommend"
import { generateResponseSchema, type GenerateResponse } from "@/lib/generate-schema"
import { LIBRARIES } from "@/lib/stack-data"
import { computePerfReport } from "@/lib/bundle-sizes"

export const maxDuration = 30

const inputSchema = z.object({
  prompt: z.string().min(4).max(800),
  vibe: z.enum(["minimal", "bold", "editorial", "playful", "experimental"]),
  audience: z.enum(["consumer", "enterprise", "developer", "creative"]),
  includePaid: z.boolean(),
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

  const baseInput = parsed.data

  // Build a recommendation per mode, then ask the model for a theme + reasons
  // for each in parallel. We only ask for theme + headline + rationale +
  // reasons (the structure is generateResponseSchema). Stack ids are decided
  // deterministically here so each variant has a clearly different
  // composition.
  const variants = await Promise.all(
    MODES.map(async (mode) => {
      const input: GeneratorInput = {
        prompt: baseInput.prompt,
        vibe: mode.vibeShift ?? baseInput.vibe,
        audience: baseInput.audience,
        performance: mode.perf,
        includePaid: baseInput.includePaid,
      }

      // Recommend with mode constraints
      const rec = recommend({
        ...input,
        prompt: mode.extraTags
          ? `${input.prompt}\n\nDirection: ${mode.extraTags.join(", ")}.`
          : input.prompt,
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

      const system = `You are Prism, an opinionated design director. Generate a tightly-scoped variant of a stack proposal.

This is the "${mode.label}" variant: ${mode.blurb}

RULES:
- Theme colors MUST be OKLCH CSS strings: oklch(L C H).
- Pick one display + one body font.
- Match audience and vibe; if maximalist, lean expressive; if performance, lean restrained.
- Avoid purple/violet unless the brief demands it.
- Reasons must be sharp and specific — no boilerplate.`

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
        const { object } = await generateObject({
          model: "openai/gpt-5-mini",
          system,
          prompt: userPrompt,
          schema: generateResponseSchema,
        })

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

  return Response.json({ variants })
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
}
