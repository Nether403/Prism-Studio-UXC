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
import { ArrowUpRight, GitBranch, Globe, ImageIcon, Lock, ScrollText } from "lucide-react"
import type { Signature, SourceType } from "@/lib/signature"
import { InspirationPrivacyToggle } from "@/components/inspiration-privacy-toggle"

export type ProvenanceInspiration = {
  id: string
  source_type: SourceType
  source_ref: string
  screenshot_url: string | null
  signature: Signature | null
  generated_stack_id: string | null
  is_public: boolean
  created_at: string
  /**
   * v9 lineage column — when set, this row is a "More like this" variant
   * derived from another inspiration. The strip uses this to render variants
   * adjacent to their parent and to badge them with a "Variant of …" hint.
   */
  parent_inspiration_id?: string | null
}

/**
 * Pointer used by `ProvenanceThumb` to render the "Variant of …" hint when
 * a row is a lineage descendant whose parent is also in the same strip.
 * Kept minimal so callers don't have to forward the full parent row.
 */
export type VariantOfHint = {
  /** Parent inspiration id — used as the parent-thumb anchor target. */
  parentId: string
  /** Short label for the badge — usually the parent's hostname or filename. */
  label: string
  /** This variant's 1-indexed position among its parent's children. */
  index: number
  /** Total number of variants this parent has in the current strip. */
  total: number
}

export type ProvenanceStripProps = {
  inspirations: ProvenanceInspiration[]
  /**
   * Map of generated_stack_id → linked stack's display title. The dashboard
   * already fetches the user's stacks for the main list, so passing this in
   * avoids an N+1 lookup here.
   */
  stacksById: Record<string, { title: string | null; headline: string }>
  /**
   * When true, each thumb shows a privacy toggle that flips
   * inspirations.is_public. Default false. The dashboard sets this to true
   * because the strip is owner-scoped (RLS already enforces ownership for
   * the underlying server action — this prop is purely a UI gate).
   */
  editable?: boolean
}

