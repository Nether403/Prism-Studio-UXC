"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { motion } from "motion/react"
import gsap from "gsap"
import type { Category } from "@/lib/stack-data"

/* ------------------------------------------------------------------ */
/* Tiny in-view hook — gates expensive demos                            */
/* ------------------------------------------------------------------ */

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "100px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView]
}

/* ------------------------------------------------------------------ */
/* R3F demo — only loaded on demand                                     */
/* ------------------------------------------------------------------ */

const R3FOrbDemo = dynamic(() => import("./demos/r3f-orb").then((m) => m.R3FOrbDemo), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted/30" />,
})

const R3FCubeDemo = dynamic(() => import("./demos/r3f-cube").then((m) => m.R3FCubeDemo), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted/30" />,
})

/* ------------------------------------------------------------------ */
/* CSS / Canvas / Motion demos                                          */
/* ------------------------------------------------------------------ */

function GsapDemo() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const dots = el.querySelectorAll("span")
    const tl = gsap.timeline({ repeat: -1 })
    tl.fromTo(
      dots,
      { y: 0, opacity: 0.4 },
      {
        y: -16,
        opacity: 1,
        duration: 0.5,
        ease: "power2.inOut",
        stagger: { each: 0.1, repeat: 1, yoyo: true },
      }
    )
    return () => {
      tl.kill()
    }
  }, [])
  return (
    <div ref={ref} className="flex h-full items-end justify-center gap-1.5 px-2 pb-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-primary"
          style={{ opacity: 0.4 }}
        />
      ))}
    </div>
  )
}

function LenisDemo() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-y-0 left-0 right-0 flex flex-col">
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: ["0%", "-60%", "-60%", "0%"] }}
          transition={{ duration: 4, ease: [0.16, 1, 0.3, 1], repeat: Infinity }}
          className="space-y-1.5 p-3"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full bg-foreground/20"
              style={{ width: `${40 + ((i * 13) % 50)}%` }}
            />
          ))}
        </motion.div>
      </div>
      <div className="absolute right-2 top-2 bottom-2 w-1 rounded-full bg-muted">
        <motion.div
          className="absolute left-0 right-0 rounded-full bg-primary"
          initial={{ top: "0%", height: "30%" }}
          animate={{ top: ["0%", "70%", "70%", "0%"] }}
          transition={{ duration: 4, ease: [0.16, 1, 0.3, 1], repeat: Infinity }}
          style={{ height: "30%" }}
        />
      </div>
    </div>
  )
}

function MotionDemo() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        animate={{
          borderRadius: ["20%", "50%", "20%", "10%", "20%"],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="h-7 w-7 bg-primary"
      />
    </div>
  )
}

function TailwindDemo() {
  const swatches = ["bg-primary", "bg-accent", "bg-foreground", "bg-muted", "bg-border"]
  return (
    <div className="flex h-full items-center gap-1 px-3">
      {swatches.map((c, i) => (
        <motion.div
          key={c}
          initial={{ scaleY: 0.3 }}
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
          className={`h-8 flex-1 rounded ${c}`}
        />
      ))}
    </div>
  )
}

function ShadcnDemo() {
  const [pressed, setPressed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPressed((n) => (n + 1) % 3), 1100)
    return () => clearInterval(t)
  }, [])
  const variants = ["default", "outline", "ghost"]
  return (
    <div className="flex h-full items-center justify-center gap-2 px-3">
      {variants.map((v, i) => {
        const active = pressed === i
        return (
          <motion.div
            key={v}
            animate={{
              scale: active ? 1.05 : 1,
              backgroundColor: active
                ? "var(--primary)"
                : v === "default"
                ? "var(--primary)"
                : v === "outline"
                ? "transparent"
                : "transparent",
            }}
            className={`h-7 rounded px-2.5 text-[10px] font-medium leading-7 ${
              v === "outline" ? "border border-border" : ""
            }`}
            style={{
              color: v === "default" || active ? "var(--primary-foreground)" : "var(--foreground)",
            }}
          >
            {v}
          </motion.div>
        )
      })}
    </div>
  )
}

function RadixDemo() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 1500)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        animate={{ backgroundColor: on ? "var(--primary)" : "var(--muted)" }}
        className="relative h-6 w-12 rounded-full"
      >
        <motion.div
          className="absolute top-0.5 h-5 w-5 rounded-full bg-foreground"
          animate={{ left: on ? "26px" : "2px" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ background: "var(--background)" }}
        />
      </motion.div>
    </div>
  )
}

function NextjsDemo() {
  const routes = ["/", "/about", "/blog/[slug]", "/api"]
  return (
    <div className="flex h-full items-center justify-center gap-1 px-3">
      {routes.map((r, i) => (
        <motion.div
          key={r}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4 }}
          className="rounded border border-border px-2 py-1 font-mono text-[9px]"
        >
          {r}
        </motion.div>
      ))}
    </div>
  )
}

function AiSdkDemo() {
  const [text, setText] = useState("")
  const target = "Streaming response..."
  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % (target.length + 8)
      setText(target.slice(0, Math.min(i, target.length)))
    }, 90)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex h-full items-center px-3">
      <div className="font-mono text-[10px] text-foreground">
        {text}
        <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-primary align-middle" />
      </div>
    </div>
  )
}

