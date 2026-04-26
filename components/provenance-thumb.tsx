// ---------------------------------------------------------------------------
// ProvenanceThumb / ProvenanceStrip — dashboard surface for inspirations.
// ---------------------------------------------------------------------------
//
// Server components. The strip is a horizontal scroller that renders each
// inspiration as a small thumb. Two visual variants:
//
//   - Linked   — the inspiration produced a stack. Click → /s/[stackId].
//                Shows the linked stack's title underneath.
//   - Pending  — no generated_stack_id yet. Click → originating studio
//                (/rebuild for url/og, /from-image for image/paste) so the
//                owner can pick up where they left off. Rendered with a
//                dashed border to read as "draft".
// ---------------------------------------------------------------------------

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, Globe, ImageIcon, Lock, ScrollText } from "lucide-react"
import type { Signature, SourceType } from "@/lib/signature"

export type ProvenanceInspiration = {
  id: string
  source_type: SourceType
  source_ref: string
  screenshot_url: string | null
  signature: Signature | null
  generated_stack_id: string | null
  is_public: boolean
  created_at: string
}

export type ProvenanceStripProps = {
  inspirations: ProvenanceInspiration[]
  /**
   * Map of generated_stack_id → linked stack's display title. The dashboard
   * already fetches the user's stacks for the main list, so passing this in
   * avoids an N+1 lookup here.
   */
  stacksById: Record<string, { title: string | null; headline: string }>
}

export function ProvenanceStrip({ inspirations, stacksById }: ProvenanceStripProps) {
  if (inspirations.length === 0) return null

  return (
    <section aria-labelledby="provenance-strip-heading" className="space-y-4">
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span className="text-primary">I</span>
        <span className="h-px w-8 bg-border" />
        <span id="provenance-strip-heading">Captures</span>
        <span className="ml-2 text-foreground/70 tabular-nums normal-case">
          {inspirations.length}
        </span>
      </div>

      {/*
        Horizontal scroller. snap-x for tactile "card per swipe" feel on
        trackpads/touch. -mx-6 px-6 pulls the row out to the section edges so
        the first card aligns with the dashboard heading above.
      */}
      <div
        className="-mx-6 overflow-x-auto px-6 pb-2 [scrollbar-width:thin] snap-x snap-mandatory"
        role="list"
      >
        <ul className="flex gap-3 w-max">
          {inspirations.map((insp) => (
            <li key={insp.id} className="snap-start" role="listitem">
              <ProvenanceThumb
                inspiration={insp}
                linkedStack={
                  insp.generated_stack_id ? stacksById[insp.generated_stack_id] ?? null : null
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

type ProvenanceThumbProps = {
  inspiration: ProvenanceInspiration
  linkedStack: { title: string | null; headline: string } | null
}

export function ProvenanceThumb({ inspiration, linkedStack }: ProvenanceThumbProps) {
  const { source_type, source_ref, screenshot_url, signature, generated_stack_id, is_public } =
    inspiration
  const SourceIcon = SOURCE_ICONS[source_type]

  // The destination depends on whether the inspiration produced a stack.
  // Linked → deep-link to the share page. Pending → resume in the originating
  // studio so the owner can re-roll it without re-uploading.
  const isLinked = Boolean(generated_stack_id && linkedStack)
  const href = isLinked
    ? `/s/${generated_stack_id}`
    : source_type === "url" || source_type === "og"
      ? "/rebuild"
      : "/from-image"

  const caption = isLinked
    ? linkedStack!.title || linkedStack!.headline
    : pendingCaption(source_type, source_ref)

  const hint = isLinked
    ? "Open stack"
    : source_type === "url" || source_type === "og"
      ? "Resume in Rebuild"
      : "Resume in From-Image"

  // Palette gradient fallback when the screenshot is missing (e.g. paste).
  const swatchHexes = (signature?.palette ?? []).map((s) => s.hex)

  return (
    <Link
      href={href}
      data-cursor="hover"
      className={`group relative block w-[220px] overflow-hidden rounded-lg border bg-card/40 transition hover:border-foreground/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isLinked ? "border-border" : "border-dashed border-border"
      }`}
      aria-label={`${SOURCE_LABELS[source_type]}: ${caption}. ${hint}.`}
    >
      <div
        className="relative aspect-[5/4] w-full bg-secondary"
        style={
          !screenshot_url && swatchHexes.length > 0
            ? { backgroundImage: paletteGradient(swatchHexes) }
            : undefined
        }
      >
        {screenshot_url && (
          <Image
            src={screenshot_url}
            alt=""
            fill
            sizes="220px"
            className="object-cover transition group-hover:scale-[1.02]"
            unoptimized
          />
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground backdrop-blur">
          <SourceIcon className="h-2.5 w-2.5" aria-hidden />
          {SOURCE_LABELS[source_type]}
        </span>
        {!is_public && (
          <span
            className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-background/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground backdrop-blur"
            title="Private to you"
            aria-label="Private to you"
          >
            <Lock className="h-2.5 w-2.5" aria-hidden />
          </span>
        )}
        {!isLinked && (
          <span className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary backdrop-blur">
            Pending
          </span>
        )}
      </div>

      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-medium leading-snug text-balance">
            {caption}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {hint}
          </div>
        </div>
        <ArrowUpRight
          className="h-3.5 w-3.5 shrink-0 translate-x-0 -translate-y-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Helpers (kept local — provenance-card has its own copies because they're
// trivial and importing across components would create a cycle later if one
// of these grows into a full presentational helper).
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<SourceType, string> = {
  url: "URL",
  og: "OG",
  image: "Image",
  paste: "Notes",
}

const SOURCE_ICONS: Record<SourceType, typeof Globe> = {
  url: Globe,
  og: Globe,
  image: ImageIcon,
  paste: ScrollText,
}

function pendingCaption(source_type: SourceType, source_ref: string): string {
  if (source_type === "url" || source_type === "og") {
    try {
      return new URL(source_ref).hostname.replace(/^www\./, "")
    } catch {
      return source_ref
    }
  }
  if (source_type === "image") return "Image upload"
  return "Pasted notes"
}

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