export function ProvenanceStrip({
  inspirations,
  stacksById,
  editable = false,
}: ProvenanceStripProps) {
  if (inspirations.length === 0) return null

  // ---------------------------------------------------------------------
  // Lineage grouping (v9 / Phase 3).
  //
  // We re-order the strip so each variant sits immediately after its parent.
  // Roots are emitted in chronological order (newest first); within a root,
  // children are emitted oldest → newest so the variant numbering reads
  // naturally ("Variant 1" is the first re-roll, "Variant N" is the latest).
  //
  // A row whose `parent_inspiration_id` points outside the fetched set is
  // treated as a root in this view — we can't render a "Variant of …" badge
  // we can't anchor, and the user usually still wants to see it as a
  // first-class capture in their workspace.
  // ---------------------------------------------------------------------
  const idsInSet = new Set(inspirations.map((i) => i.id))
  const childrenByParent = new Map<string, ProvenanceInspiration[]>()
  const roots: ProvenanceInspiration[] = []

  for (const insp of inspirations) {
    const parentId = insp.parent_inspiration_id
    if (parentId && idsInSet.has(parentId)) {
      const arr = childrenByParent.get(parentId) ?? []
      arr.push(insp)
      childrenByParent.set(parentId, arr)
    } else {
      roots.push(insp)
    }
  }

  // Roots already arrive newest-first from the page-level query; we keep
  // that order. Children: oldest → newest so badge numbering is intuitive.
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  type StripItem = { insp: ProvenanceInspiration; variantOf: VariantOfHint | null }
  const ordered: StripItem[] = []
  for (const root of roots) {
    ordered.push({ insp: root, variantOf: null })
    const kids = childrenByParent.get(root.id) ?? []
    const total = kids.length
    kids.forEach((child, i) => {
      ordered.push({
        insp: child,
        variantOf: {
          parentId: root.id,
          label: parentLabel(root),
          index: i + 1,
          total,
        },
      })
    })
  }

  const variantTotal = inspirations.length - roots.length

  return (
    <section aria-labelledby="provenance-strip-heading" className="space-y-4">
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span className="text-primary">I</span>
        <span className="h-px w-8 bg-border" />
        <span id="provenance-strip-heading">Captures</span>
        <span className="ml-2 text-foreground/70 tabular-nums normal-case">
          {inspirations.length}
        </span>
        {variantTotal > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/40 px-2 py-0.5 normal-case tracking-wider text-muted-foreground">
            <GitBranch className="h-2.5 w-2.5" aria-hidden />
            <span className="tabular-nums text-foreground/80">{variantTotal}</span>
            <span>variant{variantTotal === 1 ? "" : "s"}</span>
          </span>
        )}
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
        <ul className="flex gap-3 w-max items-start">
          {ordered.map(({ insp, variantOf }) => (
            <li key={insp.id} className="snap-start" role="listitem">
              <ProvenanceThumb
                inspiration={insp}
                linkedStack={
                  insp.generated_stack_id ? stacksById[insp.generated_stack_id] ?? null : null
                }
                editable={editable}
                variantOf={variantOf}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/**
 * Short, human-friendly label for a parent inspiration — used in the
 * "Variant of …" badge on child thumbs.
 */
function parentLabel(parent: ProvenanceInspiration): string {
  if (parent.source_type === "url" || parent.source_type === "og") {
    try {
      return new URL(parent.source_ref).hostname.replace(/^www\./, "")
    } catch {
      return parent.source_ref
    }
  }
  if (parent.source_type === "image") return "image"
  return "notes"
}

type ProvenanceThumbProps = {
  inspiration: ProvenanceInspiration
  linkedStack: { title: string | null; headline: string } | null
  /** Render an interactive privacy toggle when the viewer owns this row. */
  editable?: boolean
  /**
   * When set, renders this thumb as a lineage descendant — adds a "Variant
   * N/M of {label}" badge on the media area and a thin primary-tinted left
   * border to visually nest it next to its parent in the strip.
   */
  variantOf?: VariantOfHint | null
}

export function ProvenanceThumb({
  inspiration,
  linkedStack,
  editable = false,
  variantOf = null,
}: ProvenanceThumbProps) {
  const { id, source_type, source_ref, screenshot_url, signature, generated_stack_id, is_public } =
    inspiration
  const SourceIcon = SOURCE_ICONS[source_type]
  const isVariant = Boolean(variantOf)

  // The destination depends on whether the inspiration produced a stack.
  // Linked → deep-link to the share page. Pending → resume in the originating
  // studio so the owner can re-roll it without re-uploading. URL/OG inputs
  // pass the original source via ?url=… so RebuildStudio can prefill.
  const isLinked = Boolean(generated_stack_id && linkedStack)
  const href = isLinked
    ? `/s/${generated_stack_id}`
    : source_type === "url" || source_type === "og"
      ? `/rebuild?url=${encodeURIComponent(source_ref)}`
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

  // ---------------------------------------------------------------------
  // Stretched-link pattern. We can't put an interactive <button> inside an
  // <a>, so instead the card is a relative div containing:
  //   1. an absolute <Link> at z-10 that covers the whole card (the click
  //      target),
  //   2. visual content rendered normally beneath it,
  //   3. interactive overlays (privacy toggle) at z-20 that sit above the
  //      stretched link and capture their own clicks.
  // ---------------------------------------------------------------------
  // Variant lineage cue: a thin primary-tinted left rail + a slightly
  // narrower card so a row of "parent + variants" reads as one nested unit
  // in the horizontal scroller without breaking the existing card grid.
  const variantClasses = isVariant
    ? "w-[200px] border-l-2 border-l-primary/60"
    : "w-[220px]"

  return (
    <div
      className={`group relative block overflow-hidden rounded-lg border bg-card/40 transition hover:border-foreground/30 hover:bg-card ${variantClasses} ${
        isLinked ? "border-border" : "border-dashed border-border"
      }`}
    >
      <Link
        href={href}
        data-cursor="hover"
        aria-label={
          isVariant
            ? `Variant ${variantOf!.index} of ${variantOf!.total} from ${variantOf!.label}: ${caption}. ${hint}.`
            : `${SOURCE_LABELS[source_type]}: ${caption}. ${hint}.`
        }
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="sr-only">{caption}</span>
      </Link>

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

        {/*
          Top-right slot: editable mode renders the live privacy toggle;
          read-only mode falls back to a static lock badge when the row is
          private (and renders nothing when it's public — the absence of a
          chip is the "public" state in that mode).
        */}
        {editable ? (
          <InspirationPrivacyToggle inspirationId={id} initialPublic={is_public} />
        ) : (
          !is_public && (
            <span
              className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-background/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground backdrop-blur"
              title="Private to you"
              aria-label="Private to you"
            >
              <Lock className="h-2.5 w-2.5" aria-hidden />
            </span>
          )
        )}

        {isVariant && (
          <span
            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary-foreground backdrop-blur"
            title={`Variant ${variantOf!.index} of ${variantOf!.total} from ${variantOf!.label}`}
          >
            <GitBranch className="h-2.5 w-2.5" aria-hidden />
            {variantOf!.index}/{variantOf!.total}
          </span>
        )}

        {!isLinked && !isVariant && (
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
            {isVariant ? `Variant of ${variantOf!.label}` : hint}
          </div>
        </div>
        <ArrowUpRight
          className="h-3.5 w-3.5 shrink-0 translate-x-0 -translate-y-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </div>
    </div>
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
