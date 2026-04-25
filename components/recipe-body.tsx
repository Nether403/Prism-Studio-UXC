"use client"

import { useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ExternalLink, Sparkles, Gauge } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PreviewPane } from "@/components/preview-pane"
import { LibraryDemo } from "@/components/library-demo"
import { ExportActions } from "@/components/export-actions"
import type { Recipe } from "@/lib/recipes"
import type { Recommendation } from "@/lib/recommend"
import type { ExportInput } from "@/lib/exporters"
import { cn } from "@/lib/utils"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

export function RecipeBody({
  recipe,
  recommendation,
}: {
  recipe: Recipe
  recommendation: Recommendation
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".recipe-fade", {
        opacity: 0,
        y: 24,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 75%",
        },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  const exportInput: ExportInput = useMemo(
    () => ({
      headline: recipe.headline,
      rationale: recipe.rationale,
      brief: recipe.input.prompt,
      vibe: recipe.input.vibe,
      audience: recipe.input.audience,
      stack: recommendation.stack.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        tagline: s.tagline,
        url: s.url,
      })),
      reasons: recipe.reasons,
      theme: recipe.theme,
    }),
    [recipe, recommendation],
  )

  return (
    <section id="preview" ref={ref} className="relative bg-background/95 py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Headline + meters */}
        <div className="recipe-fade grid gap-10 md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Headline
            </div>
          </div>
          <div className="md:col-span-9">
            <h2 className="text-balance font-display text-3xl md:text-5xl leading-tight tracking-tight">
              {recipe.headline}
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed">
              {recipe.rationale}
            </p>
          </div>
        </div>

        {/* Meters */}
        <div className="recipe-fade mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
          <Meter
            label="Visual impact"
            value={recommendation.impactScore}
            icon={<Sparkles className="h-3 w-3" />}
            tone="primary"
          />
          <Meter
            label="Performance load"
            value={recommendation.perfBudget}
            icon={<Gauge className="h-3 w-3" />}
            tone="muted"
          />
        </div>

        {/* Live preview */}
        <div className="recipe-fade mt-12">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Live preview
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              tokens · type · motion
            </span>
          </div>
          <PreviewPane
            theme={recipe.theme}
            stackIds={recommendation.stack.map((s) => s.id)}
            brandName={recipe.theme.name}
            defaultTab={recipe.defaultPreview}
          />
        </div>

        {/* Stack */}
        <div className="recipe-fade mt-16">
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                The stack
              </div>
              <h3 className="mt-2 font-display text-2xl md:text-3xl tracking-tight">
                {recommendation.stack.length} libraries, with intent
              </h3>
            </div>
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:inline">
              hover for live demo
            </span>
          </div>

          <div className="space-y-3">
            {recommendation.stack.map((lib, i) => (
              <Card
                key={lib.id}
                className="relative overflow-hidden border-border bg-card/50 p-5 transition-colors hover:bg-card/80 md:p-6"
              >
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="flex shrink-0 flex-col items-center pt-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Link
                        href={`/library/${lib.id}`}
                        data-cursor="hover"
                        className="font-display text-xl md:text-2xl tracking-tight underline-offset-4 hover:underline"
                      >
                        {lib.name}
                      </Link>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {lib.category}
                      </span>
                      {lib.requiresAccount && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                          Account
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{lib.tagline}</p>
                    {recipe.reasons[lib.id] && (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                          Why this
                        </span>{" "}
                        — {recipe.reasons[lib.id]}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <a
                      href={lib.url}
                      target="_blank"
                      rel="noreferrer"
                      data-cursor="hover"
                      className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      aria-label={`Open ${lib.name} docs`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <LibraryDemo
                      id={lib.id}
                      category={lib.category}
                      className="hidden h-16 w-28 sm:block"
                    />
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Impact
                      </div>
                      <div className="font-mono text-sm tabular-nums">{lib.impact}/10</div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="recipe-fade mt-16">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Take it with you
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              v0 · zip · stackblitz
            </span>
          </div>
          <div className="rounded-lg border border-border bg-card/40 p-4">
            <ExportActions input={exportInput} ready={true} />
            <p className="mt-3 text-xs text-muted-foreground">
              The starter ships a Next.js app with the recipe&apos;s theme, fonts, and the libraries
              above already wired up.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Meter({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: "primary" | "muted"
}) {
  return (
    <div className="bg-background p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-mono text-2xl tabular-nums">{value}</span>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            tone === "primary" ? "bg-primary" : "bg-foreground/60",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
