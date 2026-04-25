"use client"

const ITEMS = [
  "WebGL",
  "WebGPU",
  "Three.js",
  "GSAP",
  "Lenis",
  "Shadcn/ui",
  "Tailwind",
  "Next.js",
  "Radix",
  "Spline",
  "Lottie",
  "Rapier",
  "OGL",
  "AI SDK",
  "v0",
]

export function Marquee() {
  return (
    <div className="relative border-y border-border bg-card/30 py-5 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap gap-12 font-mono text-sm uppercase tracking-[0.25em] text-muted-foreground">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-12">
            <span>{item}</span>
            <span aria-hidden className="text-primary">
              ✦
            </span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}
