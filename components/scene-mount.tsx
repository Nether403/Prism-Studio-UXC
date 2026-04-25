"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef } from "react"

const Scene = dynamic(() => import("@/components/scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => null,
})

/**
 * Globally mounts the WebGL scene as a fixed background, then fades it
 * out as the user scrolls past the hero. Keeps the canvas alive (so the
 * scroll-driven camera state stays correct) without bleeding into dense
 * content sections below.
 */
export function SceneMount() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      const heroEnd = window.innerHeight // hero is 100vh
      const y = window.scrollY
      // Fully visible during the hero, fades across the next ~50vh
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
  }, [])

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
