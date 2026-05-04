import type { Metadata } from "next"
import Link from "next/link"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { JsonLd, breadcrumbList } from "@/components/json-ld"
import { CHANGELOG } from "@/lib/changelog"
import { SITE_URL, SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: "Changelog",
  description: `What shipped, version by version. ${SITE.shortDescription}`,
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "UXC Changelog",
    description: "What shipped, version by version.",
    type: "website",
    url: `${SITE_URL}/changelog`,
  },
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function ChangelogPage() {
  return (
    <main className="relative">
      <Nav />

      <JsonLd
        data={[
          breadcrumbList(SITE_URL, [
            { name: "Home", path: "/" },
            { name: "Changelog", path: "/changelog" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "UXC Changelog",
            url: `${SITE_URL}/changelog`,
            blogPost: CHANGELOG.map((c) => ({
              "@type": "BlogPosting",
              headline: `${c.version} — ${c.title}`,
              datePublished: c.date,
              url: `${SITE_URL}/changelog/${c.version}`,
              description: c.summary,
            })),
          },
        ]}
      />

      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span className="text-primary">CL</span>
            <span className="h-px w-8 bg-border" />
            <span>Changelog</span>
          </div>
          <h1 className="mt-4 font-display text-6xl md:text-8xl tracking-[-0.04em] leading-[0.92] text-balance">
            What shipped,
            <br />
            <em className="italic text-muted-foreground">version by version.</em>
          </h1>
          <p className="mt-6 max-w-xl text-muted-foreground text-lg text-pretty">
            Every meaningful change to UXC, in reverse-chronological order. Subscribe via{" "}
            <Link href="/feed.xml" className="underline underline-offset-4 hover:text-foreground">
              RSS
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="relative pb-32">
        <div className="mx-auto max-w-4xl px-6">
          <ol className="relative border-l border-border pl-8 space-y-16">
            {CHANGELOG.map((entry) => (
              <li key={entry.version} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[37px] top-1.5 grid h-4 w-4 place-items-center rounded-full bg-background ring-2 ring-border"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>

                <div className="flex flex-wrap items-baseline gap-3">
                  <Link
                    href={`/changelog/${entry.version}`}
                    className="font-mono text-xs uppercase tracking-[0.3em] text-primary hover:underline underline-offset-4"
                    data-cursor="hover"
                  >
                    {entry.version}
                  </Link>
                  <time className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {fmtDate(entry.date)}
                  </time>
                </div>

                <h2 className="mt-2 font-display text-4xl tracking-[-0.02em] leading-[1.05]">
                  <Link
                    href={`/changelog/${entry.version}`}
                    className="hover:text-primary transition"
                    data-cursor="hover"
                  >
                    {entry.title}
                  </Link>
                </h2>

                <p className="mt-3 max-w-2xl text-muted-foreground text-pretty">{entry.summary}</p>

                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {entry.highlights.map((h) => (
                    <li
                      key={h.title}
                      className="rounded-lg border border-border bg-card/40 p-4"
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        {h.title}
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-pretty">{h.body}</div>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/changelog/${entry.version}`}
                  className="mt-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
                  data-cursor="hover"
                >
                  Read full notes →
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Footer />
      <CommandPalette />
    </main>
  )
}
