import { notFound } from "next/navigation"
import Link from "next/link"
import { LIBRARIES } from "@/lib/stack-data"
import { RECIPES } from "@/lib/recipes"
import { createClient } from "@/lib/supabase/server"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { LibraryDemo } from "@/components/library-demo"
import { Badge } from "@/components/ui/badge"
import { JsonLd } from "@/components/json-ld"
import { ExternalLink, Lock, Heart, GitFork } from "lucide-react"
import type { Theme } from "@/lib/themes"
import { SITE_URL } from "@/lib/site"

export const revalidate = 300

export function generateStaticParams() {
  return LIBRARIES.map((l) => ({ id: l.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lib = LIBRARIES.find((l) => l.id === id)
  if (!lib) return { title: "Library not found · UXC" }
  const ogUrl = `/api/og/library/${lib.id}`
  const canonical = `/library/${lib.id}`
  return {
    title: `${lib.name} — ${lib.tagline} · UXC`,
    description: lib.description,
    alternates: { canonical },
    openGraph: {
      title: `${lib.name} on UXC`,
      description: lib.description,
      type: "article",
      url: canonical,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${lib.name} on UXC`,
      description: lib.description,
      images: [ogUrl],
    },
  }
}

type StackPreview = {
  id: string
  title: string | null
  headline: string
  vibe: string
  likes: number
  fork_count: number
  theme: Theme | null
}

export default async function LibraryDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lib = LIBRARIES.find((l) => l.id === id)
  if (!lib) notFound()

  // Pairs: count co-occurrences of this library across recipes
  const pairCounts = new Map<string, number>()
  for (const r of RECIPES) {
    const ids = r.stackOverride ?? []
    if (!ids.includes(lib.id)) continue
    for (const other of ids) {
      if (other === lib.id) continue
      pairCounts.set(other, (pairCounts.get(other) ?? 0) + 1)
    }
  }
  const pairs = [...pairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([otherId, count]) => ({
      lib: LIBRARIES.find((l) => l.id === otherId)!,
      count,
    }))
    .filter((p) => p.lib)

  // Recipes featuring this library
  const usingRecipes = RECIPES.filter((r) => (r.stackOverride ?? []).includes(lib.id))

  // Published gallery stacks featuring this library
  const supabase = await createClient()
  const { data: gallery } = await supabase
    .from("stacks")
    .select("id,title,headline,vibe,likes,fork_count,theme,stack_ids")
    .contains("stack_ids", [lib.id])
    .eq("published", true)
    .order("likes", { ascending: false })
    .limit(8)
  const galleryStacks: StackPreview[] = (gallery ?? []) as StackPreview[]

  return (
    <main className="relative">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Library", item: `${SITE_URL}/library` },
              {
                "@type": "ListItem",
                position: 2,
                name: lib.name,
                item: `${SITE_URL}/library/${lib.id}`,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: lib.name,
            description: lib.description,
            applicationCategory: lib.category,
            operatingSystem: "Web",
            url: lib.url,
            offers: {
              "@type": "Offer",
              price: lib.tier === "free" ? "0" : "0",
              priceCurrency: "USD",
            },
          },
        ]}
      />
      <Nav />

      <section className="relative pt-32 pb-12 md:pt-40">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <Link href="/library" className="text-primary hover:underline" data-cursor="hover">
              ← Library
            </Link>
            <span className="h-px w-8 bg-border" />
            <span>{lib.category}</span>
          </div>

          <div className="mt-6 grid gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <h1 className="font-display text-6xl md:text-8xl tracking-[-0.04em] leading-[0.9]">
                {lib.name}
              </h1>
              <p className="mt-4 font-display italic text-xl md:text-2xl text-muted-foreground leading-snug text-pretty">
                {lib.tagline}.
              </p>
              <p className="mt-6 max-w-2xl text-pretty leading-relaxed">{lib.description}</p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                  {lib.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] uppercase tracking-wider ${
                    lib.tier === "free"
                      ? ""
                      : "border-accent/40 text-accent"
                  }`}
                >
                  {lib.tier}
                </Badge>
                {lib.requiresAuth && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase tracking-wider gap-1"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    requires auth
                  </Badge>
                )}
                {lib.tags.slice(0, 6).map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={lib.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
                  data-cursor="hover"
                >
                  Official docs <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Link
                  href={`/?lib=${lib.id}#generator`}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                  data-cursor="hover"
                >
                  Generate a stack with {lib.name} →
                </Link>
              </div>

              {/* impact + weight meters */}
              <div className="mt-10 grid gap-3 sm:grid-cols-2 max-w-md">
                <Meter label="Visual impact" value={lib.impact * 10} accent="primary" />
                <Meter label="Bundle weight" value={lib.weight * 10} accent="accent" />
              </div>
            </div>

            <aside className="md:col-span-5">
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="aspect-square w-full overflow-hidden rounded-md border border-border">
                  <LibraryDemo id={lib.id} category={lib.category} className="h-full w-full" />
                </div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Live demo · {lib.name.toLowerCase()}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Frequently paired with */}
      {pairs.length > 0 && (
        <section className="relative pt-12 pb-12 border-t border-border">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span className="text-primary">02</span>
              <span className="h-px w-8 bg-border" />
              <span>Frequently paired with</span>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pairs.map(({ lib: other, count }) => (
                <li key={other.id}>
                  <Link
                    href={`/library/${other.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-card/40 px-4 py-3 transition hover:border-foreground/30"
                    data-cursor="hover"
                  >
                    <div>
                      <div className="font-medium">{other.name}</div>
                      <div className="text-xs text-muted-foreground">{other.tagline}</div>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                      ×{count}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Recipes using it */}
      {usingRecipes.length > 0 && (
        <section className="relative pt-12 pb-12 border-t border-border">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span className="text-primary">03</span>
              <span className="h-px w-8 bg-border" />
              <span>Recipes featuring {lib.name}</span>
            </div>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {usingRecipes.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/recipes/${r.slug}`}
                    className="block rounded-lg border border-border bg-card/40 p-5 transition hover:border-foreground/30"
                    data-cursor="hover"
                  >
                    <div
                      className="h-1.5 w-full rounded-full mb-4"
                      style={{
                        background: `linear-gradient(90deg, ${r.theme.primary}, ${r.theme.accent})`,
                      }}
                    />
                    <h3 className="font-display text-2xl tracking-tight">{r.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {r.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Gallery stacks using it */}
      {galleryStacks.length > 0 && (
        <section className="relative pt-12 pb-24 border-t border-border">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span className="text-primary">04</span>
              <span className="h-px w-8 bg-border" />
              <span>Stacks in the gallery</span>
            </div>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {galleryStacks.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/s/${s.id}`}
                    className="block rounded-lg border border-border bg-card/40 p-5 transition hover:border-foreground/30"
                    data-cursor="hover"
                  >
                    <div
                      className="h-1.5 w-full rounded-full mb-4"
                      style={{
                        background: `linear-gradient(90deg, ${
                          s.theme?.primary ?? "var(--primary)"
                        }, ${s.theme?.accent ?? "var(--accent)"})`,
                      }}
                    />
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      /{s.id} · {s.vibe}
                    </div>
                    <h3 className="mt-1 font-display text-2xl tracking-tight leading-tight">
                      {s.title || s.headline}
                    </h3>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span className="tabular-nums">{s.likes}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        <span className="tabular-nums">{s.fork_count}</span>
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Footer />
      <CommandPalette />
    </main>
  )
}

function Meter({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: "primary" | "accent"
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={accent === "primary" ? "h-full bg-primary" : "h-full bg-accent"}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
