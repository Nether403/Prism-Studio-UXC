// ---------------------------------------------------------------------------
// ProvenanceCard — "Originated from" detail block for /s/[id].
// ---------------------------------------------------------------------------
//
// Server component. Renders the inspiration that produced a stack: its
// screenshot (or palette gradient fallback for paste-only signatures), the
// source-type chip, a hostname link for url/og inputs, the one-line vibe
// statement pulled from the signature, the five-swatch palette, and a CTA
// back to the originating studio so the owner can re-roll.
// ---------------------------------------------------------------------------

import Link from "next/link"
import Image from "next/image"
import { ExternalLink, Globe, ImageIcon, Lock, ScrollText, Sparkles } from "lucide-react"
import type { Signature, SourceType } from "@/lib/signature"

export type ProvenanceCardProps = {
  inspiration: {
    id: string
    source_type: SourceType
    source_ref: string
    screenshot_url: string | null
    signature: Signature | null
    is_public: boolean
    created_at: string
  }
  /** True when the viewer owns this inspiration row. Hides the CTA otherwise. */
  isOwner: boolean
}

export function ProvenanceCard({ inspiration, isOwner }: ProvenanceCardProps) {
  const { source_type, source_ref, screenshot_url, signature, is_public } = inspiration

  const sourceLabel = SOURCE_LABELS[source_type]
  const SourceIcon = SOURCE_ICONS[source_type]

  // Hostname only meaningful for url/og — for image/paste, source_ref is a
  // blob URL or a SHA hash and shouldn't be rendered as a clickable link.
  const hostname = (source_type === "url" || source_type === "og") ? safeHostname(source_ref) : null

  // Palette is the canonical 5-swatch row from the signature. Fall back to
  // the screenshot tint or a neutral grayscale if the signature is missing.
  const swatches = signature?.palette ?? []

  // Studio CTA: the page that would let the owner re-roll this exact
  // inspiration. URL-based inputs map to /rebuild; image/paste to /from-image.
  const studioHref = (source_type === "url" || source_type === "og") ? "/rebuild" : "/from-image"
  const studioLabel = (source_type === "url" || source_type === "og") ? "Re-rebuild" : "Re-extract"

  return (
    <section
      aria-labelledby="provenance-heading"
      className="relative pt-12 pb-16 border-t border-border"
    >
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <span className="text-primary">04</span>
          <span className="h-px w-8 bg-border" />
          <span id="provenance-heading">Originated from</span>
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-[280px_1fr]">
          {/* Left: screenshot or palette fallback */}
          <div>
            <div
              className="relative aspect-[5/4] w-full overflow-hidden rounded-lg border border-border bg-secondary"
              style={
                !screenshot_url && swatches.length > 0
                  ? { backgroundImage: paletteGradient(swatches.map((s) => s.hex)) }
                  : undefined
              }
            >
              {screenshot_url ? (
                <Image
                  src={screenshot_url}
                  alt={`Source ${sourceLabel.toLowerCase()} for this stack`}
                  fill
                  sizes="(max-width: 768px) 100vw, 280px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-end p-3">
                  <span className="rounded-sm bg-background/80 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
                    Palette only
                  </span>
                </div>
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground backdrop-blur">
                <SourceIcon className="h-3 w-3" aria-hidden />
                {sourceLabel}
              </span>
              {!is_public && (
                <span
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur"
                  title="This inspiration is private to you"
                >
                  <Lock className="h-3 w-3" aria-hidden />
                  Private
                </span>
              )}
            </div>
          </div>

          {/* Right: source link, vibe statement, palette, CTA */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {hostname ? (
                <a
                  href={source_ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
                  data-cursor="hover"
                >
                  {hostname}
                  <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                </a>
              ) : (
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {source_type === "image" ? "Uploaded image" : "Pasted notes"}
                </span>
              )}
            </div>

            {signature?.vibeStatement && (
              <blockquote className="border-l-2 border-primary pl-4 font-display text-2xl italic tracking-tight leading-snug text-balance text-foreground">
                &ldquo;{signature.vibeStatement}&rdquo;
              </blockquote>
            )}

            {signature?.contentSignature && (
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {signature.contentSignature}
              </p>
            )}

            {swatches.length > 0 && (
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Source palette
                </div>
                <ul className="flex flex-wrap gap-2">
                  {swatches.map((s) => (
                    <li
                      key={`${s.role}-${s.hex}`}
                      className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-2 py-1.5"
                    >
                      <span
                        className="h-5 w-5 rounded-sm border border-border/60"
                        style={{ background: s.hex }}
                        aria-hidden
                      />
                      <span className="font-mono text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">
                        {s.role}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-foreground">
                        {s.hex}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isOwner && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={studioHref}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  data-cursor="hover"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {studioLabel}
                </Link>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Same source, fresh stack
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<SourceType, string> = {
  url: "From URL",
  og: "From OG image",
  image: "From image",
  paste: "From notes",
}

const SOURCE_ICONS: Record<SourceType, typeof Globe> = {
  url: Globe,
  og: Globe,
  image: ImageIcon,
  paste: ScrollText,
}

function safeHostname(url: string): string | null {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

/**
 * Build a hard-stop linear gradient from a list of hex colors. Used as the
 * thumbnail fallback when a paste-only signature has no screenshot.
 */
function paletteGradient(hexes: string[]): string {
  if (hexes.length === 0) return ""
  const stops = hexes
    .map((hex, i) => {
      const start = (i / hexes.length) * 100
      const end = ((i + 1) / hexes.length) * 100
      return `${hex} ${start}%, ${hex} ${end}%`
    })
    .join(", ")
  return `linear-gradient(135deg, ${stops})`
}
