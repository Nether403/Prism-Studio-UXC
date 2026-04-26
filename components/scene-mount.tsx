"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { isFxDisabled } from "@/lib/fx"

const Scene = dynamic(() => import("@/components/scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => null,
})

/**
 * Mounts the WebGL scene as a fixed background and fades it out as the
 * user scrolls past the hero. Gated for performance:
 *   - Skipped entirely on prefers-reduced-motion
 *   - Skipped on coarse-pointer (mobile) by default — opt in with `mobile`
 *   - Skipped when the URL contains ?nofx=1 (debug / preview escape hatch)
 *   - Lazy: defers Canvas mount until the hero sentinel intersects the viewport
 *   - Visibility-aware: pauses by toggling `visibility:hidden` once faded out
 *
 * Mount on a SINGLE route (homepage) — not in the global layout.
 */
export function SceneMount({ mobile = false }: { mobile?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isFxDisabled()) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const coarse = window.matchMedia("(pointer: coarse)").matches
    if (reduced) return
    if (coarse && !mobile) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    // Only boot the Canvas if the hero sentinel is actually intersecting.
    // This means: the iframe is visible AND the user is near the top of the page.
    // If they land deep-linked further down, we never spin up Three.js at all.
    let cancelled = false
    const io = new IntersectionObserver(
      (entries) => {
        if (cancelled) return
        const visible = entries.some((e) => e.isIntersecting)
        if (!visible) return
        io.disconnect()

        // Defer the actual mount one more idle tick so chat hydration / fonts
        // get a chance to settle before we drop in a WebGL context.
        const idle =
          (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
            .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200))
        idle(() => {
          if (!cancelled) setEnabled(true)
        })
      },
      { rootMargin: "0px" }
    )
    io.observe(sentinel)

    return () => {
      cancelled = true
      io.disconnect()
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

  return (
    <>
      {/* Sentinel sits at the top of the page; once it intersects, we boot the scene. */}
      <div
        ref={sentinelRef}
        aria-hidden
        style={{ position: "absolute", top: 0, left: 0, width: 1, height: "60vh", pointerEvents: "none" }}
      />
      {enabled && (
        <div
          ref={ref}
          aria-hidden
          className="pointer-events-none transition-opacity duration-200"
          style={{ position: "fixed", inset: 0, zIndex: 0 }}
        >
          <Scene />
        </div>
      )}
    </>
  )
}
