// ---------------------------------------------------------------------------
// /inspirations — public realtime gallery of community captures.
// ---------------------------------------------------------------------------
//
// Server component. Fetches the most recent public inspirations, joins each
// one to its (optional) generated stack so cards can show a title and
// link straight into /s/[id]. Hands the result to <InspirationsFeed/> which
// owns the realtime subscription, filters, and tabs.
//
// RLS handles visibility — the public-or-owner SELECT policy ensures we only
// hand back rows that anon viewers are allowed to see. We additionally
// filter `is_public = true` on the query to avoid surfacing the viewer's
// own private rows in the public gallery.
// ---------------------------------------------------------------------------

import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { JsonLd, breadcrumbList } from "@/components/json-ld"
import { SITE_URL } from "@/lib/site"
import {
  InspirationsFeed,
  type PublicInspiration,
} from "@/components/inspirations-feed"
import {
  MostRebuiltStrip,
  type MostRebuiltItem,
} from "@/components/most-rebuilt-strip"
import type { Signature, SourceType } from "@/lib/signature"

export const metadata: Metadata = {
  title: "Inspirations — Captured signatures from the wild",
  description:
    "A live feed of websites, OG images, uploaded screenshots, and notes the UXC community has captured into stack signatures.",
  alternates: { canonical: "/inspirations" },
  openGraph: {
    title: "UXC Inspirations",
    description:
      "Live captures the UXC community has turned into stack signatures.",
    type: "website",
    url: `${SITE_URL}/inspirations`,
  },
}

export const revalidate = 30

type InspirationRow = {
  id: string
  source_type: SourceType
  source_ref: string
  screenshot_url: string | null
  signature: Signature | null
  generated_stack_id: string | null
  cache_hit_count: number
  created_at: string
  // PostgREST embedded resource — relationship `inspirations.generated_stack_id → stacks.id`.
  // Returned as an object (single row) because of the FK cardinality.
  stack: { id: string; headline: string; title: string | null } | null
}

type LeaderboardRow = {
  id: string
  source_type: SourceType
  source_ref: string
  screenshot_url: string | null
  signature: Signature | null
  generated_stack_id: string | null
  cache_hit_count: number
  created_at: string
}

export default async function InspirationsPage() {
  const supabase = await createClient()

  // Two queries in parallel:
  //   1. The feed — newest 120 public inspirations, with their linked stack.
  //   2. The leaderboard — top public rows by `cache_hit_count`. Hits the
  //      partial index `inspirations_cache_hits_idx` from migration 007 so
  //      it's a cheap index-only scan even at scale.
  // Splitting them avoids forcing PostgREST to do an ORDER BY over the full
  // public set when we only need 6 leaderboard rows.
  const [{ data, error }, { data: leaderboardData, error: leaderboardError }] =
    await Promise.all([
      supabase
        .from("inspirations")
        .select(
          `id, source_type, source_ref, screenshot_url, signature, generated_stack_id, cache_hit_count, created_at,
           stack:generated_stack_id ( id, headline, title )`,
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("inspirations")
        .select(
          "id, source_type, source_ref, screenshot_url, signature, generated_stack_id, cache_hit_count, created_at",
        )
        .eq("is_public", true)
        .gt("cache_hit_count", 0)
        .order("cache_hit_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),
    ])

  if (error) {
    console.error("[v0] /inspirations query error", error)
  }
  if (leaderboardError) {
    console.error("[v0] /inspirations leaderboard error", leaderboardError)
  }

  const initial: PublicInspiration[] = ((data as InspirationRow[] | null) ?? []).map(
    (row) => ({
      id: row.id,
      source_type: row.source_type,
      source_ref: row.source_ref,
      screenshot_url: row.screenshot_url,
      signature: row.signature,
      generated_stack_id: row.generated_stack_id,
      cache_hit_count: row.cache_hit_count ?? 0,
      created_at: row.created_at,
      stack: row.stack ?? null,
    }),
  )

  const leaderboard: MostRebuiltItem[] = (
    (leaderboardData as LeaderboardRow[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    source_type: row.source_type,
    source_ref: row.source_ref,
    screenshot_url: row.screenshot_url,
    signature: row.signature,
    generated_stack_id: row.generated_stack_id,
    cache_hit_count: row.cache_hit_count ?? 0,
    created_at: row.created_at,
  }))

  return (
    <main className="relative">
      <Nav />

      <JsonLd
        data={[
          breadcrumbList(SITE_URL, [
            { name: "Home", path: "/" },
            { name: "Inspirations", path: "/inspirations" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "UXC Inspirations",
            url: `${SITE_URL}/inspirations`,
            description:
              "Public captures from the UXC community — URLs, OG images, uploads, and notes turned into stack signatures.",
          },
        ]}
      />

      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span className="text-primary">I</span>
            <span className="h-px w-8 bg-border" />
            <span>Public captures</span>
          </div>
          <h1 className="mt-4 font-display text-6xl md:text-8xl tracking-[-0.04em] leading-[0.92] text-balance">
            Captured{" "}
            <em className="italic text-muted-foreground">
              in the
              <br />
              wild.
            </em>
          </h1>
          <p className="mt-6 max-w-xl text-muted-foreground text-lg text-pretty">
            Every URL pasted, image uploaded, OG scraped, and note saved
            becomes a signature. The public ones land here, in real time.
          </p>

          <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/gallery"
              className="font-mono uppercase tracking-wider hover:text-foreground transition"
              data-cursor="hover"
            >
              ← Stack gallery
            </Link>
            <span className="h-px w-6 bg-border" />
            <Link
              href="/from-image"
              className="font-mono uppercase tracking-wider hover:text-foreground transition"
              data-cursor="hover"
            >
              Capture one
            </Link>
          </div>
        </div>
      </section>

      {leaderboard.length > 0 && (
        <section className="relative pb-12">
          <div className="mx-auto max-w-7xl px-6">
            <MostRebuiltStrip items={leaderboard} />
          </div>
        </section>
      )}

      <section className="relative pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-lg border border-dashed border-border" />
            }
          >
            <InspirationsFeed initial={initial} />
          </Suspense>
        </div>
      </section>

      <Footer />
      <CommandPalette />
    </main>
  )
}
