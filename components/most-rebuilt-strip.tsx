// ---------------------------------------------------------------------------
// MostRebuiltStrip — Phase 5 leaderboard surface for /inspirations.
// ---------------------------------------------------------------------------
//
// Server component. Renders a horizontal strip of public inspirations whose
// `cache_hit_count > 0` — i.e. captures that other people have re-used as
// cross-user cache hits via /api/rebuild and /api/inspire (see migration
// `007_cache_hits.sql` and the `bump_cache_hit(uuid)` SECURITY DEFINER RPC).
//
// Placement: sits at the top of the /inspirations page, between the hero
// copy and the live feed. Hidden entirely when there's nothing to show so
// brand-new accounts don't see an empty leaderboard frame.
//
// Click semantics:
//   - When the leaderboard row has produced a stack, the card opens
//     /s/[stackId] so visitors can read the full breakdown.
//   - Otherwise (capture-only public rows), the card opens the original
//     URL in a new tab — same convention as InspirationsFeed.
//
// The data shape is intentionally a strict subset of the feed's row so the
// page can fetch both with one PostgREST round-trip in parallel.
// ---------------------------------------------------------------------------

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, Flame, Globe, ImageIcon, ScrollText } from "lucide-react"
import type { Signature, SourceType } from "@/lib/signature"

export type MostRebuiltItem = {
  id: string
  source_type: SourceType
  source_ref: string
  screenshot_url: string | null
  signature: Signature | null
  generated_stack_id: string | null
  cache_hit_count: number
  created_at: string
}

const SOURCE_ICONS: Record<SourceType, typeof Globe> = {
  url: Globe,
  og: Globe,
  image: ImageIcon,
  paste: ScrollText,
}

export function MostRebuiltStrip({ items }: { items: MostRebuiltItem[] }) {
  if (items.length === 0) return null

  return (
    <section
      aria-labelledby="most-rebuilt-heading"
      className="relative space-y-5 rounded-2xl border border-border bg-card/40 p-6 md:p-8"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <Flame className="h-3 w-3 text-primary" aria-hidden />
            <span className="h-px w-8 bg-border" />
            <span>Phase 5 · Cross-user cache</span>
          </div>
          <h2
            id="most-rebuilt-heading"
            className="mt-3 font-display text-3xl tracking-[-0.03em] leading-[1] md:text-5xl text-balance"
          >
            Most rebuilt{" "}
            <em className="italic text-muted-foreground">this week.</em>
          </h2>
          <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed text-pretty">
            Captures other people kept rebuilding. Each hit skipped a fresh
            multimodal extraction and re-used the same signature.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {items.length} {items.length === 1 ? "entry" : "entries"}
        </div>
      </header>

      {/*
        Horizontal scroller mirroring <ProvenanceStrip/>: snap-mandatory
        feels right when there are 4–6 cards and you can flick through them
        on a trackpad, but the row degrades gracefully to a static flex
        layout if the parent grows wider.
      */}
      <ol
        className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:thin] snap-x snap-mandatory md:-mx-8 md:px-8"
        role="list"
      >
        {items.map((item, idx) => (
          <li key={item.id} className="snap-start" role="listitem">
            <LeaderboardCard item={item} rank={idx + 1} />
          </li>
        ))}
      </ol>
    </section>
  )
}

function LeaderboardCard({
  item,
  rank,
}: {
  item: MostRebuiltItem
  rank: number
}) {
  const {
    source_type,
    source_ref,
    screenshot_url,
    signature,
    generated_stack_id,
    cache_hit_count,
  } = item

  const SourceIcon = SOURCE_ICONS[source_type]
  const swatchHexes = (signature?.palette ?? []).map((s) => s.hex)
  const isLinked = Boolean(generated_stack_id)
  const href = isLinked
    ? `/s/${generated_stack_id}`
    : source_type === "url" || source_type === "og"
      ? source_ref
      : null
  const isExternal = !isLinked && (source_type === "url" || source_type === "og")
  const caption =
    signature?.vibeStatement?.trim() ||
    captionFallback(source_type, source_ref)
  const subhead =
    source_type === "url" || source_type === "og"
      ? safeHostname(source_ref)
      : source_type === "image"
        ? "Image capture"
        : "Captured notes"

  return (
    <article className="group relative flex w-[260px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background transition hover:border-foreground/30">
      {href && !isExternal && (
        <Link
          href={href}
          aria-label={`#${rank} most rebuilt — open stack: ${caption}`}
          className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-cursor="hover"
        >
          <span className="sr-only">{caption}</span>
        </Link>
      )}
      {href && isExternal && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`#${rank} most rebuilt — open source: ${subhead}`}
          className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-cursor="hover"
        >
          <span className="sr-only">{subhead}</span>
        </a>
      )}

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
            sizes="260px"
            className="object-cover transition group-hover:scale-[1.02]"
            unoptimized
          />
        )}

        {/* Rank chip — tabular-nums so 1, 12, 99 all align tidily. */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-background">
          <span className="tabular-nums">#{rank}</span>
        </span>

        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground backdrop-blur">
          <Flame className="h-3 w-3" aria-hidden />
          <span className="tabular-nums">{cache_hit_count}</span>
          {cache_hit_count === 1 ? "reuse" : "reuses"}
        </span>

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground backdrop-blur">
          <SourceIcon className="h-2.5 w-2.5" aria-hidden />
          {source_type === "og" ? "OG" : source_type}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-balance">
          {caption}
        </h3>
        <p className="line-clamp-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {subhead}
        </p>

        {swatchHexes.length > 0 && (
          <div className="mt-1 flex items-center gap-1" aria-hidden>
            {swatchHexes.slice(0, 5).map((hex, i) => (
              <span
                key={`${hex}-${i}`}
                className="h-2.5 w-2.5 rounded-full border border-border/60"
                style={{ background: hex }}
              />
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{isLinked ? "Open stack" : "Open source"}</span>
          <ArrowUpRight
            className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
            aria-hidden
          />
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Helpers (mirror inspirations-feed.tsx — kept local to avoid a shared util
// file for two trivial functions).
// ---------------------------------------------------------------------------

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function captionFallback(source_type: SourceType, source_ref: string): string {
  if (source_type === "url" || source_type === "og") {
    return safeHostname(source_ref)
  }
  if (source_type === "image") return "Image capture"
  return "Captured notes"
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
