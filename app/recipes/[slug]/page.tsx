import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { JsonLd } from "@/components/json-ld"
import { RECIPES, getRecipe } from "@/lib/recipes"
import { recommend } from "@/lib/recommend"
import { LIBRARIES as libraries } from "@/lib/stack-data"
import { RecipeApply } from "@/components/recipe-apply"
import { RecipeBody } from "@/components/recipe-body"
import { SITE_URL } from "@/lib/site"
import { ArrowLeft, ArrowUpRight } from "lucide-react"

export function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const recipe = getRecipe(slug)
  if (!recipe) return {}
  const title = `${recipe.title} — UXC Recipe`
  const ogUrl = `/api/og/recipe/${recipe.slug}`
  const canonical = `/recipes/${recipe.slug}`
  return {
    title,
    description: recipe.tagline,
    alternates: { canonical },
    openGraph: {
      title,
      description: recipe.tagline,
      type: "article",
      url: canonical,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: recipe.tagline,
      images: [ogUrl],
    },
  }
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const recipe = getRecipe(slug)
  if (!recipe) notFound()

  // Run the recommendation engine on the recipe's brief, then optionally
  // override with the curated stack list for stable, hand-picked results.
  const baseRec = recommend(recipe.input)
  const stack = recipe.stackOverride
    ? (recipe.stackOverride
        .map((id) => libraries.find((l) => l.id === id))
        .filter(Boolean) as typeof baseRec.stack)
    : baseRec.stack

  const recommendation = { ...baseRec, stack }

  // Cross-link to other recipes
  const others = RECIPES.filter((r) => r.slug !== recipe.slug).slice(0, 3)

  return (
    <main className="min-h-screen bg-background">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Recipes", item: `${SITE_URL}/recipes` },
              {
                "@type": "ListItem",
                position: 2,
                name: recipe.title,
                item: `${SITE_URL}/recipes/${recipe.slug}`,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: recipe.title,
            description: recipe.tagline,
            mainEntityOfPage: `${SITE_URL}/recipes/${recipe.slug}`,
            image: `${SITE_URL}/api/og/recipe/${recipe.slug}`,
            author: { "@type": "Organization", name: "UXC" },
            publisher: { "@type": "Organization", name: "UXC" },
          },
        ]}
      />
      <CommandPalette />
      <Nav />

      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="container mx-auto max-w-6xl px-6">
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition hover:text-foreground"
            data-cursor="hover"
          >
            <ArrowLeft className="h-3 w-3" />
            All recipes
          </Link>

          <div className="mt-8 grid gap-12 md:grid-cols-12">
            <div className="md:col-span-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Recipe · {recipe.defaultPreview}
              </div>
              <div
                className="mt-4 h-32 w-full rounded-md border border-border"
                style={{ background: recipe.thumbColor }}
                aria-hidden="true"
              />
            </div>
            <div className="md:col-span-9">
              <h1 className="text-balance font-display font-light text-5xl md:text-7xl leading-[0.95] tracking-tight">
                {recipe.title}
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-xl text-muted-foreground leading-relaxed">
                {recipe.tagline}
              </p>
              <p className="mt-4 max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed">
                {recipe.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <RecipeApply theme={recipe.theme} />
                <a
                  href="#preview"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  data-cursor="hover"
                >
                  Jump to preview
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Engine-driven body — preview pane + meters + library cards + export */}
      <RecipeBody recipe={recipe} recommendation={recommendation} />

      {/* Cross-links */}
      <section className="relative border-t border-border py-24 bg-background/95">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Continue
              </div>
              <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight">
                More recipes
              </h2>
            </div>
            <Link
              href="/recipes"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
              data-cursor="hover"
            >
              All recipes →
            </Link>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-3">
            {others.map((r) => (
              <Link
                key={r.slug}
                href={`/recipes/${r.slug}`}
                data-cursor="hover"
                className="group bg-background p-6 transition hover:bg-card/40"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Recipe · {r.defaultPreview}
                </div>
                <h3 className="mt-3 font-display text-2xl leading-tight tracking-tight">
                  {r.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {r.tagline}
                </p>
                <div className="mt-6 flex h-8 overflow-hidden rounded border border-border">
                  <div className="flex-1" style={{ background: r.theme.background }} />
                  <div className="flex-1" style={{ background: r.theme.primary }} />
                  <div className="flex-1" style={{ background: r.theme.accent }} />
                  <div className="flex-1" style={{ background: r.theme.foreground }} />
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
