import Link from "next/link"
import Image from "next/image"

const LOGO_SRC = "/logoUXC.png"
const LOGO_ALT = "UXC"

/**
 * UXC primary brand mark backed by the canonical logo asset.
 *
 * Two layouts:
 *   - `mark`  → just the logo, used inline (footer wordmark, etc.)
 *   - `lockup` → logo + faint "UX CURATOR" subtitle, used in nav/auth.
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

/** Brand wordmark. */
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
      <Image
        src={LOGO_SRC}
        alt=""
        width={750}
        height={480}
        priority={variant === "lockup"}
        className="h-8 w-auto object-contain sm:h-9"
        aria-hidden
      />
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
      className="inline-flex items-center justify-center overflow-hidden rounded-md bg-background ring-1 ring-border"
      style={{ width: size, height: size }}
    >
      <Image src={LOGO_SRC} alt={LOGO_ALT} width={750} height={480} className="h-full w-full object-cover" />
    </span>
  )
}
