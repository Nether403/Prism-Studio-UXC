"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ArrowDown } from "lucide-react"

export function Hero() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.from(".hero-eyebrow", {
        y: 20,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      })
      gsap.from(".hero-line", {
        y: 80,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out",
        stagger: 0.08,
        delay: 0.1,
      })
      gsap.from(".hero-sub", {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        delay: 0.5,
      })
      gsap.from(".hero-meta", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.06,
        delay: 0.7,
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section
      id="top"
      ref={root}
      className="relative min-h-[100svh] overflow-hidden grain"
    >
      {/* Top gradient & vignette (the WebGL scene lives globally) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_85%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 pt-36 pb-24 md:pt-44 md:pb-32">
        <div className="max-w-4xl">
          <div className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/40 backdrop-blur px-3 py-1 text-xs font-mono tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            v1.0 · UX curator
          </div>

          <h1 className="mt-8 font-display text-[clamp(3rem,9vw,8.5rem)] leading-[0.92] tracking-[-0.04em] text-balance">
            <span className="hero-line block">Curate interfaces</span>
            <span className="hero-line block">
              from a <em className="italic font-display text-primary">single</em> brief
            </span>
            <span className="hero-line block text-muted-foreground">— stack and all.</span>
          </h1>

          <p className="hero-sub mt-8 max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed text-pretty">
            UXC reads your brief and assembles the most visually striking combination of
            best-in-class libraries — Three.js, GSAP, Shadcn, Tailwind, Lenis, Next.js — tuned
            for impact, performance, and your vibe.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 font-mono text-xs text-muted-foreground uppercase tracking-widest">
            <span className="hero-meta">WebGL · WebGPU</span>
            <span className="hero-meta">GSAP timelines</span>
            <span className="hero-meta">Lenis scroll</span>
            <span className="hero-meta">Shadcn surface</span>
            <span className="hero-meta">Next.js 16</span>
          </div>
        </div>

        <a
          href="#generator"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
        >
          <span>Begin</span>
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </a>
      </div>

      {/* Side rules */}
      <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 [writing-mode:vertical-rl]">
        <span>{"// composing(stack)"}</span>
        <span className="h-12 w-px bg-border" />
        <span>RT 60fps</span>
      </div>
      <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 [writing-mode:vertical-rl]">
        <span>N 51.5074</span>
        <span className="h-12 w-px bg-border" />
        <span>W 0.1278</span>
      </div>
    </section>
  )
}
