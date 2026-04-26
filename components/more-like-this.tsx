"use client"

/**
 * MoreLikeThis
 * ============
 *
 * The owner-only "regenerate this inspiration as 3 alternative stacks"
 * surface that lives at the bottom of `<ProvenanceCard>` on /s/[id].
 *
 * Flow:
 *   1. User clicks the trigger button.
 *   2. We POST `{ inspirationId }` to /api/variants. The server pulls the
 *      stored signature, conditions every variant on it, and returns three
 *      mode-tagged stack proposals (performance / balanced / maximalist).
 *   3. Each variant card renders headline + theme palette + stack-id badges.
 *   4. Clicking "Save variant" persists a new stack + a child inspiration
 *      row (parent_inspiration_id wired to the source) via the server
 *      action `saveVariantFromInspiration`, then navigates to /s/<new-id>.
 *
 * Errors surface inline; the user can retry without losing context.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, AlertCircle, ChevronRight, Layers, Gauge } from "lucide-react"
import { toast } from "sonner"
import { saveVariantFromInspiration } from "@/app/actions/inspiration"
import type { GenerateResponse } from "@/lib/generate-schema"
import type { PerfReport } from "@/lib/bundle-sizes"

type Variant = {
  mode: "performance" | "balanced" | "maximalist"
  label: string
  blurb: string
  stackIds: string[]
  perfReport: PerfReport
  impactScore: number
  ai: GenerateResponse | null
  error?: string
}

type VariantsResponse = {
  variants: Variant[]
  inspirationId: string | null
  sourceVibe: string
  sourceAudience: string
  sourcePrompt: string
  sourceIncludePaid: boolean
}

type Phase = "idle" | "loading" | "ready" | "error"

export function MoreLikeThis({ inspirationId }: { inspirationId: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<VariantsResponse | null>(null)
  const [savingMode, setSavingMode] = useState<Variant["mode"] | null>(null)

  async function loadVariants() {
    setPhase("loading")
    setError(null)
    try {
      const res = await fetch("/api/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspirationId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Variants request failed (${res.status})`)
      }
      const json = (await res.json()) as VariantsResponse
      setData(json)
      setPhase("ready")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to generate variants"
      setError(message)
      setPhase("error")
    }
  }

  async function saveVariant(variant: Variant) {
    if (!data || !variant.ai) return
    setSavingMode(variant.mode)
    try {
      // The API returns reasons as Array<{libraryId, why}>, but the stacks
      // table stores them as Record<libraryId, why>. Convert here so the
      // server action stays a thin wrapper around the insert.
      const reasonsRecord: Record<string, string> = {}
      for (const r of variant.ai.reasons ?? []) reasonsRecord[r.libraryId] = r.why

      const result = await saveVariantFromInspiration(inspirationId, {
        prompt: data.sourcePrompt,
        vibe: data.sourceVibe,
        audience: data.sourceAudience,
        performance:
          variant.mode === "performance"
            ? "max"
            : variant.mode === "maximalist"
              ? "rich"
              : "balanced",
        includePaid: data.sourceIncludePaid,
        headline: variant.ai.headline,
        rationale: variant.ai.rationale,
        stackIds: variant.stackIds,
        reasons: reasonsRecord,
        theme: variant.ai.theme as unknown as Record<string, unknown>,
        impactScore: variant.impactScore,
        // perfBudget is gzipped kB total — matches how rebuild-studio.tsx
        // and from-image-studio.tsx persist it elsewhere.
        perfBudget: variant.perfReport.totalKb,
        title: `${variant.label} variant`,
      })
      if ("error" in result) {
        toast.error(result.error)
        setSavingMode(null)
        return
      }
      toast.success("Variant saved")
      router.push(`/s/${result.id}`)
    } catch (e) {
      console.error("[v0] saveVariant error:", e)
      toast.error("Failed to save variant")
      setSavingMode(null)
    }
  }

  return (
    <section
      className="mt-10 border-t border-border/60 pt-8"
      aria-labelledby="more-like-this-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Variants
          </div>
          <h3
            id="more-like-this-heading"
            className="mt-1 text-balance text-xl font-medium leading-tight"
          >
            More like this
          </h3>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            Regenerate the same inspiration in three different directions —
            performance-first, balanced, and maximalist. Save any of them as
            a new stack with full lineage to this capture.
          </p>
        </div>

        {phase === "idle" && (
          <Button onClick={loadVariants} className="shrink-0" data-cursor="hover">
            <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden />
            Generate variants
          </Button>
        )}
        {phase === "loading" && (
          <Button disabled className="shrink-0">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
            Generating…
          </Button>
        )}
        {(phase === "ready" || phase === "error") && (
          <Button
            variant="outline"
            onClick={loadVariants}
            className="shrink-0"
            data-cursor="hover"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden />
            Re-roll variants
          </Button>
        )}
      </div>

      {phase === "error" && error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>{error}</div>
        </div>
      )}

      {phase === "loading" && (
        <div className="mt-6 grid gap-4 md:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl border border-border/60 bg-card/40"
            />
          ))}
        </div>
      )}

      {phase === "ready" && data && (
        <ol className="mt-6 grid gap-4 md:grid-cols-3" role="list">
          {data.variants.map((variant) => (
            <VariantCard
              key={variant.mode}
              variant={variant}
              saving={savingMode === variant.mode}
              disabled={savingMode !== null && savingMode !== variant.mode}
              onSave={() => saveVariant(variant)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Variant card
// ---------------------------------------------------------------------------

function VariantCard({
  variant,
  saving,
  disabled,
  onSave,
}: {
  variant: Variant
  saving: boolean
  disabled: boolean
  onSave: () => void
}) {
  const failed = !variant.ai
  // Pull a few palette swatches off the AI theme. The theme schema mirrors
  // the share-page theme — bg/fg/primary/secondary/accent are the OKLCH
  // strings we want to show as dots.
  const palette = themeSwatches(variant.ai)

  return (
    <li
      className={`relative flex flex-col rounded-xl border bg-card/40 p-4 transition ${
        failed ? "border-destructive/30 bg-destructive/5" : "border-border hover:border-foreground/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {variant.label}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
          title="Estimated impact score"
        >
          {variant.impactScore}
        </span>
      </div>

      <h4 className="mt-2 line-clamp-2 text-balance text-base font-medium leading-snug">
        {failed ? "Couldn't generate this variant" : variant.ai!.headline}
      </h4>

      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
        {failed ? variant.error ?? variant.blurb : variant.ai!.rationale}
      </p>

      {!failed && palette.length > 0 && (
        <div
          className="mt-3 flex items-center gap-1.5"
          aria-label={`Variant palette: ${palette.length} colors`}
        >
          {palette.map((color, i) => (
            <span
              key={`${color}-${i}`}
              className="h-4 w-4 rounded-full border border-border/60"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1" title="Libraries in this variant">
          <Layers className="h-3 w-3" aria-hidden />
          {variant.stackIds.length}
        </span>
        <span className="inline-flex items-center gap-1" title="Estimated bundle size">
          <Gauge className="h-3 w-3" aria-hidden />
          {Math.round(variant.perfReport.totalKb)} kb
        </span>
      </div>

      <div className="mt-auto pt-4">
        <Button
          onClick={onSave}
          disabled={disabled || failed || saving}
          variant={failed ? "outline" : "default"}
          size="sm"
          className="w-full"
          data-cursor="hover"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              Save variant
              <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </li>
  )
}

/**
 * Pull a representative palette out of the generated theme. The keys here
 * mirror `lib/generate-schema.ts:themeSchema` — using `background`/`foreground`
 * (not `bg`/`fg`) which is the actual contract. Anything missing is silently
 * dropped so a partial theme still renders something.
 */
function themeSwatches(ai: GenerateResponse | null): string[] {
  if (!ai?.theme) return []
  const t = ai.theme as Record<string, unknown>
  const order = ["background", "foreground", "primary", "accent", "card", "muted", "border"]
  const out: string[] = []
  for (const key of order) {
    const v = t[key]
    if (typeof v === "string" && v.length > 0) out.push(v)
  }
  return out.slice(0, 5)
}
