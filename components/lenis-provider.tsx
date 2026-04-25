"use client"

import { useEffect } from "react"
import Lenis from "lenis"

/**
 * Smooth-scroll provider with sensible bailouts:
 * - Skips on touch devices (Lenis fights native momentum / overscroll)
 * - Skips when prefers-reduced-motion is set
 * - Skips on small viewports (mobile / portrait tablets)
 * Falls back to native scroll, which is what users expect on those.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches
    const small = window.matchMedia("(max-width: 768px)").matches
    if (reduced || touch || small) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      syncTouch: false,
    })

    let rafId = 0
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
