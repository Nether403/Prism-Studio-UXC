"use client"

import { useEffect, useMemo, useState, useTransition, useDeferredValue } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Fuse from "fuse.js"
import { Search, X, Sparkles, Clock, Trophy, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GalleryGrid, type GalleryItem } from "@/components/gallery-grid"
import { createClient } from "@/lib/supabase/client"
import { LIBRARIES } from "@/lib/stack-data"
import type { Theme } from "@/lib/themes"

type Tab = "trending" | "newest" | "all"

const VIBES = ["minimal", "bold", "editorial", "playful", "experimental"] as const

export function GalleryFeed({
  trending,
  newest,
  allTime,
}: {
  trending: GalleryItem[]
  newest: GalleryItem[]
  allTime: GalleryItem[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [, startTransition] = useTransition()

  // URL-driven state.
  const tab = (params.get("tab") as Tab) || "trending"
  const q = params.get("q") || ""
  const vibe = params.get("vibe") || ""
  const lib = params.get("lib") || ""

  // Local input mirrors the URL but updates as the user types; we push to URL on debounce.
  const [searchInput, setSearchInput] = useState(q)
  const debouncedQuery = useDeferredValue(searchInput)

  useEffect(() => {
    if (debouncedQuery === q) return
    const next = new URLSearchParams(params.toString())
    if (debouncedQuery.trim()) next.set("q", debouncedQuery.trim())
    else next.delete("q")
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  // Realtime: prepend any newly-published stack to the live state of newest/trending.
  const [liveNewest, setLiveNewest] = useState(newest)
  const [liveTrending, setLiveTrending] = useState(trending)
  const [pulseId, setPulseId] = useState<string | null>(null)

  useEffect(() => setLiveNewest(newest), [newest])
  useEffect(() => setLiveTrending(trending), [trending])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("gallery-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stacks" },
        async (payload) => {
          const row = payload.new as Record<string, unknown>
          if (!row || row.published !== true) return
          const item = rowToItem(row)
          if (!item) return
          setLiveNewest((prev) => dedupe([item, ...prev]).slice(0, 60))
          setLiveTrending((prev) => dedupe([item, ...prev]).slice(0, 60))
          setPulseId(item.id)
          window.setTimeout(() => setPulseId(null), 4500)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const baseList = tab === "trending" ? liveTrending : tab === "newest" ? liveNewest : allTime

  // Filter by vibe + library, then fuzzy search.
  const filtered = useMemo(() => {
    let list = baseList
    if (vibe) list = list.filter((s) => s.vibe === vibe)
    if (lib) {
      const libName = LIBRARIES.find((l) => l.id === lib)?.name
      if (libName) list = list.filter((s) => s.stackNames.includes(libName))
    }

    const query = q.trim()
    if (!query) return list

    const fuse = new Fuse(list, {
      keys: [
        { name: "headline", weight: 3 },
        { name: "prompt", weight: 2 },
        { name: "stackNames", weight: 1.5 },
        { name: "vibe", weight: 1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
    })
    return fuse.search(query).map((r) => r.item)
  }, [baseList, q, vibe, lib])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    })
  }

  function clearAll() {
    setSearchInput("")
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  const hasFilters = Boolean(q || vibe || lib)
  const counts = {
    trending: liveTrending.length,
    newest: liveNewest.length,
    all: allTime.length,
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <TabButton
          active={tab === "trending"}
          onClick={() => setParam("tab", null)}
          icon={<Trophy className="h-3.5 w-3.5" />}
          label="Trending"
          count={counts.trending}
        />
        <TabButton
          active={tab === "newest"}
          onClick={() => setParam("tab", "newest")}
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Newest"
          count={counts.newest}
        />
        <TabButton
          active={tab === "all"}
          onClick={() => setParam("tab", "all")}
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="All-time"
          count={counts.all}
        />

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search stacks, libraries, vibes..."
              className="h-9 w-64 pl-9 pr-8"
              aria-label="Search gallery"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Vibe
        </span>
        {VIBES.map((v) => (
          <Chip
            key={v}
            active={vibe === v}
            onClick={() => setParam("vibe", vibe === v ? null : v)}
          >
            {v}
          </Chip>
        ))}

        <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Library
        </span>
        <select
          value={lib}
          onChange={(e) => setParam("lib", e.target.value || null)}
          className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-wider hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
          aria-label="Filter by library"
        >
          <option value="">Any</option>
          {LIBRARIES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

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

      {/* Result count */}
      <div className="mt-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>
          {filtered.length} {filtered.length === 1 ? "stack" : "stacks"}
          {hasFilters && " match"}
        </span>
      </div>

      {/* Grid */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="font-display text-3xl tracking-tight text-balance">
              No matches.{" "}
              <em className="italic text-muted-foreground">Try a different query.</em>
            </p>
            {hasFilters && (
              <Button onClick={clearAll} variant="outline" className="mt-6">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <GalleryGrid stacks={filtered} pulseId={pulseId} />
        )}
      </div>
    </div>
  )
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

function dedupe(items: GalleryItem[]): GalleryItem[] {
  const seen = new Set<string>()
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
}

function rowToItem(row: Record<string, unknown>): GalleryItem | null {
  const stackIds = (row.stack_ids as string[] | null) ?? []
  const libMap = Object.fromEntries(LIBRARIES.map((l) => [l.id, l.name]))
  return {
    id: String(row.id),
    headline: String(row.headline ?? "Untitled"),
    prompt: String(row.prompt ?? ""),
    vibe: String(row.vibe ?? "minimal"),
    impactScore: Number(row.impact_score ?? 0),
    perfBudget: Number(row.perf_budget ?? 0),
    likes: Number(row.likes ?? 0),
    theme: (row.theme as Theme) ?? ({} as Theme),
    stackNames: stackIds.map((id) => libMap[id]).filter(Boolean) as string[],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}
