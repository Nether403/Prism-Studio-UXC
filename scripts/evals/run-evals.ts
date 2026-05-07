// ---------------------------------------------------------------------------
// scripts/evals/run-evals.ts — Phase 4 prompt-regression harness.
// ---------------------------------------------------------------------------
//
// Runs every fixture from fixtures.ts through extractSignature() and writes
// each resulting signature to scripts/evals/runs/<runId>/<fixtureId>.json,
// plus a summary.json with timing + drift stats.
//
// Usage:
//   pnpm evals:run                        # run everything, write to runs/<timestamp>
//   pnpm evals:baseline                   # run everything, write to runs/baseline
//   pnpm evals:run -- --filter neon       # only fixtures matching "neon"
//   pnpm evals:run -- --concurrency 1     # serialize to be nice to the model
//
// CI workflow:
//   1. Run `pnpm evals:baseline` once after a prompt change you trust.
//      Commit runs/baseline/.
//   2. On future changes: `pnpm evals:run` then `pnpm evals:diff baseline <runId>`.
// ---------------------------------------------------------------------------

import { mkdir, writeFile, readFile, stat } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { extractSignature } from "@/lib/extract-signature"
import { FIXTURES, filterFixtures, type EvalFixture } from "./fixtures"
import { createHash } from "node:crypto"

const __filename = fileURLToPath(import.meta.url)
const HERE = dirname(__filename)
const RUNS_ROOT = resolve(HERE, "runs")

type Args = {
  runId: string
  filter?: string
  concurrency: number
}

function parseArgs(argv: string[]): Args {
  const out: Args = { runId: defaultRunId(), concurrency: 2 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--baseline") out.runId = "baseline"
    else if (a === "--id") out.runId = String(argv[++i] ?? "")
    else if (a === "--filter") out.filter = String(argv[++i] ?? "")
    else if (a === "--concurrency") out.concurrency = Number(argv[++i] ?? "2")
  }
  if (!out.runId) out.runId = defaultRunId()
  return out
}

function defaultRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

async function loadFixtureBytes(
  fixture: EvalFixture,
): Promise<{ bytes: ArrayBuffer; mediaType?: string }> {
  const i = fixture.input
  if (i.kind === "url") {
    const r = await fetch(i.url)
    if (!r.ok) throw new Error(`fetch ${r.status} ${i.url}`)
    return {
      bytes: await r.arrayBuffer(),
      mediaType: r.headers.get("content-type") || undefined,
    }
  }
  if (i.kind === "file") {
    const abs = resolve(process.cwd(), i.path)
    return { bytes: (await readFile(abs)).buffer as ArrayBuffer }
  }
  if (i.kind === "base64") {
    return {
      bytes: Buffer.from(i.data, "base64").buffer as ArrayBuffer,
      mediaType: i.mediaType,
    }
  }
  throw new Error(`unknown fixture input kind`)
}

type RunRecord = {
  fixtureId: string
  label: string
  ok: boolean
  durationMs: number
  paletteMatched?: boolean
  rolesValid?: boolean
  error?: string
  /** SHA-256 of the fetched bytes — fixture stability check. */
  sourceHash?: string
}

async function runOne(fixture: EvalFixture, runDir: string): Promise<RunRecord> {
  const t0 = Date.now()
  try {
    const { bytes, mediaType } = await loadFixtureBytes(fixture)
    const sourceHash = createHash("sha256").update(Buffer.from(bytes)).digest("hex")

    const result = await extractSignature({
      imageBytes: bytes,
      mediaType,
      source: {
        type: fixture.sourceType,
        ref: fixture.sourceRef,
        hash: sourceHash,
      },
      scraped: fixture.scraped ?? null,
    })

    await writeFile(
      resolve(runDir, `${fixture.id}.json`),
      JSON.stringify(
        {
          fixtureId: fixture.id,
          label: fixture.label,
          tags: fixture.tags ?? [],
          sourceHash,
          paletteMatched: result.paletteMatched,
          rolesValid: result.rolesValid,
          deterministicPalette: result.deterministicPalette,
          signature: result.signature,
        },
        null,
        2,
      ),
    )

    return {
      fixtureId: fixture.id,
      label: fixture.label,
      ok: true,
      durationMs: Date.now() - t0,
      paletteMatched: result.paletteMatched,
      rolesValid: result.rolesValid,
      sourceHash,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      fixtureId: fixture.id,
      label: fixture.label,
      ok: false,
      durationMs: Date.now() - t0,
      error: msg,
    }
  }
}

async function pool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = new Array(Math.max(1, Math.min(concurrency, items.length)))
    .fill(0)
    .map(async () => {
      while (true) {
        const i = next++
        if (i >= items.length) return
        out[i] = await fn(items[i]!)
      }
    })
  await Promise.all(workers)
  return out
}

async function ensureDir(p: string) {
  try {
    await stat(p)
  } catch {
    await mkdir(p, { recursive: true })
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const fixtures = filterFixtures(args.filter)
  if (fixtures.length === 0) {
    console.error(`No fixtures matched filter "${args.filter}".`)
    process.exit(1)
  }

  const runDir = resolve(RUNS_ROOT, args.runId)
  await ensureDir(runDir)

  console.log(
    `[evals] runId=${args.runId} fixtures=${fixtures.length} concurrency=${args.concurrency}`,
  )
  console.log(`[evals] dir=${runDir}`)

  const t0 = Date.now()
  const records = await pool(fixtures, args.concurrency, async (f) => {
    const rec = await runOne(f, runDir)
    const tag = rec.ok ? "ok " : "ERR"
    const drift = rec.ok && !rec.paletteMatched ? " (palette drift)" : ""
    const why = rec.error ? ` — ${rec.error}` : ""
    console.log(
      `  [${tag}] ${rec.fixtureId.padEnd(28)} ${String(rec.durationMs).padStart(5)}ms${drift}${why}`,
    )
    return rec
  })
  const totalMs = Date.now() - t0

  const okCount = records.filter((r) => r.ok).length
  const driftCount = records.filter((r) => r.ok && r.paletteMatched === false).length
  const summary = {
    runId: args.runId,
    finishedAt: new Date().toISOString(),
    fixtureCount: fixtures.length,
    okCount,
    errCount: fixtures.length - okCount,
    paletteDriftCount: driftCount,
    totalMs,
    fixtures: FIXTURES.length,
    filter: args.filter ?? null,
    records,
  }
  await writeFile(resolve(runDir, "summary.json"), JSON.stringify(summary, null, 2))

  console.log(
    `[evals] done in ${totalMs}ms — ok ${okCount}/${fixtures.length}, palette drift ${driftCount}`,
  )
  console.log(`[evals] summary: ${resolve(runDir, "summary.json")}`)

  if (okCount < fixtures.length) process.exit(2)
}

main().catch((e) => {
  console.error("[evals] fatal:", e)
  process.exit(1)
})
