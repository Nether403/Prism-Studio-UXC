import { streamText, Output } from "ai"
import { z } from "zod"
import { recommend, type GeneratorInput } from "@/lib/recommend"
import { generateResponseSchema } from "@/lib/generate-schema"

export const maxDuration = 30

function motionLabel(level: 0 | 1 | 2 | 3 | undefined): string {
  switch (level) {
    case 0: return "reduced — no GSAP, no Three motion, prefers-reduced-motion"
    case 1: return "subtle — Lenis ok, gentle GSAP only, no Three"
    case 3: return "maximum — full Three + GSAP + physics encouraged"
    case 2:
    default: return "expressive — GSAP yes, Three sparingly (default)"
  }
}

const inputSchema = z.object({
  prompt: z.string().min(4).max(800),
  vibe: z.enum(["minimal", "bold", "editorial", "playful", "experimental"]),
  audience: z.enum(["consumer", "enterprise", "developer", "creative"]),
  performance: z.enum(["max", "balanced", "rich"]),
  includePaid: z.boolean(),
  motionLevel: z
    .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
    .optional(),
})

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = inputSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
  }

  const input: GeneratorInput = parsed.data
  const recommendation = recommend(input)

  const stackList = recommendation.stack
    .map((lib, i) => `${i + 1}. id="${lib.id}" — ${lib.name} (${lib.category}): ${lib.tagline}`)
    .join("\n")

  const system = `You are Prism, an opinionated design director. Your job is to take a creative brief and a pre-selected stack of front-end libraries, and produce a custom theme + rationale that match the brief.

RULES:
- Be confident and specific. Reference the brief explicitly.
- Theme colors MUST be OKLCH CSS strings in exactly this format: oklch(L C H) where L is lightness (0-1), C is chroma (0-0.4), H is hue (0-360). Example: oklch(0.13 0.005 240).
- Pick ONE display font and ONE body font.
- Choose colors with strong contrast between background/foreground; feel intentional, not random.
- Match the audience and vibe — enterprise feels restrained, playful feels expressive, editorial feels printed.
- Avoid purple/violet unless the brief explicitly calls for it.
- Reasons should be sharp, not generic. Connect each library to a specific moment in the user's brief.`

  const userPrompt = `BRIEF:
"""
${input.prompt}
"""

VIBE: ${input.vibe}
AUDIENCE: ${input.audience}
PERFORMANCE BUDGET: ${input.performance}
MOTION TOLERANCE: ${motionLabel(input.motionLevel)}
INCLUDE PAID/AUTH-REQUIRED: ${input.includePaid}

PRE-SELECTED STACK (you must produce one reason for each, in this exact order, using the given id):
${stackList}

Produce headline, rationale, per-library reasons, and a custom theme that matches the brief.`

  const result = streamText({
    model: "openai/gpt-5-mini",
    system,
    prompt: userPrompt,
    output: Output.object({ schema: generateResponseSchema }),
  })

  return result.toTextStreamResponse()
}
