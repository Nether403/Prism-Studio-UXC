"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const PILLARS = [
  {
    title: "Real-time WebGL",
    body:
      "Three.js and React Three Fiber drive declarative 3D — physically-based materials, post-processing, instanced meshes. WebGPU when the browser allows.",
    metric: "60fps",
    metricLabel: "target frame budget",
  },
  {
    title: "Timeline-grade motion",
    body:
      "GSAP timelines orchestrate scroll-driven sequences with frame-perfect control. Lenis stitches every pin, snap and parallax into one fluid surface.",
    metric: "0ms",
    metricLabel: "scroll jank",
  },
  {
    title: "Production-ready surface",
    body:
      "Shadcn/ui on Radix gives you accessible, themable primitives. Tailwind keeps the CSS payload tiny and tokens consistent across breakpoints.",
    metric: "AA+",
    metricLabel: "accessibility baseline",
  },
  {
    title: "Modern Next.js architecture",
    body:
      "App Router with React Server Components, streaming, edge-ready. Dynamic and static routes co-exist; every page is SEO and Core Web Vitals tuned.",
    metric: "<3s",
    metricLabel: "first contentful paint",
  },
]

export function Capabilities() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".pillar").forEach((el, i) => {
        gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          delay: i * 0.05,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      })
      gsap.utils.toArray<HTMLElement>(".pillar-num").forEach((num) => {
        gsap.from(num, {
          textContent: 0,
          duration: 1.5,
          ease: "power3.out",
          snap: { textContent: 1 },
          scrollTrigger: {
            trigger: num,
            start: "top 85%",
            toggleActions: "play none none reset",
          },
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="docs" ref={root} className="relative py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span className="text-primary">05</span>
              <span className="h-px w-8 bg-border" />
              <span>Capabilities</span>
            </div>
            <h2 className="mt-4 font-display text-5xl md:text-6xl tracking-[-0.03em] leading-[0.95] text-balance">
              Cutting-edge,{" "}
              <em className="italic text-muted-foreground">
                without
                <br />
                the cuts.
              </em>
            </h2>
            <p className="mt-6 text-muted-foreground text-lg max-w-md text-pretty">
              Every Prism stack ships against the same four pillars — visual, motion, surface,
              architecture. Tuned, never overbuilt.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-px bg-border">
            {PILLARS.map((p, i) => (
              <article key={i} className="pillar bg-background p-8 md:p-10">
                <div className="flex items-start justify-between gap-6">
                  <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} / {String(PILLARS.length).padStart(2, "0")}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-4xl md:text-5xl tracking-tight text-primary">
                      {p.metric}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                      {p.metricLabel}
                    </div>
                  </div>
                </div>
                <h3 className="mt-6 font-display text-3xl md:text-4xl tracking-tight">{p.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed max-w-xl text-pretty">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
