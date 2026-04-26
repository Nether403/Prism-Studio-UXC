"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Globe, Loader2, AlertCircle, Sparkles, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SignatureCard } from "@/components/signature-card"
import { VariantPicker, type Variant } from "@/components/variant-picker"
import { toast } from "sonner"
import { saveStack } from "@/app/actions/stack"
import { linkInspirationToStack } from "@/app/actions/inspiration"
import { LIBRARIES } from "@/lib/stack-data"
import {
  signatureToV0DeepLink,
  type Signature,
} from "@/lib/signature"
import type { QuotaStatus } from "@/lib/ratelimit"
import type { ScrapedContent } from "@/lib/scrape"
import { cn } from "@/lib/utils"

type RebuildResult = {
  inspirationId: string
  signature: Signature
  screenshot: { url: string; width: number; height: number } | null
  content: ScrapedContent | null
  watermark: { label: string; sourceHostname: string; disclaimer: string }
  quota: QuotaStatus
  cached: boolean
}

export function RebuildStudio({
  initialQuota,
  initialUrl = "",
}: {
  initialQuota: QuotaStatus
  /**
   * Pre-fill the URL input. Used when the user clicks "Re-rebuild" from a
   * provenance card on /s/[id] — the share page passes ?url=… here so the
   * resume flow lands them ready to submit, not staring at an empty field.
   */
  initialUrl?: string
}) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<RebuildResult | null>(null)
  const [quota, setQuota] = useState<QuotaStatus>(initialQuota)
  const [error, setError] = useState<{ message: string; code?: string } | null>(null)
  const [savingStackFor, setSavingStackFor] = useState<string | null>(null)
  const [isSavePending, startSaveTransition] = useTransition()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!url.trim()) return

    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch("/api/rebuild", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError({
          message: data.error ?? "Rebuild failed.",
          code: data.code,
        })
        if (data.detail?.quota) setQuota(data.detail.quota)
        return
      }
      setResult(data as RebuildResult)
      if (data.quota) setQuota(data.quota)
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Network error." })
    } finally {
      setSubmitting(false)
    }
  }

  function onPickVariant(variant: Variant) {
    if (!result) return
    if (!variant.ai) {
      toast.error("This variant didn't render", {
        description: "Try regenerating the trio.",
      })
      return
    }
    startSaveTransition(async () => {
      setSavingStackFor(variant.mode)
      try {
        const ai = variant.ai!
        const sig = result.signature

        // ai.reasons is Array<{libraryId, why}>; saveStack wants Record<id, why>.
        const reasons: Record<string, string> = {}
        ai.reasons?.forEach((r) => {
          if (r?.libraryId && r.why) reasons[r.libraryId] = r.why
        })

        // Drop any stack ids the LIBRARIES catalog doesn't know about — keeps
        // the saved stack renderable on /s/[id] without surprise blanks.
        const stackIds = variant.stackIds.filter((id) =>
          LIBRARIES.find((l) => l.id === id),
        )

        const performance =
          variant.mode === "performance"
            ? "max"
            : variant.mode === "maximalist"
              ? "rich"
              : "balanced"

        const headline = ai.headline ?? sig.vibeStatement

        const res = await saveStack({
          prompt: sig.brief,
          vibe: sig.vibe,
          audience: sig.audience,
          performance,
          includePaid: true,
          headline,
          rationale: ai.rationale ?? "",
          stackIds,
          reasons,
          theme: ai.theme as Record<string, unknown>,
          impactScore: variant.impactScore,
          perfBudget: variant.perfReport.totalKb,
          asDraft: true,
          title: headline,
        })

        if ("error" in res) {
          toast.error("Couldn't save", { description: res.error })
          return
        }

        if (result.inspirationId) {
          await linkInspirationToStack(result.inspirationId, res.id).catch(() => null)
        }

        toast.success("Saved to your dashboard")
        router.push(`/s/${res.id}`)
      } finally {
        setSavingStackFor(null)
      }
    })
  }

  return (
    <div className="space-y-10">
      {/* URL input + quota meter */}
      <div className="rounded-2xl border border-border bg-card/40 p-5 md:p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 pl-10 font-mono text-sm"
              disabled={submitting}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting || !url.trim() || !quota.ok}
            className="h-12 gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Capturing
              </>
            ) : (
              <>
                Rebuild <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <QuotaMeter quota={quota} />

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">{error.message}</div>
              {error.code && (
                <div className="mt-0.5 font-mono text-xs opacity-70">{error.code}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {submitting && !result && <CaptureSkeleton />}

      {/* Result */}
      {result && (
        <div className="space-y-8">
          {/* Side-by-side: original | reinterpretation */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <OriginalPanel
              screenshot={result.screenshot}
              hostname={result.watermark.sourceHostname}
            />
            <ReinterpretationPanel
              signature={result.signature}
              hostname={result.watermark.sourceHostname}
              disclaimer={result.watermark.disclaimer}
              cached={result.cached}
            />
          </div>

          {/* Signature card — full width below */}
          <SignatureCard signature={result.signature} />

          {/* Variant trio */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-serif text-2xl">Three directions</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each tunes the recommended stack to a different performance
                  ceiling. Pick one to save as a stack.
                </p>
              </div>
              {savingStackFor && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 font-mono text-xs">
                  <Loader2 className="size-3 animate-spin" />
                  Saving {savingStackFor}…
                </span>
              )}
            </div>

            <VariantPicker
              prompt={result.signature.brief}
              vibe={result.signature.vibe}
              audience={result.signature.audience}
              includePaid={true}
              onPick={onPickVariant}
            />
          </div>

          {/* Hand-off CTA */}
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-card/40 p-5 md:flex-row md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Hand-off
              </p>
              <h3 className="mt-1 font-serif text-lg">Continue this redesign in v0</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Open the brief as a v0 prompt with one click.
              </p>
            </div>
            <a
              href={signatureToV0DeepLink(result.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
            >
              <Sparkles className="size-4" /> Open in v0
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function QuotaMeter({ quota }: { quota: QuotaStatus }) {
  const pct = Math.min(100, (quota.used / quota.limit) * 100)
  const danger = quota.remaining === 0
  const warning = quota.remaining <= 2 && quota.remaining > 0
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider">
        <span className="text-muted-foreground">Daily rebuilds</span>
        <span
          className={cn(
            "tabular-nums",
            danger && "text-destructive",
            warning && "text-amber-600 dark:text-amber-400",
            !danger && !warning && "text-muted-foreground",
          )}
        >
          {quota.used} / {quota.limit}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-500",
            danger ? "bg-destructive" : warning ? "bg-amber-500" : "bg-foreground",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {danger && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" />
          Quota resets at {new Date(quota.resetAt).toLocaleTimeString()}.
        </p>
      )}
    </div>
  )
}

function CaptureSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="aspect-[16/10] animate-pulse rounded-xl border border-border bg-muted/40" />
      <div className="aspect-[16/10] animate-pulse rounded-xl border border-border bg-muted/40" />
    </div>
  )
}

function OriginalPanel({
  screenshot,
  hostname,
}: {
  screenshot: { url: string; width: number; height: number } | null
  hostname: string
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>Original</span>
        <span className="truncate">{hostname}</span>
      </figcaption>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Mock browser chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
            {hostname}
          </span>
        </div>
        {screenshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshot.url}
            alt={`Captured screenshot of ${hostname}`}
            className="block aspect-[16/10] w-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center text-sm text-muted-foreground">
            Capture unavailable
          </div>
        )}
      </div>
    </figure>
  )
}

function ReinterpretationPanel({
  signature,
  hostname,
  disclaimer,
  cached,
}: {
  signature: Signature
  hostname: string
  disclaimer: string
  cached: boolean
}) {
  const bg = signature.palette.find((p) => p.role === "bg")?.hex ?? "#0b0b0c"
  const fg = signature.palette.find((p) => p.role === "fg")?.hex ?? "#f5f5f5"
  const accent = signature.palette.find((p) => p.role === "accent")?.hex ?? "#7aff8a"
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{cached ? "Prism reinterpretation · cached" : "Prism reinterpretation"}</span>
        <span>{signature.vibe} · {signature.layoutPattern}</span>
      </figcaption>
      <div
        className="aspect-[16/10] overflow-hidden rounded-xl border border-border"
        style={{ backgroundColor: bg, color: fg }}
      >
        <div className="flex h-full flex-col justify-between p-6 md:p-8">
          <div className="flex items-center justify-between text-[11px] opacity-80">
            <span className="font-mono uppercase tracking-[0.18em]">{hostname}</span>
            <span className="font-mono">prism / reinterpretation</span>
          </div>
          <div className="space-y-3">
            <p
              className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70"
            >
              {signature.vibeStatement}
            </p>
            <h3
              className="text-balance text-2xl leading-[1.05] md:text-4xl"
              style={{ fontFamily: "serif" }}
            >
              {signature.contentSignature}
            </h3>
            <p className="max-w-md text-sm leading-relaxed opacity-80">
              {signature.audienceStatement}
            </p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
              style={{ backgroundColor: accent, color: bg }}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: bg }} />
              {signature.audience}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {disclaimer}
      </p>
    </figure>
  )
}
