"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Heart, Palette, Sparkles, Gauge } from "lucide-react"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { usePrismTheme } from "@/components/prism-theme-provider"
import { DEFAULT_THEME, type Theme } from "@/lib/themes"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

export type GalleryItem = {
  id: string
  headline: string
  prompt: string
  vibe: string
  impactScore: number
  perfBudget: number
  likes: number
  theme: Theme
  stackNames: string[]
  createdAt: string
}

function safeTheme(t: Partial<Theme> | null | undefined): Theme {
  // Be defensive: AI-generated themes may have malformed values from earlier saves.
  return {
    ...DEFAULT_THEME,
    ...(t ?? {}),
  }
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export function GalleryGrid({ stacks }: { stacks: GalleryItem[] }) {
  const root = useRef<HTMLDivElement>(null)
  const { setTheme } = usePrismTheme()

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".gallery-card").forEach((el, i) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          delay: (i % 3) * 0.05,
          scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none reverse" },
        })
      })
    }, root)
    return () => ctx.revert()
  }, [stacks.length])

  return (
    <div ref={root} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stacks.map((s) => {
        const t = safeTheme(s.theme)
        return (
          <Card
            key={s.id}
            className="gallery-card group relative flex flex-col overflow-hidden p-0 transition-colors hover:border-primary/40"
            data-cursor="hover"
          >
            {/* Theme preview strip — uses the ACTUAL saved theme tokens */}
            <div
              className="relative h-32 overflow-hidden border-b border-border"
              style={{ background: t.background, color: t.foreground }}
            >
              <div className="absolute inset-0 grid grid-cols-5">
                <div style={{ background: t.background }} />
                <div style={{ background: t.card }} />
                <div style={{ background: t.muted }} />
                <div style={{ background: t.accent }} />
                <div style={{ background: t.primary }} />
              </div>
              <div className="absolute inset-0 flex items-end p-4">
                <div
                  className="font-display text-2xl tracking-[-0.02em] leading-tight max-w-[80%] text-balance"
                  style={{ color: t.foreground, fontStyle: t.displayItalic ? "italic" : "normal" }}
                >
                  {t.name || "Theme"}
                </div>
              </div>
              <div className="absolute right-3 top-3 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                style={{ background: t.primary, color: t.primaryForeground }}>
                Aa
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="text-primary">/{s.id}</span>
                <span>·</span>
                <span>{s.vibe}</span>
                <span>·</span>
                <span>{timeAgo(s.createdAt)}</span>
              </div>
              <h3 className="mt-2 font-display text-xl tracking-tight leading-snug text-balance">
                {s.headline}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground text-pretty">
                {s.prompt}
              </p>

              <div className="mt-3 flex flex-wrap gap-1">
                {s.stackNames.slice(0, 5).map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {n}
                  </span>
                ))}
                {s.stackNames.length > 5 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    +{s.stackNames.length - 5}
                  </span>
                )}
              </div>

              <div className="mt-auto pt-5 flex items-center gap-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {s.impactScore}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-accent" />
                  {s.perfBudget}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {s.likes}
                </span>
                <div className="ml-auto flex items-center gap-1 relative z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setTheme(t)
                      toast.success(`Applied "${t.name}"`)
                    }}
                    className="rounded-full border border-border px-2 py-1 hover:border-primary/50 hover:text-foreground transition"
                    aria-label={`Apply ${t.name} theme`}
                  >
                    <Palette className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Full-card link via stretched anchor */}
            <Link
              href={`/s/${s.id}`}
              className="absolute inset-0 z-10"
              aria-label={`Open stack ${s.headline}`}
            />
          </Card>
        )
      })}
    </div>
  )
}
