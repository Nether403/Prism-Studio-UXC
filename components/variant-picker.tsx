"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Layers, Loader2, Wand2, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LIBRARIES } from "@/lib/stack-data"
import type { GenerateResponse, GenerateTheme } from "@/lib/generate-schema"
import type { Theme } from "@/lib/themes"
import type { computePerfReport } from "@/lib/bundle-sizes"
import type { Audience, Vibe } from "@/lib/recommend"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"

export type Variant = {
  mode: "performance" | "balanced" | "maximalist"
  label: string
  blurb: string
  stackIds: string[]
  perfReport: ReturnType<typeof computePerfReport>
  impactScore: number
  ai: GenerateResponse | null
  error?: string
}

export type VariantPickerProps = {
  prompt: string
  vibe: Vibe
  audience: Audience
  includePaid: boolean
  disabled?: boolean
  onPick: (v: Variant) => void
}

function aiThemeToTheme(t: GenerateTheme): Theme {
  return {
    name: t.name,
    background: t.background,
    foreground: t.foreground,
    card: t.card,
    primary: t.primary,
    primaryForeground: t.primaryForeground,
    accent: t.accent,
    muted: t.muted,
    mutedForeground: t.mutedForeground,
    border: t.border,
    displayFont: t.displayFont,
    displayItalic: t.displayItalic,
    bodyFont: t.bodyFont,
    radius: t.radius,
    motto: t.motto,
  }
}

export function VariantPicker({ prompt, vibe, audience, includePaid, disabled = false, onPick }: VariantPickerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const requestId = useRef(0)

  // Track mount state for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  async function start() {
    if (disabled) return
    setOpen(true)
    if (variants || loading) return
    setLoading(true)
    setError(null)
    const id = ++requestId.current
    try {
      const res = await fetch("/api/variants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, vibe, audience, includePaid }),
      })
      if (!res.ok) throw new Error("Variants request failed")
      const data = (await res.json()) as { variants: Variant[] }
      if (id === requestId.current) setVariants(data.variants)
    } catch (e) {
      if (id === requestId.current) setError("Could not generate variants.")
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  function refresh() {
    requestId.current += 1
    setVariants(null)
    start()
  }

  // Close on escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={start}
        disabled={disabled || prompt.trim().length < 6}
        className="h-12 gap-2"
        data-cursor="hover"
      >
        <Layers className="h-4 w-4" />
        {disabled ? "Sign in for variants" : "Generate 3 variants"}
      </Button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4 md:p-8"
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false)
              }}
            >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg border border-border bg-card shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Variants
                  </span>
                  <span className="font-display text-base ml-1">— pick the one that fits</span>
                </div>
                <div className="flex items-center gap-2">
                  {variants && !loading && (
                    <Button size="sm" variant="ghost" onClick={refresh} className="h-8">
                      <Wand2 className="h-3.5 w-3.5" />
                      Re-roll
                    </Button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5 md:p-6">
                {loading && (
                  <div className="grid gap-4 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-[420px] animate-pulse rounded-lg border border-border bg-muted/30"
                      />
                    ))}
                  </div>
                )}

                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {variants && !loading && (
                  <div className="grid gap-4 md:grid-cols-3">
                    {variants.map((v) => (
                      <VariantCard
                        key={v.mode}
                        variant={v}
                        onPick={() => {
                          onPick(v)
                          setOpen(false)
                        }}
                      />
                    ))}
                  </div>
                )}

                {!loading && !variants && !error && (
                  <div className="flex min-h-[300px] items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Composing three directions
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

function VariantCard({ variant, onPick }: { variant: Variant; onPick: () => void }) {
  const theme = variant.ai?.theme ? aiThemeToTheme(variant.ai.theme as GenerateTheme) : null
  const stackLibs = variant.stackIds
    .map((id) => LIBRARIES.find((l) => l.id === id))
    .filter((l): l is (typeof LIBRARIES)[number] => Boolean(l))

  const gradeTone =
    variant.perfReport.grade === "A" || variant.perfReport.grade === "B"
      ? "text-foreground"
      : variant.perfReport.grade === "C"
        ? "text-[oklch(0.78_0.16_70)]"
        : "text-[oklch(0.7_0.22_25)]"

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary/40">
      {/* Theme strip */}
      {theme ? (
        <div
          className="relative h-32 overflow-hidden"
          style={
            {
              background: theme.background,
              color: theme.foreground,
              "--card-primary": theme.primary,
              "--card-fg": theme.foreground,
              "--card-bg": theme.background,
            } as React.CSSProperties
          }
        >
          <div className="absolute inset-0 grid grid-cols-5">
            <div style={{ background: theme.background }} />
            <div style={{ background: theme.card }} />
            <div style={{ background: theme.muted }} />
            <div style={{ background: theme.primary }} />
            <div style={{ background: theme.accent }} />
          </div>
          <div className="absolute inset-0 flex items-end p-3">
            <span
              className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
              style={{
                background: theme.background,
                color: theme.foreground,
                border: `1px solid ${theme.border}`,
              }}
            >
              {theme.name}
            </span>
          </div>
        </div>
      ) : (
        <div className="h-32 bg-muted/30 grid place-items-center">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            no theme
          </span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex flex-col gap-3 p-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            {variant.label}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{variant.blurb}</div>
        </div>

        {variant.ai?.headline ? (
          <h3 className="font-display text-xl tracking-[-0.01em] leading-snug text-pretty">
            {variant.ai.headline}
          </h3>
        ) : variant.error ? (
          <p className="text-xs text-destructive">{variant.error}</p>
        ) : null}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-background/40 p-2">
          <Stat label="Impact" value={`${variant.impactScore}`} />
          <Stat
            label="Bundle"
            value={`${variant.perfReport.totalKb} kB`}
            tone={gradeTone}
          />
          <Stat label="Grade" value={variant.perfReport.grade} tone={gradeTone} />
        </div>

        {/* Libraries */}
        <div className="flex flex-wrap gap-1">
          {stackLibs.slice(0, 6).map((lib) => (
            <span
              key={lib.id}
              className="rounded-full border border-border bg-background/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {lib.name}
            </span>
          ))}
          {stackLibs.length > 6 && (
            <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              +{stackLibs.length - 6}
            </span>
          )}
        </div>

        <Button
          onClick={onPick}
          disabled={!variant.ai}
          className={cn("mt-auto h-10")}
          data-cursor="hover"
        >
          Use this variant
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-sm tabular-nums font-medium", tone ?? "text-foreground")}>
        {value}
      </div>
    </div>
  )
}
