import { generateObject } from "ai"
import { z } from "zod"
import { recommend, type GeneratorInput } from "@/lib/recommend"
import { generateResponseSchema } from "@/lib/generate-schema"
import { LIBRARIES } from "@/lib/stack-data"
import { withFallback } from "@/lib/ai-models"

export const maxDuration = 30

const inputSchema = z.object({
  prompt: z.string().min(4).max(800),
  vibe: z.enum(["minimal", "bold", "editorial", "playful", "experimental"]),
  audience: z.enum(["consumer", "enterprise", "developer", "creative"]),
  performance: z.enum(["max", "balanced", "rich"]),
  includePaid: z.boolean(),
  /** Optional override — if provided, use these library ids instead of the recommended ones. */
  stackIds: z.array(z.string()).optional(),
  /** Free-form natural-language nudge: "make it more brutalist", "lighter palette", etc. */
  constraint: z.string().max(280).optional(),
})

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = inputSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
  }

  const input: GeneratorInput = {
    prompt: parsed.data.prompt,
    vibe: parsed.data.vibe,
    audience: parsed.data.audience,
    performance: parsed.data.performance,
    includePaid: parsed.data.includePaid,
  }

  // Use provided stackIds if any, else use the recommendation engine's pick.
  let stack
  if (parsed.data.stackIds && parsed.data.stackIds.length > 0) {
    stack = parsed.data.stackIds
      .map((id) => LIBRARIES.find((l) => l.id === id))
      .filter((l): l is (typeof LIBRARIES)[number] => Boolean(l))
  } else {
    stack = recommend(input).stack
  }

  const stackList = stack
    .map((lib, i) => `${i + 1}. id="${lib.id}" — ${lib.name} (${lib.category}): ${lib.tagline}`)
    .join("\n")

  const system = `You are UXC, an opinionated design director. Your job is to take a creative brief and a chosen stack of front-end libraries, and produce a custom theme + rationale that match the brief.

RULES:
- Be confident and specific. Reference the brief explicitly.
- Theme colors MUST be OKLCH CSS strings in exactly this format: oklch(L C H) where L is lightness (0-1), C is chroma (0-0.4), H is hue (0-360).
- Pick ONE display font and ONE body font.
- Choose colors with strong contrast between background/foreground; feel intentional, not random.
- Match the audience and vibe — enterprise feels restrained, playful feels expressive, editorial feels printed.
- Avoid purple/violet unless the brief explicitly calls for it.
- Reasons should be sharp, not generic. Connect each library to a specific moment in the user's brief.`

  const constraint = parsed.data.constraint?.trim()

  const userPrompt = `BRIEF:
"""
${input.prompt}
"""

VIBE: ${input.vibe}
AUDIENCE: ${input.audience}
PERFORMANCE BUDGET: ${input.performance}
INCLUDE PAID/AUTH-REQUIRED: ${input.includePaid}
${
  constraint
    ? `\nADDITIONAL DIRECTION (override defaults to honor this):\n"""\n${constraint}\n"""\n`
    : ""
}
STACK (one reason per library, in this order, using the given id):
${stackList}

Produce headline, rationale, per-library reasons, and a custom theme${
    constraint ? " that honors the additional direction above" : ""
  }.`

  try {
    const { object } = await withFallback((model) =>
      generateObject({
        model,
        system,
        prompt: userPrompt,
        schema: generateResponseSchema,
      })
    )
    return Response.json(object)
  } catch (e) {
    console.error("[v0] regenerate error", e)
    return Response.json({ error: "Generation failed" }, { status: 500 })
  }
}
