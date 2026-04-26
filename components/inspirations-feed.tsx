// ---------------------------------------------------------------------------
// InspirationsFeed — public realtime gallery of captured inspirations.
// ---------------------------------------------------------------------------
//
// Mirrors GalleryFeed but for the `inspirations` table:
//   - URL state for tab + source_type filter (so deep links work)
//   - Realtime INSERT subscription that prepends new public rows
//   - Tabs: Newest | With stack | Captures only
//   - Filter chips by source_type (url / image / og / paste)
//   - Cards render the screenshot (or palette-gradient fallback) + vibe
//     statement. If the inspiration has produced a stack, the card opens
//     /s/[stack-id]; otherwise it stands alone as a "captured signature".
// ---------------------------------------------------------------------------

"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  Clock,
  Sparkles,
  ImageIcon,
  Globe,
  ScrollText,
  ArrowUpRight,
  SlidersHorizontal,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { Signature, SourceType } from "@/lib/signature"

export type PublicInspiration = {
  id: string
  source_type: SourceType
  source_ref: string
  screenshot_url: string | null
  signature: Signature | null
  generated_stack_id: string | null
  created_at: string
  /** Linked stack metadata (joined server-side; nullable). */
  stack: { id: string; headline: string; title: string | null } | null
}

type Tab = "newest" | "with-stack" | "captures"

const SOURCE_OPTIONS: Array<{ id: SourceType; label: string }> = [
  { id: "url", label: "URL" },
  { id: "og", label: "OG" },
  { id: "image", label: "Image" },
  { id: "paste", label: "Notes" },
]

const SOURCE_ICONS: Record<SourceType, typeof Globe> = {
  url: Globe,
  og: Globe,
  image: ImageIcon,
  paste: ScrollText,
}

