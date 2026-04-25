import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { JsonLd, breadcrumbList } from "@/components/json-ld"
import { CHANGELOG, getChangelogEntry } from "@/lib/changelog"
import { SITE_URL } from "@/lib/site"

export function generateStaticParams() {
  return CHANGELOG.map((c) => ({ version: c.version }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ version: string }>
}): Promise<Metadata> {
  const { version } = await params
  const entry = getChangelogEntry(version)
  if (!entry) return { title: "Not found" }
  const title = `${entry.version} — ${entry.title}`
  const url = `${SITE_URL}/changelog/${entry.version}`
  return {
    title,
    description: entry.summary,
    alternates: { canonical: `/changelog/${entry.version}` },
    openGraph: {
      title,
      description: entry.summary,
      type: "article",
      url,
      publishedTime: entry.date,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: entry.summary,
    },
  }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default async function ChangelogEntryPage({
  params,
}: {
  params: Promise<{ version: string }>
}) {
  const { version } = await params
  const entry = getChangelogEntry(version)
  if (!entry) notFound()

  const idx = CHANGELOG.findIndex((c) => c.version === version)
  const newer = idx > 0 ? CHANGELOG[idx - 1] : null
  const older = idx < CHANGELOG.length - 1 ? CHANGELOG[idx + 1] : null

  return (
    <main className="relative">
      <Nav />

      <JsonLd
        data={[
          breadcrumbList(SITE_URL, [
            { name: "Home", path: "/" },
            { name: "Changelog", path: "/changelog" },
            { name: entry.version, path: `/changelog/${entry.version}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: `${entry.version} — ${entry.title}`,
            description: entry.summary,
            datePublished: entry.date,
            dateModified: entry.date,
            url: `${SITE_URL}/changelog/${entry.version}`,
            author: { "@type": "Organization", name: "Prism" },
            publisher: { "@type": "Organization", name: "Prism" },
          },
        ]}
      />

      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            href="/changelog"
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
            data-cursor="hover"
          >
            ← Changelog
          </Link>

          <div className="mt-8 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              {entry.version}
            </span>
            <time className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {fmtDate(entry.date)}
            </time>
          </div>

          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-[-0.04em] leading-[0.95] text-balance">
            {entry.title}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-pretty">{entry.summary}</p>
        </div>
      </section>

      <section className="relative pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-10">
            {entry.highlights.map((h, i) => (
              <article key={h.title} className="border-l-2 border-primary/30 pl-6 py-1">
                <div className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  <span className="text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-px w-6 bg-border" />
                  <span>Highlight</span>
                </div>
                <h2 className="mt-2 font-display text-2xl tracking-tight">{h.title}</h2>
                <p className="mt-3 leading-relaxed text-pretty">{h.body}</p>
              </article>
            ))}
          </div>

          {entry.note && (
            <div className="mt-12 rounded-lg border border-dashed border-border bg-card/40 p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Note
              </div>
              <p className="mt-2 text-sm leading-relaxed text-pretty">{entry.note}</p>
            </div>
          )}
        </div>
      </section>

      <section className="relative pb-32">
        <div className="mx-auto max-w-3xl px-6 grid gap-3 sm:grid-cols-2">
          {newer ? (
            <Link
              href={`/changelog/${newer.version}`}
              className="rounded-lg border border-border bg-card/40 p-5 transition hover:border-primary/40"
              data-cursor="hover"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Newer · {newer.version}
              </div>
              <div className="mt-2 font-display text-xl tracking-tight">{newer.title}</div>
              <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{newer.summary}</div>
            </Link>
          ) : (
            <span />
          )}
          {older && (
            <Link
              href={`/changelog/${older.version}`}
              className="rounded-lg border border-border bg-card/40 p-5 transition hover:border-primary/40 sm:text-right"
              data-cursor="hover"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Older · {older.version}
              </div>
              <div className="mt-2 font-display text-xl tracking-tight">{older.title}</div>
              <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{older.summary}</div>
            </Link>
          )}
        </div>
      </section>

      <Footer />
      <CommandPalette />
    </main>
  )
}
