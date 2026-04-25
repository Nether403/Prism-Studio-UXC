import Link from "next/link"
import { LIBRARIES } from "@/lib/stack-data"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { LibraryDemo } from "@/components/library-demo"
import { Lock } from "lucide-react"

export const metadata = {
  title: "Library — Prism Studio",
  description:
    "A curated index of every front-end library Prism knows about, with categories, tiers, and live micro-demos.",
  alternates: { canonical: "/library" },
  openGraph: {
    title: "Prism Library",
    description:
      "Three.js, GSAP, Tailwind, Framer Motion, Lenis, shadcn/ui — every library Prism composes from, with live demos.",
    type: "website",
    url: "/library",
  },
}

const CATEGORY_ORDER = [
  "framework",
  "3d",
  "motion",
  "scroll",
  "ai",
  "ui",
  "components",
  "styling",
  "assets",
] as const

export default function LibraryIndex() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: LIBRARIES.filter((l) => l.category === cat).sort((a, b) => b.impact - a.impact),
  })).filter((g) => g.items.length > 0)

  return (
    <main className="relative">
      <Nav />

      <section className="relative pt-32 pb-12 md:pt-40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            01 · Library
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-7xl tracking-[-0.04em] leading-[0.95]">
            Every library Prism knows.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground leading-relaxed">
            {LIBRARIES.length} libraries, sorted by category. Each comes with a live demo, docs
            link, and a list of recipes that lean on it.
          </p>
        </div>
      </section>

      <section className="relative pb-24">
        <div className="mx-auto max-w-6xl px-6 space-y-16">
          {grouped.map((g) => (
            <div key={g.category}>
              <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                <span className="text-primary">{g.category}</span>
                <span className="h-px flex-1 bg-border" />
                <span className="tabular-nums">
                  {String(g.items.length).padStart(2, "0")}
                </span>
              </div>

              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((lib) => (
                  <li key={lib.id}>
                    <Link
                      href={`/library/${lib.id}`}
                      className="group block rounded-lg border border-border bg-card/40 p-5 transition hover:border-foreground/30"
                      data-cursor="hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-display text-2xl tracking-tight leading-tight">
                            {lib.name}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                            {lib.tagline}
                          </p>
                        </div>
                        <div className="shrink-0 h-12 w-12 rounded-md border border-border overflow-hidden">
                          <LibraryDemo id={lib.id} category={lib.category} className="h-full w-full" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className="rounded-full border border-border px-2 py-0.5">
                          {lib.tier}
                        </span>
                        <span className="rounded-full border border-border px-2 py-0.5">
                          impact {lib.impact}
                        </span>
                        {lib.requiresAuth && (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" />
                            auth
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <CommandPalette />
    </main>
  )
}