function V0Demo() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="relative h-10 w-10"
      >
        <span className="absolute inset-0 rounded-full border border-primary" />
        <span className="absolute inset-1 rounded-full border border-accent/60" />
        <span className="absolute inset-2 rounded-full border border-foreground/40" />
      </motion.div>
      <div className="ml-2 font-display text-lg italic">v0</div>
    </div>
  )
}

function LottieDemo() {
  // SVG path morph using framer-motion
  const paths = [
    "M 12 24 Q 24 4 36 24 Q 24 44 12 24 Z",
    "M 12 24 Q 24 12 36 24 Q 24 36 12 24 Z",
    "M 12 24 Q 24 36 36 24 Q 24 4 12 24 Z",
  ]
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % paths.length), 800)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="flex h-full items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <motion.path
          d={paths[i]}
          fill="var(--primary)"
          animate={{ d: paths[i] }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </svg>
    </div>
  )
}

function SplineDemo() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="h-10 w-10 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, var(--primary), var(--accent), var(--primary))",
          filter: "blur(2px)",
        }}
      />
      <motion.div
        animate={{ scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="-ml-10 h-10 w-10 rounded-full bg-primary mix-blend-difference"
      />
    </div>
  )
}

function FigmaDemo() {
  return (
    <div className="flex h-full items-center justify-center gap-1">
      {["bg-primary", "bg-accent", "bg-foreground"].map((c, i) => (
        <motion.div
          key={c}
          initial={{ y: 0 }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
          className={`h-8 w-6 rounded-sm ${c}`}
        />
      ))}
    </div>
  )
}

function ParticlesDemo() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [containerRef, inView] = useInView<HTMLDivElement>()
  useEffect(() => {
    if (!inView) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const w = (canvas.width = canvas.offsetWidth * 2)
    const h = (canvas.height = canvas.offsetHeight * 2)
    const particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 1,
    }))
    let id = 0
    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#fff"
      ctx.fillStyle = primary
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2)
        ctx.fill()
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [inView])
  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas ref={ref} className="h-full w-full" />
    </div>
  )
}

function MatterDemo() {
  // Lightweight non-Matter ball drop animation (real Matter would be heavy)
  return (
    <div className="relative h-full w-full overflow-hidden px-3">
      {[0, 0.4, 0.8].map((d, i) => (
        <motion.div
          key={i}
          initial={{ y: -10 }}
          animate={{ y: [-10, 30, 30, -10] }}
          transition={{ duration: 2, repeat: Infinity, delay: d, ease: "easeIn" }}
          className="absolute top-2 h-3 w-3 rounded-full bg-primary"
          style={{ left: `${20 + i * 28}%` }}
        />
      ))}
      <div className="absolute bottom-2 left-2 right-2 h-px bg-foreground/40" />
    </div>
  )
}

function OglDemo() {
  return (
    <div
      className="h-full w-full"
      style={{
        background:
          "linear-gradient(120deg, var(--primary) 0%, var(--accent) 50%, var(--primary) 100%)",
        backgroundSize: "200% 200%",
        animation: "ogl-drift 4s linear infinite",
      }}
    />
  )
}

function FallbackDemo({ category }: { category?: Category }) {
  const palette: Record<string, string> = {
    framework: "bg-foreground/10",
    "3d": "bg-primary/30",
    motion: "bg-accent/30",
    ui: "bg-foreground/15",
    styling: "bg-primary/20",
    scroll: "bg-foreground/15",
    ai: "bg-accent/30",
    components: "bg-foreground/15",
    assets: "bg-primary/20",
  }
  const cls = palette[category ?? ""] ?? "bg-muted"
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        animate={{ scale: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`h-6 w-6 rounded ${cls}`}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Demo registry                                                        */
/* ------------------------------------------------------------------ */

export type LibraryDemoProps = {
  id: string
  category?: Category
  className?: string
}

export function LibraryDemo({ id, category, className = "" }: LibraryDemoProps) {
  const [containerRef, inView] = useInView<HTMLDivElement>()

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-md border border-border bg-card/50 ${className}`}
      aria-hidden
    >
      {/* category label in corner */}
      <div className="pointer-events-none absolute left-1.5 top-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
        {id}
      </div>
      {inView ? renderDemo(id, category) : <div className="h-full w-full bg-muted/30" />}
    </div>
  )
}

function renderDemo(id: string, category?: Category) {
  switch (id) {
    case "threejs":
    case "r3f":
    case "drei":
    case "webgpu":
      return <R3FOrbDemo />
    case "rapier":
      return <R3FCubeDemo />
    case "gsap":
      return <GsapDemo />
    case "lenis":
      return <LenisDemo />
    case "framer-motion":
      return <MotionDemo />
    case "tailwind":
      return <TailwindDemo />
    case "shadcn":
      return <ShadcnDemo />
    case "radix":
      return <RadixDemo />
    case "nextjs":
      return <NextjsDemo />
    case "ai-sdk":
      return <AiSdkDemo />
    case "v0":
      return <V0Demo />
    case "lottie":
      return <LottieDemo />
    case "spline":
      return <SplineDemo />
    case "figma":
      return <FigmaDemo />
    case "tsparticles":
      return <ParticlesDemo />
    case "matter":
      return <MatterDemo />
    case "ogl":
      return <OglDemo />
    default:
      return <FallbackDemo category={category} />
  }
}