export function InspirationsFeed({
  initial,
}: {
  initial: PublicInspiration[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const tab = (params.get("tab") as Tab) || "newest"
  const source = (params.get("source") as SourceType | null) || null

  // Live state — kept in sync with new inserts via the realtime channel.
  const [items, setItems] = useState<PublicInspiration[]>(initial)
  const [pulseId, setPulseId] = useState<string | null>(null)
  useEffect(() => setItems(initial), [initial])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("inspirations-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inspirations" },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          // Realtime can't apply RLS-style filters, so guard client-side.
          if (!row || row.is_public !== true) return
          const item: PublicInspiration = {
            id: String(row.id),
            source_type: row.source_type as SourceType,
            source_ref: String(row.source_ref ?? ""),
            screenshot_url: (row.screenshot_url as string | null) ?? null,
            signature: (row.signature as Signature | null) ?? null,
            generated_stack_id:
              (row.generated_stack_id as string | null) ?? null,
            created_at: String(row.created_at ?? new Date().toISOString()),
            // Realtime payload is the raw row — no joined stack metadata.
            // The card falls back to a generic "Captured" caption for new
            // arrivals; a refresh will hydrate the linked stack later.
            stack: null,
          }
          setItems((prev) => dedupe([item, ...prev]).slice(0, 120))
          setPulseId(item.id)
          window.setTimeout(() => setPulseId(null), 4500)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = useMemo(() => {
    let list = items
    if (source) list = list.filter((i) => i.source_type === source)
    if (tab === "with-stack") list = list.filter((i) => i.generated_stack_id)
    if (tab === "captures") list = list.filter((i) => !i.generated_stack_id)
    return list
  }, [items, tab, source])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    })
  }

  function clearAll() {
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  const counts = {
    newest: items.length,
    withStack: items.filter((i) => i.generated_stack_id).length,
    captures: items.filter((i) => !i.generated_stack_id).length,
  }

  const hasFilters = Boolean(source)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <TabButton
          active={tab === "newest"}
          onClick={() => setParam("tab", null)}
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Newest"
          count={counts.newest}
        />
        <TabButton
          active={tab === "with-stack"}
          onClick={() => setParam("tab", "with-stack")}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="With stack"
          count={counts.withStack}
        />
        <TabButton
          active={tab === "captures"}
          onClick={() => setParam("tab", "captures")}
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Captures only"
          count={counts.captures}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Source
        </span>
        {SOURCE_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            active={source === opt.id}
            onClick={() => setParam("source", source === opt.id ? null : opt.id)}
          >
            {opt.label}
          </Chip>
        ))}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="ml-auto h-7 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>
          {filtered.length}{" "}
          {filtered.length === 1 ? "inspiration" : "inspirations"}
          {hasFilters && " match"}
        </span>
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="font-display text-3xl tracking-tight text-balance">
              No inspirations yet.{" "}
              <em className="italic text-muted-foreground">
                Make the first capture public.
              </em>
            </p>
            <Link
              href="/from-image"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Capture an inspiration
            </Link>
          </div>
        ) : (
          <ul
            role="list"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((insp) => (
              <li key={insp.id} role="listitem">
                <InspirationCard
                  inspiration={insp}
                  pulse={insp.id === pulseId}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function InspirationCard({
  inspiration,
  pulse,
}: {
  inspiration: PublicInspiration
  pulse: boolean
}) {
  const { source_type, source_ref, screenshot_url, signature, stack } = inspiration
  const SourceIcon = SOURCE_ICONS[source_type]
  const swatchHexes = (signature?.palette ?? []).map((s) => s.hex)
  const isLinked = Boolean(stack?.id)

  const href = isLinked
    ? `/s/${stack!.id}`
    : source_type === "url" || source_type === "og"
      ? source_ref
      : null

  const caption = isLinked
    ? stack!.title || stack!.headline
    : signature?.vibeStatement || captionFallback(source_type, source_ref)

  const subhead = isLinked
    ? signature?.vibeStatement || "View stack"
    : source_type === "url" || source_type === "og"
      ? safeHostname(source_ref)
      : source_type === "image"
        ? "Image capture"
        : "Captured notes"

  // Stretched-link pattern: relative card, an absolute Link layer for the
  // full click target, content beneath. External URLs need rel/target so we
  // render those as <a>; internal stack links use Next's <Link>.
  const isExternal = !isLinked && (source_type === "url" || source_type === "og")

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card/40 transition hover:border-foreground/30 hover:bg-card ${
        isLinked ? "border-border" : "border-dashed border-border"
      } ${pulse ? "ring-2 ring-primary/40" : ""}`}
    >
      {href && !isExternal && (
        <Link
          href={href}
          aria-label={`Open stack: ${caption}`}
          className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-cursor="hover"
        >
          <span className="sr-only">Open</span>
        </Link>
      )}
      {href && isExternal && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open source: ${subhead}`}
          className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-cursor="hover"
        >
          <span className="sr-only">Open source</span>
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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-[1.02]"
            unoptimized
          />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground backdrop-blur">
          <SourceIcon className="h-3 w-3" aria-hidden />
          {source_type === "og" ? "OG" : source_type}
        </span>
        {isLinked && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary-foreground backdrop-blur">
            <Layers className="h-3 w-3" aria-hidden />
            Stack
          </span>
        )}
        {pulse && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary-foreground">
            <Sparkles className="h-3 w-3" aria-hidden />
            Just landed
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-balance text-base font-medium leading-snug">
          {caption}
        </h3>
        <p className="line-clamp-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {subhead}
        </p>

        {swatchHexes.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5" aria-hidden>
            {swatchHexes.slice(0, 5).map((hex, i) => (
              <span
                key={`${hex}-${i}`}
                className="h-3 w-3 rounded-full border border-border/60"
                style={{ background: hex }}
              />
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{relativeTime(inspiration.created_at)}</span>
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
// Helpers
// ---------------------------------------------------------------------------

function dedupe(items: PublicInspiration[]): PublicInspiration[] {
  const seen = new Set<string>()
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
}

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

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const seconds = Math.max(1, Math.round((now - then) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.round(months / 12)
  return `${years}y ago`
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-cursor="hover"
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      <span
        className={`tabular-nums ${
          active ? "text-primary-foreground/80" : "text-muted-foreground/70"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-cursor="hover"
      className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}
