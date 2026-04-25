import { LIBRARIES, type Library } from "./stack-data"

export type Vibe = "minimal" | "bold" | "editorial" | "playful" | "experimental"
export type Audience = "consumer" | "enterprise" | "developer" | "creative"
export type Performance = "max" | "balanced" | "rich"

export type GeneratorInput = {
  prompt: string
  vibe: Vibe
  audience: Audience
  performance: Performance
  includePaid: boolean
}

export type ScoredLibrary = Library & {
  score: number
  reasons: string[]
}

export type Recommendation = {
  stack: ScoredLibrary[]
  impactScore: number // 0-100, "visual impressiveness" composite
  perfBudget: number // 0-100, lower = lighter
  summary: string
}

const KEYWORD_TAGS: Array<{ pattern: RegExp; tags: string[] }> = [
  { pattern: /\b(portfolio|personal|case stud)/i, tags: ["portfolio", "editorial", "narrative"] },
  { pattern: /\b(saas|dashboard|admin|app|tool)/i, tags: ["saas", "dashboard", "ui"] },
  { pattern: /\b(ecom|ecommerce|shop|store|product)/i, tags: ["ecommerce", "product", "marketing"] },
  { pattern: /\b(landing|marketing|launch|home(page)?)/i, tags: ["marketing", "hero", "narrative"] },
  { pattern: /\b(3d|three|webgl|webgpu|immersive)/i, tags: ["3d", "webgl", "immersive"] },
  { pattern: /\b(motion|anim|scroll|narrative|story)/i, tags: ["motion", "scroll", "narrative"] },
  { pattern: /\b(ai|chat|agent|llm|stream)/i, tags: ["ai", "streaming", "agent"] },
  { pattern: /\b(playful|fun|game|delight)/i, tags: ["playful", "interactive"] },
  { pattern: /\b(minimal|clean|swiss|simple)/i, tags: ["minimal"] },
  { pattern: /\b(bold|brutal|loud|maxim)/i, tags: ["bold", "experimental"] },
  { pattern: /\b(editorial|magazine|type)/i, tags: ["editorial", "narrative"] },
  { pattern: /\b(particle|effect|shader|distort)/i, tags: ["particles", "shaders", "experimental"] },
  { pattern: /\b(physics|collide|drag)/i, tags: ["physics", "interactive"] },
]

function inferTags(prompt: string): string[] {
  const set = new Set<string>()
  for (const { pattern, tags } of KEYWORD_TAGS) {
    if (pattern.test(prompt)) tags.forEach((t) => set.add(t))
  }
  return Array.from(set)
}

const VIBE_TAGS: Record<Vibe, string[]> = {
  minimal: ["minimal", "ui"],
  bold: ["bold", "hero", "experimental"],
  editorial: ["editorial", "narrative", "scroll"],
  playful: ["playful", "interactive", "particles"],
  experimental: ["experimental", "shaders", "3d"],
}

const PERF_WEIGHTS: Record<Performance, number> = {
  max: 1.5,
  balanced: 1,
  rich: 0.4,
}

export function recommend(input: GeneratorInput): Recommendation {
  const inferred = inferTags(input.prompt)
  const vibeTags = VIBE_TAGS[input.vibe]
  const targetTags = new Set([...inferred, ...vibeTags])

  // Always include framework + styling foundation
  const required = new Set(["nextjs", "tailwind"])

  const scored: ScoredLibrary[] = LIBRARIES.map((lib) => {
    if (!input.includePaid && lib.requiresAuth) {
      return { ...lib, score: -Infinity, reasons: [] }
    }

    let score = 0
    const reasons: string[] = []

    // Tag overlap
    let overlap = 0
    for (const tag of lib.tags) {
      if (targetTags.has(tag)) overlap += 1
    }
    if (overlap > 0) {
      score += overlap * 14
      reasons.push(`matches ${overlap} of your themes`)
    }

    // Visual impact contribution, modulated by performance budget
    score += lib.impact * 4
    score -= lib.weight * 2 * PERF_WEIGHTS[input.performance]

    if (lib.impact >= 8) reasons.push("high visual ceiling")
    if (lib.weight <= 2) reasons.push("featherweight")

    // Audience tweaks
    if (input.audience === "enterprise" && lib.tags.includes("accessible")) {
      score += 6
      reasons.push("accessibility-first")
    }
    if (input.audience === "creative" && (lib.category === "3d" || lib.category === "motion")) {
      score += 8
      reasons.push("creative-coding favorite")
    }
    if (input.audience === "developer" && lib.category === "ui") {
      score += 4
    }

    // Always-on baselines
    if (required.has(lib.id)) {
      score += 30
      reasons.push("foundation")
    }

    return { ...lib, score, reasons }
  })

  // Pick the best per category, then top up
  const byCategory = new Map<string, ScoredLibrary>()
  for (const lib of scored) {
    if (lib.score === -Infinity) continue
    const current = byCategory.get(lib.category)
    if (!current || lib.score > current.score) byCategory.set(lib.category, lib)
  }

  const stack: ScoredLibrary[] = Array.from(byCategory.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)

  // Make sure required ones are present
  for (const id of required) {
    if (!stack.find((s) => s.id === id)) {
      const lib = scored.find((s) => s.id === id)
      if (lib) stack.push(lib)
    }
  }

  // Final ordering — by score desc
  stack.sort((a, b) => b.score - a.score)

  const impactScore = Math.min(
    100,
    Math.round(stack.reduce((acc, s) => acc + s.impact, 0) * 1.6)
  )
  const perfBudget = Math.min(
    100,
    Math.round(stack.reduce((acc, s) => acc + s.weight, 0) * 2.2)
  )

  const summary = buildSummary(stack, input)

  return { stack, impactScore, perfBudget, summary }
}

function buildSummary(stack: ScoredLibrary[], input: GeneratorInput): string {
  const headliner = stack.find((s) => s.category === "3d") || stack[0]
  const motion = stack.find((s) => s.category === "motion")
  const ui = stack.find((s) => s.category === "ui")
  const parts = [
    `A ${input.vibe} composition`,
    headliner ? `anchored by ${headliner.name}` : null,
    motion ? `with ${motion.name} driving the motion` : null,
    ui ? `and ${ui.name} for the surface` : null,
  ].filter(Boolean)
  return parts.join(", ") + "."
}
