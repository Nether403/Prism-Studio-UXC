import type { Metadata } from "next"
import Link from "next/link"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { RECIPES as recipes } from "@/lib/recipes"
import { ArrowUpRight, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  title: "Recipes — UXC",
  description:
    "Curated, ready-to-build stacks for the work you actually ship. Each recipe is a fully themed Next.js starter you can preview, fork, and download.",
  alternates: { canonical: "/recipes" },
  openGraph: {
    title: "Recipes — UXC",
    description:
      "Editorial portfolios, 3D product pages, AI dashboards. Pre-built stacks with theme tokens, motion, and code already wired.",
    type: "website",
    url: "/recipes",
  },
}

export default function RecipesPage() {
  return (
    <main className="min-h-screen bg-background">
      <CommandPalette />
      <Nav />

      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Index · Recipes
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  {recipes.length} starters
                </span>
              </div>
            </div>
            <div className="md:col-span-9">
              <h1 className="text-balance font-display font-light text-5xl md:text-7xl leading-[0.95] tracking-tight">
                Curated stacks for the<br />
                <em className="font-display italic text-primary">work you ship.</em>
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground leading-relaxed">
                Each recipe pairs a brief, a hand-tuned theme, and the right libraries.
                Preview live, copy as a v0 prompt, or download a working Next.js starter.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative pb-32">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-px bg-border md:grid-cols-2">
            {recipes.map((r, i) => (
              <Link
                key={r.slug}
                href={`/recipes/${r.slug}`}
                data-cursor="hover"
                className="group relative bg-background p-8 md:p-10 transition hover:bg-card/40"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")} · {r.defaultPreview}
                    </div>
                    <h2 className="mt-3 font-display text-3xl md:text-4xl leading-tight tracking-tight">
                      {r.title}
                    </h2>
                    <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
                      {r.tagline}
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>

                {/* Theme swatch strip */}
                <div className="mt-8 flex h-12 overflow-hidden rounded-md border border-border">
                  <div className="flex-1" style={{ background: r.theme.background }} />
                  <div className="flex-1" style={{ background: r.theme.card }} />
                  <div className="flex-1" style={{ background: r.theme.primary }} />
                  <div className="flex-1" style={{ background: r.theme.accent }} />
                  <div className="flex-1" style={{ background: r.theme.foreground }} />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {(r.stackOverride ?? []).slice(0, 5).map((id) => (
                    <span key={id} className="rounded-full border border-border px-2 py-1">
                      {id}
                    </span>
                  ))}
                  {(r.stackOverride?.length ?? 0) > 5 && (
                    <span className="text-muted-foreground/70">
                      +{(r.stackOverride?.length ?? 0) - 5}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
