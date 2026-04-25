"use client"

import { useMemo } from "react"
import { Sparkles, Gauge, Eye, Info, Check, X } from "lucide-react"
import { computePerfReport, describePerf, type PerfGrade } from "@/lib/bundle-sizes"
import { checkContrast, type ContrastGrade } from "@/lib/contrast"
import type { Theme } from "@/lib/themes"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type RealMetricsProps = {
  /** Recommendation impact score 0-100, computed in lib/recommend. */
  impactScore: number
  /** Library ids in the chosen stack. */
  stackIds: string[]
  /** Active theme (for contrast checks). */
  theme: Theme
  /** Compact density variant. */
  compact?: boolean
}

const GRADE_TONE: Record<PerfGrade, { label: string; tone: "ok" | "warn" | "bad" }> = {
  A: { label: "Lean", tone: "ok" },
  B: { label: "Healthy", tone: "ok" },
  C: { label: "Heavy", tone: "warn" },
  D: { label: "Very heavy", tone: "bad" },
}

const A11Y_TONE: Record<ContrastGrade, "ok" | "warn" | "bad"> = {
  AAA: "ok",
  AA: "ok",
  "AA-large": "warn",
  fail: "bad",
}

export function RealMetrics({ impactScore, stackIds, theme, compact = false }: RealMetricsProps) {
  const perf = useMemo(() => computePerfReport(stackIds), [stackIds])
  const perfTone = GRADE_TONE[perf.grade]

  const fgBg = useMemo(() => checkContrast(theme.foreground, theme.background), [theme])
  const primaryBg = useMemo(() => checkContrast(theme.primaryForeground, theme.primary), [theme])
  const worstGrade: ContrastGrade = (() => {
    const order: ContrastGrade[] = ["AAA", "AA", "AA-large", "fail"]
    const a = order.indexOf(fgBg.grade)
    const b = order.indexOf(primaryBg.grade)
    return order[Math.max(a, b)]
  })()
  const a11yTone = A11Y_TONE[worstGrade]

  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn("grid gap-3", compact ? "grid-cols-3" : "md:grid-cols-3 grid-cols-1")}>
        <MetricCard
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Visual impact"
          tone="ok"
          accent="primary"
          headline={`${impactScore}`}
          unit="/ 100"
          bar={impactScore}
        />

        <MetricCard
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Real bundle"
          tone={perfTone.tone}
          accent="accent"
          headline={`${perf.totalKb}`}
          unit="kB gz"
          // Bar fills proportional to a 400 kB ceiling
          bar={Math.min(100, Math.round((perf.totalKb / 400) * 100))}
          info={
            <div className="space-y-1.5">
              <div className="font-medium text-foreground">{describePerf(perf)}</div>
              <div className="text-muted-foreground">
                Sum of published gzipped sizes for the libraries in this stack. Build-time and
                copy-into-codebase tools (Tailwind, shadcn) count as 0.
              </div>
              <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {perf.entries.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 font-mono text-[10px]">
                    <span className="truncate text-muted-foreground">
                      {e.id}
                      {!e.known && " (est.)"}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {e.kb === 0 ? "build-time" : `${e.kb} kB`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          }
          badge={perfTone.label}
        />

        <MetricCard
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Contrast"
          tone={a11yTone}
          accent="primary"
          headline={fgBg.ratioLabel}
          unit={`WCAG ${worstGrade}`}
          bar={Math.min(100, Math.round((Math.min(fgBg.ratio, 21) / 21) * 100))}
          info={
            <div className="space-y-2">
              <div className="font-medium text-foreground">WCAG contrast checks</div>
              <div className="grid gap-2">
                <ContrastRow
                  swatchFg={theme.foreground}
                  swatchBg={theme.background}
                  label="Body text on background"
                  ratioLabel={fgBg.ratioLabel}
                  grade={fgBg.grade}
                />
                <ContrastRow
                  swatchFg={theme.primaryForeground}
                  swatchBg={theme.primary}
                  label="Primary button"
                  ratioLabel={primaryBg.ratioLabel}
                  grade={primaryBg.grade}
                />
              </div>
              <div className="pt-1 text-[10px] text-muted-foreground">
                AAA ≥ 7:1 · AA ≥ 4.5:1 · AA-large ≥ 3:1.
              </div>
            </div>
          }
          badge={worstGrade === "fail" ? "Fails AA" : worstGrade}
        />
      </div>
    </TooltipProvider>
  )
}

function MetricCard({
  icon,
  label,
  headline,
  unit,
  bar,
  tone,
  accent,
  info,
  badge,
}: {
  icon: React.ReactNode
  label: string
  headline: string
  unit?: string
  bar: number
  tone: "ok" | "warn" | "bad"
  accent: "primary" | "accent"
  info?: React.ReactNode
  badge?: string
}) {
  const toneColor =
    tone === "ok"
      ? "text-foreground"
      : tone === "warn"
        ? "text-[oklch(0.78_0.16_70)]"
        : "text-[oklch(0.7_0.22_25)]"

  const barColor = accent === "primary" ? "bg-primary" : "bg-accent"

  return (
    <div className="result-summary rounded-md border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`${label} details`}
                className="text-muted-foreground transition hover:text-foreground"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="end"
              className="max-w-xs border border-border bg-card text-xs leading-relaxed"
            >
              {info}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn("text-3xl font-medium tabular-nums tracking-tight", toneColor)}>
          {headline}
        </span>
        {unit && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        )}
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("meter-bar h-full origin-left rounded-full", barColor)}
          style={{ width: `${Math.max(2, bar)}%` }}
        />
      </div>

      {badge && (
        <div className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {tone === "ok" ? (
            <Check className="h-2.5 w-2.5 text-primary" />
          ) : tone === "bad" ? (
            <X className="h-2.5 w-2.5 text-[oklch(0.7_0.22_25)]" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.16_70)]" />
          )}
          {badge}
        </div>
      )}
    </div>
  )
}

function ContrastRow({
  swatchFg,
  swatchBg,
  label,
  ratioLabel,
  grade,
}: {
  swatchFg: string
  swatchBg: string
  label: string
  ratioLabel: string
  grade: ContrastGrade
}) {
  const tone = A11Y_TONE[grade]
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid h-7 w-12 place-items-center rounded border border-border font-mono text-[9px]"
        style={{ background: swatchBg, color: swatchFg }}
      >
        Aa
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] text-foreground">{label}</div>
        <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {ratioLabel} ·{" "}
          <span
            className={cn(
              tone === "ok" && "text-foreground",
              tone === "warn" && "text-[oklch(0.78_0.16_70)]",
              tone === "bad" && "text-[oklch(0.7_0.22_25)]",
            )}
          >
            {grade}
          </span>
        </div>
      </div>
    </div>
  )
}
