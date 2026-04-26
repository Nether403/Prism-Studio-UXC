"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import gsap from "gsap"
import { motion, AnimatePresence } from "motion/react"
import { ArrowRight, Check, Sparkles, Star, Quote, Zap, Mail, Lock as LockIcon } from "lucide-react"
import type { Theme } from "@/lib/themes"
import { cn } from "@/lib/utils"

const PreviewOrb = dynamic(() => import("./demos/r3f-orb").then((m) => m.R3FOrbDemo), {
  ssr: false,
  loading: () => null,
})

type Tab = "hero" | "pricing" | "form" | "editorial"

type PreviewPaneProps = {
  theme: Theme
  /** Stack ids — used to decide which motion + 3D affordances to demo */
  stackIds: string[]
  /** A short copy hint that personalizes the preview headline */
  brandName?: string
  defaultTab?: Tab
  className?: string
}

export function PreviewPane({
  theme,
  stackIds,
  brandName,
  defaultTab = "hero",
  className,
}: PreviewPaneProps) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [motionOn, setMotionOn] = useState(true)

  const tabs: { id: Tab; label: string }[] = [
    { id: "hero", label: "Hero" },
    { id: "pricing", label: "Pricing" },
    { id: "form", label: "Form" },
    { id: "editorial", label: "Editorial" },
  ]

  // Local theme scoping — apply the theme's tokens to a wrapper <div> only,
  // so the preview can show the *generated* theme even before the user clicks
  // "Apply to page".
  const styleVars = useMemo(
    () =>
      ({
        "--background": theme.background,
        "--foreground": theme.foreground,
        "--card": theme.card,
        "--primary": theme.primary,
        "--primary-foreground": theme.primaryForeground,
        "--accent": theme.accent,
        "--muted": theme.muted,
        "--muted-foreground": theme.mutedForeground,
        "--border": theme.border,
        "--radius": theme.radius,
        "--font-display-family": `"${theme.displayFont}"`,
        "--font-body-family": `"${theme.bodyFont}"`,
      }) as React.CSSProperties,
    [theme]
  )

  const has = (id: string) => stackIds.includes(id)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background/80 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <div className="ml-3 flex items-center gap-2 rounded-md border border-border bg-card/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            preview · {theme.name.toLowerCase()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-cursor="hover"
                className={cn(
                  "rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMotionOn((v) => !v)}
            data-cursor="hover"
            className={cn(
              "rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition",
              motionOn ? "text-foreground" : "text-muted-foreground"
            )}
            aria-pressed={motionOn}
          >
            {motionOn ? "motion on" : "motion off"}
          </button>
        </div>
      </div>

      {/* Themed canvas */}
      <div
        data-prism-preview
        style={styleVars}
        className="relative isolate"
      >
        <div
          className={cn(
            "relative min-h-[480px] bg-background text-foreground transition-colors duration-500",
            "[&_*]:[font-family:var(--font-body-family,inherit)]"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: motionOn ? 0.35 : 0 }}
            >
              {tab === "hero" && (
                <PreviewHero
                  theme={theme}
                  motionOn={motionOn}
                  brandName={brandName}
                  showOrb={has("threejs") || has("r3f") || has("drei")}
                  showParticles={has("tsparticles")}
                />
              )}
              {tab === "pricing" && <PreviewPricing theme={theme} motionOn={motionOn} />}
              {tab === "form" && <PreviewForm theme={theme} motionOn={motionOn} />}
              {tab === "editorial" && (
                <PreviewEditorial theme={theme} brandName={brandName} motionOn={motionOn} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Hero                                                                  */
/* ================================================================== */

function PreviewHero({
  theme,
  motionOn,
  brandName,
  showOrb,
  showParticles,
}: {
  theme: Theme
  motionOn: boolean
  brandName?: string
  showOrb: boolean
  showParticles: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!motionOn || !ref.current) return
    const ctx = gsap.context(() => {
      gsap.from(".pv-hero-headline", {
        y: 30,
        opacity: 0,
        duration: 0.9,
        ease: "expo.out",
      })
      gsap.from(".pv-hero-sub", { y: 20, opacity: 0, duration: 0.7, delay: 0.2, ease: "power3.out" })
      gsap.from(".pv-hero-cta", { y: 16, opacity: 0, duration: 0.5, delay: 0.4, ease: "power3.out" })
    }, ref)
    return () => ctx.revert()
  }, [motionOn])

  return (
    <div ref={ref} className="relative overflow-hidden">
      {showOrb && (
        <div className="pointer-events-none absolute right-[-20%] top-[-15%] h-[110%] w-[60%] opacity-90">
          <PreviewOrb />
        </div>
      )}
      {showParticles && <ParticleLayer color={theme.primary} />}

      <div className="relative grid min-h-[480px] grid-rows-[auto_1fr_auto] p-8 md:p-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span
              className="text-sm font-medium tracking-tight"
              style={{ fontFamily: "var(--font-display-family)" }}
            >
              {brandName ?? theme.name}
            </span>
          </div>
          <nav className="hidden gap-6 text-xs text-muted-foreground md:flex">
            <a href="#" className="transition hover:text-foreground">Work</a>
            <a href="#" className="transition hover:text-foreground">About</a>
            <a href="#" className="transition hover:text-foreground">Contact</a>
          </nav>
        </div>

        {/* Headline */}
        <div className="relative flex items-end pt-8">
          <div className="relative z-10 max-w-2xl">
            <span className="pv-hero-sub inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Now arriving
            </span>
            <h1
              className={cn(
                "pv-hero-headline mt-5 text-5xl tracking-[-0.02em] leading-[0.95] text-balance md:text-6xl",
                theme.displayItalic && "italic"
              )}
              style={{ fontFamily: "var(--font-display-family)" }}
            >
              {theme.motto}
            </h1>
            <p className="pv-hero-sub mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              A composition tuned to your brief — typography, motion, and chrome moving in
              the same direction.
            </p>

            <div className="pv-hero-cta mt-7 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                style={{ borderRadius: "var(--radius)" }}
              >
                Get started <ArrowRight className="h-4 w-4" />
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border px-5 py-3 text-sm font-medium transition hover:bg-muted"
                style={{ borderRadius: "var(--radius)" }}
              >
                View work
              </button>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>Trusted by</span>
          {["Northwind", "Acme Type", "Solace", "Beam", "Kindred"].map((n) => (
            <span key={n} className="text-foreground/70">{n}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Pricing                                                               */
/* ================================================================== */

function PreviewPricing({ theme, motionOn }: { theme: Theme; motionOn: boolean }) {
  const tiers = [
    { name: "Starter", price: "0", period: "free forever", features: ["1 project", "Community support", "Light themes"], featured: false },
    { name: "Studio", price: "29", period: "per month", features: ["Unlimited projects", "AI generations", "All themes", "Priority support"], featured: true },
    { name: "Atelier", price: "Custom", period: "for teams", features: ["SSO + audit", "Dedicated rep", "Custom themes", "On-prem option"], featured: false },
  ]
  return (
    <div className="px-8 py-12 md:px-10 md:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Pricing
        </span>
        <h2
          className={cn(
            "mt-3 text-4xl tracking-tight md:text-5xl text-balance",
            theme.displayItalic && "italic"
          )}
          style={{ fontFamily: "var(--font-display-family)" }}
        >
          Pay for the moments that earn it.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Three plans, one design system. Switch tiers without losing your stack.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            initial={motionOn ? { y: 20, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "relative flex flex-col gap-5 border border-border bg-card p-6",
              t.featured && "border-primary/40 ring-1 ring-primary/20"
            )}
            style={{ borderRadius: "var(--radius)" }}
          >
            {t.featured && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary-foreground">
                <Star className="h-2.5 w-2.5" /> popular
              </span>
            )}
            <div>
              <div
                className="text-2xl tracking-tight"
                style={{ fontFamily: "var(--font-display-family)" }}
              >
                {t.name}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-4xl tracking-tight",
                    theme.displayItalic && "italic"
                  )}
                  style={{ fontFamily: "var(--font-display-family)" }}
                >
                  {t.price === "Custom" ? t.price : `$${t.price}`}
                </span>
                <span className="text-xs text-muted-foreground">{t.period}</span>
              </div>
            </div>

            <ul className="flex flex-col gap-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-foreground/80">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              className={cn(
                "mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition",
                t.featured
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border border-border hover:bg-muted"
              )}
              style={{ borderRadius: "var(--radius)" }}
            >
              {t.featured ? <Zap className="h-3.5 w-3.5" /> : null}
              Choose {t.name}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================== */
/* Form                                                                  */
/* ================================================================== */

function PreviewForm({ theme, motionOn }: { theme: Theme; motionOn: boolean }) {
  return (
    <div className="grid gap-10 px-8 py-12 md:grid-cols-[1.1fr_1fr] md:gap-12 md:px-10 md:py-14">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Get in touch
        </span>
        <h2
          className={cn(
            "mt-3 text-4xl tracking-tight md:text-5xl text-balance",
            theme.displayItalic && "italic"
          )}
          style={{ fontFamily: "var(--font-display-family)" }}
        >
          Tell us about the work.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          We reply within a day with a calendar invite and a short brief
          questionnaire. No sales calls, no funnels.
        </p>

        <ul className="mt-8 space-y-3 text-sm">
          {[
            { i: <Mail className="h-3.5 w-3.5" />, t: "studio@uxc.me" },
            { i: <LockIcon className="h-3.5 w-3.5" />, t: "Private. Encrypted in transit." },
            { i: <Sparkles className="h-3.5 w-3.5 text-primary" />, t: "We respond personally." },
          ].map((row, i) => (
            <motion.li
              key={i}
              initial={motionOn ? { x: -10, opacity: 0 } : false}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 + 0.1 }}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-card border border-border">
                {row.i}
              </span>
              {row.t}
            </motion.li>
          ))}
        </ul>
      </div>

      <form
        className="flex flex-col gap-4 border border-border bg-card p-6"
        style={{ borderRadius: "var(--radius)" }}
        onSubmit={(e) => e.preventDefault()}
      >
        <FormField label="Name" placeholder="Yuna Saito" />
        <FormField label="Email" placeholder="yuna@studio.com" type="email" />
        <FormField label="Project" placeholder="Editorial portfolio launch" />
        <FormTextarea label="Brief" placeholder="Magazine-feel. October launch. Looking for direction…" />
        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          style={{ borderRadius: "var(--radius)" }}
        >
          Send brief <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          We never share your details.
        </p>
      </form>
    </div>
  )
}

function FormField({
  label,
  placeholder,
  type = "text",
}: {
  label: string
  placeholder: string
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        className="border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
        style={{ borderRadius: "var(--radius)" }}
      />
    </label>
  )
}

function FormTextarea({
  label,
  placeholder,
}: {
  label: string
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <textarea
        placeholder={placeholder}
        rows={4}
        className="resize-none border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-primary"
        style={{ borderRadius: "var(--radius)" }}
      />
    </label>
  )
}

/* ================================================================== */
/* Editorial                                                             */
/* ================================================================== */

function PreviewEditorial({
  theme,
  brandName,
  motionOn,
}: {
  theme: Theme
  brandName?: string
  motionOn: boolean
}) {
  return (
    <article className="px-8 py-12 md:px-12 md:py-16">
      <div className="grid gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        {/* Side rail */}
        <aside className="hidden flex-col gap-3 md:flex">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Issue 03
          </div>
          <div className="h-px w-12 bg-foreground/40" />
          <div
            className="text-xs text-muted-foreground"
            style={{ writingMode: "vertical-rl" }}
          >
            Studio Notes — Autumn
          </div>
        </aside>

        <div>
          <header>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {brandName ?? theme.name} · Long Read
            </span>
            <motion.h2
              initial={motionOn ? { y: 20, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                "mt-3 text-5xl tracking-[-0.02em] leading-[0.95] text-balance md:text-7xl",
                theme.displayItalic && "italic"
              )}
              style={{ fontFamily: "var(--font-display-family)" }}
            >
              The page is the medium, not the message.
            </motion.h2>
            <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span>By Maren Holt</span>
              <span className="h-px w-6 bg-border" />
              <time>Sept 2026</time>
              <span className="h-px w-6 bg-border" />
              <span>8 min read</span>
            </div>
          </header>

          <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-x-10">
            <p className="text-base leading-relaxed text-foreground/85">
              <span
                className={cn(
                  "float-left mr-2 text-7xl leading-[0.85]",
                  theme.displayItalic && "italic"
                )}
                style={{ fontFamily: "var(--font-display-family)" }}
              >
                T
              </span>
              ype is not decoration. It&apos;s the chassis on which the rest of
              the page rides — the thing readers feel before they read a word.
              When it&apos;s right, the rest of the system can be quiet.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Editorial pages don&apos;t need more components. They need fewer,
              held longer. Generous margins, line lengths under sixty-five
              characters, vertical rhythm tied to the body cap-height. The page
              becomes a place to dwell, not scroll past.
            </p>
          </div>

          <figure className="mt-12 border-y border-border py-8">
            <div className="flex items-start gap-3 text-foreground">
              <Quote className="h-5 w-5 shrink-0 text-primary" />
              <blockquote
                className={cn(
                  "text-2xl leading-snug tracking-tight md:text-3xl",
                  theme.displayItalic && "italic"
                )}
                style={{ fontFamily: "var(--font-display-family)" }}
              >
                Slow the scroll. The reader will reward you for it.
              </blockquote>
            </div>
            <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              — From the studio brief
            </figcaption>
          </figure>
        </div>
      </div>
    </article>
  )
}

/* ================================================================== */
/* Decorative particle layer                                             */
/* ================================================================== */

function ParticleLayer({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
    }
    resize()
    window.addEventListener("resize", resize)
    const N = 35
    const dots = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3 * dpr,
      vy: (Math.random() - 0.5) * 0.3 * dpr,
      r: (Math.random() * 1.6 + 0.4) * dpr,
    }))
    let id = 0
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = color
      for (const p of dots) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.globalAlpha = 0.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("resize", resize)
    }
  }, [color])
  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 opacity-50"
      aria-hidden
    />
  )
}
