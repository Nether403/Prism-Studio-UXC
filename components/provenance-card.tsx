import Link from "next/link"
import { ArrowUpRight, ClipboardPaste, Globe, ImageIcon, Lock, Sparkles } from "lucide-react"
import type { Signature } from "@/lib/signature"

type SourceType = "url" | "image" | "og" | "paste"

export type ProvenanceInspiration = {
  id: string
  source_type: SourceType
  source_ref: string
  screenshot_url: string | null
  signature: Signature | null
  is_public: boolean
  created_at: string
}

const SOURCE_META: Record<
  SourceType,
  { label: string; icon: React.ReactNode; verb: string }
> = {
  url: {
    label: "URL rebuild",
    icon: <Globe className="h-3 w-3" />,
    verb: "Captured from",
  },
  og: {
    label: "OG image",
    icon: <Sparkles className="h-3 w-3" />,
    verb: "Pulled from",
  },
  image: {
    label: "Image upload",
    icon: <ImageIcon className="h-3 w-3" />,
    verb: "Inspired by",
  },
  paste: {
    label: "Pasted brief",
    icon: <ClipboardPaste className="h-3 w-3" />,
    verb: "Brief from",
  },
}

function safeHostname(ref: string): string | null {
  try {
    const url = new URL(ref)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

/**
 * Provenance for a published or owned stack.
 *
 * Renders the inspiration row that produced this stack: the source type, an
 * optional screenshot, the canonical palette, and a one-line vibe statement.
 * Designed to slot into /s/[id] as a self-contained card and into /dashboard
 * as a thumbnail strip via `<ProvenanceThumb />`.
 *
 * RLS at the call site is what guarantees we never leak a private inspiration
 * to a non-owner — this component just renders what it's given.
 */
export function ProvenanceCard({
  inspiration,
  viewerIsOwner,
}: {
  inspiration: ProvenanceInspiration
  viewerIsOwner: boolean
}) {
  const meta = SOURCE_META[inspiration.source_type]
  const showSourceLink =
    inspiration.source_type === "url" || inspiration.source_type === "og"
  const hostname = showSourceLink ? safeHostname(inspiration.source_ref) : null

  const ctaHref =
    inspiration.source_type === "url" || inspiration.source_type === "og"
      ? "/rebuild"
      : "/from-image"
  const ctaLabel =
    inspiration.source_type === "url" || inspiration.source_type === "og"
      ? "Rebuild another site"
      : "Try with another image"

  const palette = inspiration.signature?.palette ?? []
  const vibeStatement = inspiration.signature?.vibeStatement
  const contentSignature = inspiration.signature?.contentSignature

  return (
    <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        {/* Visual: screenshot or palette fallback */}
        <div className="relative aspect-[4/3] md:aspect-auto md:h-full bg-muted/40 border-b md:border-b-0 md:border-r border-border">
          {inspiration.screenshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inspiration.screenshot_url}
              alt={contentSignature ?? "Inspiration screenshot"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : palette.length > 0 ? (
            <div className="grid h-full w-full grid-cols-5">
              {palette.map((s) => (
                <div
                  key={s.role}
                  style={{ background: s.hex }}
                  aria-label={`${s.role}: ${s.hex}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              {meta.icon}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5">
              {meta.icon}
              {meta.label}
            </span>
            {viewerIsOwner && !inspiration.is_public && (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5">
                <Lock className="h-2.5 w-2.5" />
                Private to you
              </span>
            )}
            <span className="ml-auto normal-case tracking-normal font-sans">
              {meta.verb}
            </span>
          </div>

          {hostname ? (
            <a
              href={inspiration.source_ref}
              target="_blank"
              rel="noreferrer noopener"
              className="font-display text-xl tracking-tight underline-offset-4 hover:underline truncate"
              data-cursor="hover"
            >
              {hostname}
              <ArrowUpRight className="ml-1 inline h-4 w-4 opacity-60" />
            </a>
          ) : (
            <div className="font-display text-xl tracking-tight">
              {inspiration.source_type === "image"
                ? "An uploaded image"
                : "A pasted brief"}
            </div>
          )}

          {vibeStatement && (
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty line-clamp-2">
              {vibeStatement}
            </p>
          )}

          {palette.length > 0 && (
            <div className="flex items-center gap-1.5">
              {palette.map((s) => (
                <div
                  key={s.role}
                  className="h-5 w-5 rounded-sm border border-border"
                  style={{ background: s.hex }}
                  title={`${s.role}: ${s.name} ${s.hex}`}
                />
              ))}
              <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {palette.length} swatches
              </span>
            </div>
          )}

          <div className="mt-auto pt-2">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              data-cursor="hover"
            >
              {ctaLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact provenance thumbnail for the dashboard strip.
 * Each thumb represents one captured inspiration; clicking links to the
 * generated stack if there is one, otherwise back to the originating studio
 * so the user can finish the flow.
 */
export function ProvenanceThumb({
  inspiration,
  generatedStackId,
  generatedStackTitle,
}: {
  inspiration: ProvenanceInspiration
  generatedStackId: string | null
  generatedStackTitle: string | null
}) {
  const meta = SOURCE_META[inspiration.source_type]
  const palette = inspiration.signature?.palette ?? []
  const hostname =
    inspiration.source_type === "url" || inspiration.source_type === "og"
      ? safeHostname(inspiration.source_ref)
      : null

  const linked = Boolean(generatedStackId)
  const href = generatedStackId
    ? `/s/${generatedStackId}`
    : inspiration.source_type === "url" || inspiration.source_type === "og"
      ? "/rebuild"
      : "/from-image"

  const primaryLabel =
    generatedStackTitle ??
    hostname ??
    (inspiration.source_type === "image"
      ? "Uploaded image"
      : inspiration.source_type === "paste"
        ? "Pasted brief"
        : "Inspiration")

  return (
    <Link
      href={href}
      className="group block w-[220px] shrink-0 rounded-md border border-border bg-card/40 overflow-hidden transition hover:border-foreground/30"
      data-cursor="hover"
    >
      <div className="relative aspect-[4/3] bg-muted/40 border-b border-border">
        {inspiration.screenshot_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={inspiration.screenshot_url}
            alt={inspiration.signature?.contentSignature ?? primaryLabel}
            className="h-full w-full object-cover transition group-hover:opacity-95"
            loading="lazy"
          />
        ) : palette.length > 0 ? (
          <div className="grid h-full w-full grid-cols-5">
            {palette.map((s) => (
              <div key={s.role} style={{ background: s.hex }} />
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {meta.icon}
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground backdrop-blur">
          {meta.icon}
          {meta.label}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <div className="font-display text-sm tracking-tight leading-tight line-clamp-1">
          {primaryLabel}
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>
            {linked ? "Linked stack" : "Not yet a stack"}
          </span>
          <span className="inline-flex items-center gap-0.5 text-foreground/70 group-hover:text-foreground transition">
            {linked ? "View" : "Resume"}
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}
