"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

const Scene = dynamic(() => import("@/components/scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => null,
})

/**
 * Mounts the WebGL scene as a fixed background and fades it out as the
 * user scrolls past the hero. Gated for performance:
 *   - Skipped entirely on prefers-reduced-motion
 *   - Skipped on coarse-pointer (mobile) by default — opt in with `mobile`
 *   - Lazy: defers Canvas mount to the next idle frame
 *   - Visibility-aware: pauses by toggling `visibility:hidden` once faded out
 *
 * Mount on a SINGLE route (homepage) — not in the global layout.
 */
export function SceneMount({ mobile = false }: { mobile?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const coarse = window.matchMedia("(pointer: coarse)").matches
    if (reduced) return
    if (coarse && !mobile) return

    // Defer mount until the browser is idle to keep TTI/LCP clean.
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200))
    const handle = idle(() => setEnabled(true))
    return () => {
      const cancel =
        (window as unknown as { cancelIdleCallback?: (h: number) => void })
          .cancelIdleCallback ?? window.clearTimeout
      cancel(handle as unknown as number)
    }
  }, [mobile])

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    let raf = 0
    const update = () => {
      const heroEnd = window.innerHeight
      const y = window.scrollY
      const fade = 1 - Math.min(1, Math.max(0, (y - heroEnd * 0.55) / (heroEnd * 0.5)))
      el.style.opacity = String(fade)
      el.style.visibility = fade < 0.02 ? "hidden" : "visible"
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none transition-opacity duration-200"
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
    >
      <Scene />
    </div>
  )
}
