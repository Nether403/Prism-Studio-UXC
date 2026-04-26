import Link from "next/link"

/**
 * UXC primary brand mark — the lowercase "uxc" wordmark with the canonical
 * sunset gradient (warm yellow → orange → coral → magenta → deep purple).
 *
 * The gradient is rendered via `background-clip: text` against the
 * `.brand-gradient` utility defined in globals.css, so the mark scales
 * arbitrarily and stays sharp at every size — no SVG asset to maintain.
 *
 * Two layouts:
 *   - `mark`  → just the wordmark glyphs, used inline (footer wordmark, etc.)
 *   - `lockup` → wordmark + faint "UX CURATOR" subtitle, used in nav/auth.
 */
export type UxcWordmarkProps = {
  /** Visual variant. Defaults to `lockup`. */
  variant?: "mark" | "lockup"
  /** Optional className passed to the outer container. */
  className?: string
  /** When true, renders inside a Link to `/`. Defaults to false. */
  asLink?: boolean
  /** When true, renders the subtitle (only meaningful for `lockup`). */
  showSubtitle?: boolean
}

/**
 * Brand wordmark. The base `<span>` flow keeps it accessible to screen
 * readers as plain text "UXC" without committing to a heading level.
 */
export function UxcWordmark({
  variant = "lockup",
  className,
  asLink = false,
  showSubtitle = true,
}: UxcWordmarkProps) {
  const inner = (
    <span
      className={[
        "inline-flex items-center gap-2.5",
        className ?? "",
      ].join(" ")}
      aria-label="UXC"
    >
      {/* The wordmark itself. We use Bricolage Grotesque @ 800 with tight
          tracking and an explicit fixed line-height to keep the gradient
          baseline crisp inside flex containers. The aria-hidden span
          carries the visual; the .sr-only sibling owns the accessible
          text. */}
      <span
        aria-hidden
        className="brand-gradient font-[family-name:var(--font-bricolage)] font-extrabold lowercase leading-none tracking-[-0.06em] text-[1.35rem]"
      >
        uxc
      </span>
      <span className="sr-only">UXC</span>

      {variant === "lockup" && showSubtitle && (
        <span
          aria-hidden
          className="hidden sm:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
        >
          <span className="h-3 w-px bg-border" />
          UX Curator
        </span>
      )}
    </span>
  )

  if (asLink) {
    return (
      <Link href="/" className="inline-flex items-center" data-cursor="hover">
        {inner}
      </Link>
    )
  }
  return inner
}

/**
 * Tiny mark-only badge used in compact OG/share contexts where the
 * lockup is overkill — a single rounded square containing the gradient
 * "uxc" glyph. Accepts a `size` prop in pixels.
 */
export function UxcBadge({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-md bg-background ring-1 ring-border"
      style={{ width: size, height: size }}
    >
      <span
        className="brand-gradient font-[family-name:var(--font-bricolage)] font-extrabold lowercase leading-none tracking-[-0.08em]"
        style={{ fontSize: Math.round(size * 0.55) }}
      >
        uxc
      </span>
    </span>
  )
}
