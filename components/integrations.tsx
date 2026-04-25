"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Plug, Sparkles, Boxes, Image as ImageIcon, Brain } from "lucide-react"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const INTEGRATIONS = [
  {
    name: "v0 by Vercel",
    description: "Generate React + shadcn components from prompts. Sign in to publish straight to a Vercel project.",
    icon: Sparkles,
    auth: true,
    tier: "freemium",
    color: "primary",
  },
  {
    name: "Spline",
    description: "Designer-friendly 3D scenes. Export a runtime URL and Prism wires it into your hero.",
    icon: Boxes,
    auth: true,
    tier: "freemium",
    color: "accent",
  },
  {
    name: "Figma API",
    description: "Sync design tokens and components from your team library directly into the Tailwind theme.",
    icon: ImageIcon,
    auth: true,
    tier: "freemium",
    color: "primary",
  },
  {
    name: "AI SDK + Gateway",
    description: "Stream text, images, structured output. Zero-config providers (OpenAI, Anthropic, Google).",
    icon: Brain,
    auth: true,
    tier: "freemium",
    color: "accent",
  },
  {
    name: "shadcn registry",
    description: "Pull in any registry — your own, or community. Components stay in your codebase.",
    icon: Plug,
    auth: false,
    tier: "free",
    color: "primary",
  },
  {
    name: "LottieFiles",
    description: "Browse free vector animations and drop them onto any section with one click.",
    icon: Sparkles,
    auth: false,
    tier: "free",
    color: "accent",
  },
]

export function Integrations() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".integration").forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section
      id="integrations"
      ref={root}
      className="relative py-24 md:py-32 border-t border-border bg-gradient-to-b from-background to-card/30"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span className="text-primary">04</span>
            <span className="h-px w-8 bg-border" />
            <span>Integrations</span>
          </div>
          <h2 className="mt-4 font-display text-5xl md:text-7xl tracking-[-0.03em] leading-[0.95] text-balance">
            One studio. <em className="italic text-primary">Every</em> source.
          </h2>
          <p className="mt-6 text-muted-foreground text-lg max-w-xl text-pretty">
            Free APIs are wired in by default. Optional integrations unlock with a single sign-in
            — credentials stay in your Vercel project.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((it) => (
            <Card key={it.name} className="integration relative p-6 group hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border border-border ${
                    it.color === "primary" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                  }`}
                >
                  <it.icon className="h-5 w-5" />
                </div>
                {it.auth && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" />
                    auth
                  </span>
                )}
              </div>
              <h3 className="mt-5 font-display text-2xl tracking-tight">{it.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-pretty">
                {it.description}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] uppercase tracking-wider ${
                    it.tier === "free" ? "border-border text-muted-foreground" : "border-accent/40 text-accent"
                  }`}
                >
                  {it.tier}
                </Badge>
                <button className="text-xs text-muted-foreground hover:text-foreground transition">
                  {it.auth ? "Connect →" : "Enabled →"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
