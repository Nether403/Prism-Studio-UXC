"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { isFxDisabled } from "@/lib/fx"

/**
 * Custom cursor with two layers:
 *  - dot: tracks pointer 1:1 (very fast)
 *  - ring: lerps with delay, expands on interactive elements
 * Snaps to nearest [data-cursor="hover"] within 100px (magnetic).
 *
 * Performance:
 *  - Hidden on touch devices and when ?nofx=1 is set
 *  - mousemove handler is rAF-coalesced — at most one update per frame
 *  - Magnetic DOM walk (closest()) is skipped while the pointer is moving
 *    fast (>4px/frame), since the user clearly isn't aiming at anything.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isFxDisabled()) return
    if (window.matchMedia("(pointer: coarse)").matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    document.body.classList.add("has-custom-cursor")

    const setDotX = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3.out" })
    const setDotY = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3.out" })
    const setRingX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" })
    const setRingY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" })

    let mouseX = 0
    let mouseY = 0
    let lastX = 0
    let lastY = 0
    let pendingTarget: EventTarget | null = null
    let rafId = 0
    let queued = false

    const flush = () => {
      queued = false
      rafId = 0
      const dx = mouseX - lastX
      const dy = mouseY - lastY
      const speed = Math.hypot(dx, dy)
      lastX = mouseX
      lastY = mouseY

      setDotX(mouseX)
      setDotY(mouseY)

      // Skip the DOM walk during fast moves — the user isn't snapping to anything.
      if (speed < 4 && pendingTarget) {
        const target = (pendingTarget as HTMLElement)?.closest?.('[data-cursor="hover"]') as
          | HTMLElement
          | null
        if (target) {
          const rect = target.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          const ddx = mouseX - cx
          const ddy = mouseY - cy
          const dist = Math.hypot(ddx, ddy)
          if (dist < 100) {
            const pull = (1 - dist / 100) * 0.5
            setRingX(cx + ddx * (1 - pull))
            setRingY(cy + ddy * (1 - pull))
            ring.classList.add("is-hovering")
            return
          }
        }
      }
      setRingX(mouseX)
      setRingY(mouseY)
      ring.classList.remove("is-hovering")
    }

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      pendingTarget = e.target
      if (!queued) {
        queued = true
        rafId = requestAnimationFrame(flush)
      }
    }

    const onDown = () => ring.classList.add("is-pressed")
    const onUp = () => ring.classList.remove("is-pressed")
    const onLeave = () => {
      ring.style.opacity = "0"
      dot.style.opacity = "0"
    }
    const onEnter = () => {
      ring.style.opacity = "1"
      dot.style.opacity = "1"
    }

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    document.addEventListener("mouseleave", onLeave)
    document.addEventListener("mouseenter", onEnter)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      document.removeEventListener("mouseleave", onLeave)
      document.removeEventListener("mouseenter", onEnter)
      document.body.classList.remove("has-custom-cursor")
    }
  }, [])

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="prism-cursor-ring pointer-events-none fixed left-0 top-0 z-[100] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
      />
      <div
        ref={dotRef}
        aria-hidden
        className="prism-cursor-dot pointer-events-none fixed left-0 top-0 z-[101] -translate-x-1/2 -translate-y-1/2"
      />
    </>
  )
}
