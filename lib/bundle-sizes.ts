/**
 * Honest gzipped bundle sizes for the libraries Prism recommends.
 *
 * Numbers reflect a typical first-load cost in production: the published gzipped
 * size of the runtime package (or the client portion of a framework). They are
 * conservative best-effort figures from bundlephobia + the libraries' own
 * release notes, rounded to whole kB. Notes call out tree-shaking,
 * lazy-loadable WASM, or build-time-only costs so the perf score never lies.
 */
export type BundleEntry = {
  /** Gzipped kB shipped to the client. 0 means build-time-only. */
  kb: number
  /** Optional caveat. */
  note?: string
}

export const BUNDLE_SIZES: Record<string, BundleEntry> = {
  nextjs: { kb: 90, note: "Framework runtime — basic App Router first load" },
  threejs: { kb: 175, note: "Full WebGL renderer; tree-shaking helps in large apps" },
  r3f: { kb: 35, note: "Reconciler only — Three.js still required" },
  drei: { kb: 60, note: "Per-helper, well tree-shaken" },
  webgpu: { kb: 0, note: "Web standard — no library cost" },
  gsap: { kb: 70, note: "Core; ScrollTrigger adds ~14 kB" },
  "framer-motion": { kb: 70, note: "Tree-shakeable; typical usage stays near 70 kB" },
  lenis: { kb: 5 },
  tailwind: { kb: 0, note: "Build-time only — no runtime" },
  shadcn: { kb: 0, note: "Components copied into your codebase" },
  radix: { kb: 12, note: "Avg per primitive ~3 kB, typical site uses 3-5" },
  v0: { kb: 0, note: "Code generator — no runtime cost" },
  "ai-sdk": { kb: 25, note: "@ai-sdk/react client streaming hooks" },
  lottie: { kb: 60, note: "lottie-web + React binding" },
  spline: { kb: 220, note: "Runtime + scene parser — large but lazy-loadable" },
  figma: { kb: 0, note: "REST API — used at build/sync time" },
  tsparticles: { kb: 60 },
  ogl: { kb: 25, note: "Minimal WebGL toolkit" },
  matter: { kb: 90, note: "2D physics engine" },
  rapier: { kb: 280, note: "Rust WASM — loaded on demand, can be lazy" },
}

export type PerfGrade = "A" | "B" | "C" | "D"

export type PerfReport = {
  /** Sum of gzipped kB for the runtime bundle (excludes build-time). */
  totalKb: number
  /** Sum across all entries including 0-cost (counted as items only). */
  itemsCounted: number
  /** Grade (A: lean, D: heavy). */
  grade: PerfGrade
  /** Per-library breakdown including any unknown ids. */
  entries: Array<{ id: string; kb: number; note?: string; known: boolean }>
}

/** Compute a perf report from a list of library ids. */
export function computePerfReport(stackIds: string[]): PerfReport {
  const entries = stackIds.map((id) => {
    const known = BUNDLE_SIZES[id]
    if (known) return { id, kb: known.kb, note: known.note, known: true as const }
    // Unknown ids count as 30 kB — a reasonable assumption for "another lib"
    return { id, kb: 30, note: "Estimate — not in our database", known: false as const }
  })
  const totalKb = entries.reduce((acc, e) => acc + e.kb, 0)
  const grade: PerfGrade =
    totalKb < 120 ? "A" : totalKb < 220 ? "B" : totalKb < 360 ? "C" : "D"
  return { totalKb, itemsCounted: entries.length, grade, entries }
}

/** Plain-language summary, e.g. "267 kB gzipped, grade B". */
export function describePerf(report: PerfReport): string {
  return `${report.totalKb} kB gzipped — grade ${report.grade}`
}
