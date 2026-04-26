/**
 * Single source of truth for the "disable all visual FX" escape hatch.
 *
 * Set ?nofx=1 on any URL to disable:
 *   - The WebGL <Scene /> background
 *   - Lenis smooth scroll
 *   - The custom <Cursor /> overlay
 *
 * Useful for:
 *   - Debugging "Page Unresponsive" issues in the v0 chat preview
 *   - Profiling / Lighthouse runs without animation noise
 *   - Quick A/B between heavy and minimal experience
 *
 * The check is intentionally synchronous and SSR-safe: returns false on the
 * server so the markup matches between SSR and the first client render.
 */
export function isFxDisabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get("nofx") === "1" || params.has("nofx")
  } catch {
    return false
  }
}
