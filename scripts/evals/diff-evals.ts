/* eslint-disable no-console */
// ---------------------------------------------------------------------------
// scripts/evals/diff-evals.ts — compare two eval runs.
// ---------------------------------------------------------------------------
//
// Usage:
//   pnpm evals:diff baseline <runId>
//   pnpm evals:diff <runIdA> <runIdB>
//
// What it compares per-fixture:
//   - vibe / audience / performanceHint / motionLevel        → exact match
//   - palette role assignments (by hex)                      → exact match
//   - libraryHints                                            → Jaccard similarity
//   - vibeStatement / audienceStatement / contentSignature   → side-by-side
//   - brief                                                   → length + side-by-side
//
// Exit code: non-zero if any structured field differs. Prose differences are
// reported but don't fail the run — they're meant to inform a human reviewer.
// ---------------------------------------------------------------------------

import { readdir, readFile, stat } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { Signature, PaletteRole } from "@/lib/signature"

const __filename = fileURLToPath(import.meta.url)
const HERE = dirname(__filename)
const RUNS_ROOT = resolve(HERE, "runs")

type FixtureRecord = {
  fixtureId: string
  label: string
  sourceHash: string
  paletteMatched: boolean
  rolesValid: boolean
  signature: Signature
}

async function loadRun(runId: string): Promise<Map<string, FixtureRecord>> {
  const dir = resolve(RUNS_ROOT, runId)
  await stat(dir).catch(() => {
    throw new Error(`Run "${runId}" not found at ${dir}`)
  })
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith(".json") && f !== "summary.json",
  )
  const out = new Map<string, FixtureRecord>()
  for (const f of files) {
    const raw = await readFile(resolve(dir, f), "utf8")
    const rec = JSON.parse(raw) as FixtureRecord
    out.set(rec.fixtureId, rec)
  }
  return out
}

function jaccard<T>(a: T[], b: T[]): number {
  const A = new Set(a.map((x) => String(x).toLowerCase()))
  const B = new Set(b.map((x) => String(x).toLowerCase()))
  if (A.size === 0 && B.size === 0) return 1
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

function paletteByRole(palette: Signature["palette"]): Record<PaletteRole, string> {
  const out: Partial<Record<PaletteRole, string>> = {}
  for (const s of palette) out[s.role] = s.hex.toLowerCase()
  return out as Record<PaletteRole, string>
}

type FieldDiff = {
  fixture: string
  field: string
  a: string
  b: string
}

function compareFixture(
  id: string,
  a: FixtureRecord | undefined,
  b: FixtureRecord | undefined,
  diffs: FieldDiff[],
  prose: { fixture: string; field: string; a: string; b: string }[],
) {
  if (!a || !b) {
    diffs.push({
      fixture: id,
      field: "presence",
      a: a ? "present" : "missing",
      b: b ? "present" : "missing",
    })
    return
  }

  // Sanity: same input bytes? If not, fixtures changed under us.
  if (a.sourceHash !== b.sourceHash) {
    diffs.push({
      fixture: id,
      field: "sourceHash",
      a: a.sourceHash.slice(0, 12),
      b: b.sourceHash.slice(0, 12),
    })
  }

  const sa = a.signature
  const sb = b.signature

  // Structured fields — exact match required.
  for (const k of ["vibe", "audience", "performanceHint"] as const) {
    if (sa[k] !== sb[k]) {
      diffs.push({ fixture: id, field: k, a: String(sa[k]), b: String(sb[k]) })
    }
  }
  if (sa.motionLevel !== sb.motionLevel) {
    diffs.push({
      fixture: id,
      field: "motionLevel",
      a: String(sa.motionLevel),
      b: String(sb.motionLevel),
    })
  }
  if (sa.layoutPattern !== sb.layoutPattern) {
    diffs.push({
      fixture: id,
      field: "layoutPattern",
      a: sa.layoutPattern,
      b: sb.layoutPattern,
    })
  }

  // Palette by role — must produce the same hex for every role.
  const pa = paletteByRole(sa.palette)
  const pb = paletteByRole(sb.palette)
  for (const role of ["bg", "fg", "accent", "muted", "highlight"] as const) {
    if (pa[role] !== pb[role]) {
      diffs.push({
        fixture: id,
        field: `palette.${role}`,
        a: pa[role] ?? "(missing)",
        b: pb[role] ?? "(missing)",
      })
    }
  }

  // Library hints — soft compare.
  const j = jaccard(sa.libraryHints, sb.libraryHints)
  if (j < 0.6) {
    diffs.push({
      fixture: id,
      field: `libraryHints (Jaccard=${j.toFixed(2)})`,
      a: sa.libraryHints.join(", "),
      b: sb.libraryHints.join(", "),
    })
  }

  // Prose — never fail, but report.
  for (const k of ["vibeStatement", "audienceStatement", "contentSignature"] as const) {
    if (sa[k] !== sb[k]) {
      prose.push({ fixture: id, field: k, a: String(sa[k] ?? ""), b: String(sb[k] ?? "") })
    }
  }
  if (sa.brief !== sb.brief) {
    prose.push({
      fixture: id,
      field: "brief",
      a: `(${sa.brief?.length ?? 0} chars) ${(sa.brief ?? "").slice(0, 120)}…`,
      b: `(${sb.brief?.length ?? 0} chars) ${(sb.brief ?? "").slice(0, 120)}…`,
    })
  }
}

async function main() {
  const [aId, bId] = process.argv.slice(2)
  if (!aId || !bId) {
    console.error("usage: pnpm evals:diff <runIdA> <runIdB>")
    process.exit(1)
  }

  const [a, b] = await Promise.all([loadRun(aId), loadRun(bId)])
  const ids = new Set([...a.keys(), ...b.keys()])

  const diffs: FieldDiff[] = []
  const prose: { fixture: string; field: string; a: string; b: string }[] = []
  for (const id of ids) compareFixture(id, a.get(id), b.get(id), diffs, prose)

  console.log(`Comparing ${aId} → ${bId}`)
  console.log(
    `  fixtures: ${a.size} vs ${b.size}; structured diffs: ${diffs.length}; prose diffs: ${prose.length}`,
  )

  if (diffs.length === 0 && prose.length === 0) {
    console.log("\n  identical.")
    return
  }

  if (diffs.length > 0) {
    console.log("\n  STRUCTURED DIFFS (failing)")
    for (const d of diffs) {
      console.log(`    ${d.fixture}  ${d.field}`)
      console.log(`      ${aId}: ${d.a}`)
      console.log(`      ${bId}: ${d.b}`)
    }
  }

  if (prose.length > 0) {
    console.log("\n  PROSE DIFFS (informational)")
    for (const p of prose) {
      console.log(`    ${p.fixture}  ${p.field}`)
      console.log(`      ${aId}: ${p.a}`)
      console.log(`      ${bId}: ${p.b}`)
    }
  }

  if (diffs.length > 0) process.exit(2)
}

main().catch((e) => {
  console.error("[diff] fatal:", e)
  process.exit(1)
})
