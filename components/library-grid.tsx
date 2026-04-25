"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { LIBRARIES } from "@/lib/stack-data"
import { Lock } from "lucide-react"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const CATEGORY_LABELS: Record<string, string> = {
  framework: "Framework",
  "3d": "3D / WebGL",
  motion: "Motion",
  ui: "UI surface",
  styling: "Styling",
  scroll: "Scroll",
  ai: "AI",
  components: "Components",
  assets: "Assets",
}

export function LibraryGrid() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".lib-row").forEach((row) => {
        gsap.from(row, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: row,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="libraries" ref={root} className="relative py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span className="text-primary">03</span>
              <span className="h-px w-8 bg-border" />
              <span>Library index</span>
            </div>
            <h2 className="mt-4 font-display text-5xl md:text-7xl tracking-[-0.03em] leading-[0.95] text-balance">
              The full catalog,{" "}
              <em className="italic text-muted-foreground">curated</em>.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md text-pretty">
            Every library Prism considers. Each one scored on visual ceiling, performance load,
            and category fit. Tap to read the docs.
          </p>
        </div>

        <div className="mt-14 border-t border-border">
          {LIBRARIES.map((lib, i) => (
            <a
              key={lib.id}
              href={lib.url}
              target="_blank"
              rel="noreferrer"
              data-cursor="hover"
              className="lib-row group relative grid grid-cols-12 items-center gap-4 border-b border-border py-5 md:py-7 transition-colors hover:bg-card/40"
            >
              <span className="col-span-1 font-mono text-xs text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="col-span-11 md:col-span-4 flex items-center gap-2 flex-wrap">
                <span className="font-display text-2xl md:text-3xl tracking-tight transition-colors group-hover:text-primary">
                  {lib.name}
                </span>
                {lib.requiresAuth && <Lock className="h-3 w-3 text-muted-foreground" />}
              </div>
              <span className="col-span-6 md:col-span-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {CATEGORY_LABELS[lib.category]}
              </span>
              <span className="col-span-6 md:col-span-3 hidden md:block text-sm text-muted-foreground truncate">
                {lib.tagline}
              </span>
              <span className="col-span-12 md:col-span-1 flex items-center justify-end gap-1 font-mono text-xs">
                <span className="text-muted-foreground">impact</span>
                <span className="tabular-nums">{lib.impact}</span>
                <span className="ml-1 inline-flex h-1.5 gap-0.5">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <span
                      key={j}
                      className={`h-1.5 w-0.5 rounded-full ${
                        j < lib.impact ? "bg-primary" : "bg-border"
                      }`}
                    />
                  ))}
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
