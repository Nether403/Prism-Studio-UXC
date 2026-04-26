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
import type { Signature, SourceType } from "@/lib/signature"

export const metadata: Metadata = {
  title: "Inspirations — Captured signatures from the wild",
  description:
    "A live feed of websites, OG images, uploaded screenshots, and notes the Prism community has captured into stack signatures.",
  alternates: { canonical: "/inspirations" },
  openGraph: {
    title: "Prism Inspirations",
    description:
      "Live captures the Prism community has turned into stack signatures.",
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
  created_at: string
  // PostgREST embedded resource — relationship `inspirations.generated_stack_id → stacks.id`.
  // Returned as an object (single row) because of the FK cardinality.
  stack: { id: string; headline: string; title: string | null } | null
}

export default async function InspirationsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("inspirations")
    .select(
      `id, source_type, source_ref, screenshot_url, signature, generated_stack_id, created_at,
       stack:generated_stack_id ( id, headline, title )`,
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(120)

  if (error) {
    console.error("[v0] /inspirations query error", error)
  }

  const initial: PublicInspiration[] = ((data as InspirationRow[] | null) ?? []).map(
    (row) => ({
      id: row.id,
      source_type: row.source_type,
      source_ref: row.source_ref,
      screenshot_url: row.screenshot_url,
      signature: row.signature,
      generated_stack_id: row.generated_stack_id,
      created_at: row.created_at,
      stack: row.stack ?? null,
    }),
  )

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
            name: "Prism Inspirations",
            url: `${SITE_URL}/inspirations`,
            description:
              "Public captures from the Prism community — URLs, OG images, uploads, and notes turned into stack signatures.",
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
