import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { LIBRARIES } from "@/lib/stack-data"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { ShareActions } from "@/components/share-actions"
import { Badge } from "@/components/ui/badge"
import { JsonLd } from "@/components/json-ld"
import { ExternalLink, Lock, Sparkles, Gauge } from "lucide-react"
import type { Theme } from "@/lib/themes"
import { SITE_URL } from "@/lib/site"

export const revalidate = 60

type StackRow = {
  id: string
  prompt: string
  vibe: string
  audience: string
  performance: string
  include_paid: boolean
  headline: string
  rationale: string | null
  stack_ids: string[]
  reasons: Record<string, string>
  theme: Theme
  impact_score: number
  perf_budget: number
  views: number
  likes: number
  created_at: string
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("stacks")
    .select("headline, rationale, prompt")
    .eq("id", id)
    .maybeSingle()
  if (!data) return { title: "Stack not found · Prism" }
  const title = `${data.headline} · Prism`
  const description = data.rationale ?? data.prompt?.slice(0, 160)
  const canonical = `/s/${id}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      images: [{ url: `/api/og/stack/${id}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/stack/${id}`],
    },
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stacks")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[v0] share page error", error)
  }
  if (!data) notFound()

  const stack = data as StackRow
  const libraries = (stack.stack_ids ?? [])
    .map((sid) => LIBRARIES.find((l) => l.id === sid))
    .filter((l): l is (typeof LIBRARIES)[number] => Boolean(l))

  const theme = stack.theme

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let initiallyLiked = false
  if (user) {
    const { data: likeRow } = await supabase
      .from("stack_likes")
      .select("user_id")
      .eq("stack_id", stack.id)
      .eq("user_id", user.id)
      .maybeSingle()
    initiallyLiked = !!likeRow
  }

  return (
    <main className="relative">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Gallery", item: `${SITE_URL}/gallery` },
              {
                "@type": "ListItem",
                position: 2,
                name: stack.headline,
                item: `${SITE_URL}/s/${stack.id}`,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: stack.headline,
            description: stack.rationale ?? stack.prompt?.slice(0, 160),
            datePublished: stack.created_at,
            mainEntityOfPage: `${SITE_URL}/s/${stack.id}`,
            image: `${SITE_URL}/api/og/stack/${stack.id}`,
            author: { "@type": "Organization", name: "Prism" },
            publisher: { "@type": "Organization", name: "Prism" },
            keywords: libraries.map((l) => l.name).join(", "),
          },
        ]}
      />
      <Nav />

      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <Link href="/gallery" className="text-primary hover:underline" data-cursor="hover">
              ← Gallery
            </Link>
            <span className="h-px w-8 bg-border" />
            <span>/{stack.id}</span>
            <span>·</span>
            <span>{stack.vibe}</span>
            <span>·</span>
            <span>{stack.audience}</span>
          </div>

          <h1 className="mt-5 font-display text-5xl md:text-7xl tracking-[-0.04em] leading-[0.95] text-balance">
            {stack.headline}
          </h1>

          {stack.rationale && (
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed text-pretty">
              {stack.rationale}
            </p>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2 max-w-xl">
            <Meter
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Visual impact"
              value={stack.impact_score}
              accent="primary"
            />
            <Meter
              icon={<Gauge className="h-3.5 w-3.5" />}
              label="Performance load"
              value={stack.perf_budget}
              accent="accent"
            />
          </div>

          <div className="mt-8">
            <ShareActions
              id={stack.id}
              likes={stack.likes}
              initiallyLiked={initiallyLiked}
              theme={theme}
              isAuthed={!!user}
            />
          </div>

          {user && (stack as unknown as { user_id?: string }).user_id === user.id && (
            <div className="mt-6 flex items-center gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                You own this
              </span>
              <Link
                href={`/dashboard/edit/${stack.id}`}
                className="ml-auto text-primary underline-offset-4 hover:underline"
                data-cursor="hover"
              >
                Edit →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Theme preview block — uses inline style with the actual saved tokens */}
      <section className="relative pb-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-end justify-between gap-4 mb-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Theme · {theme?.name ?? "Untitled"}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
              radius {theme?.radius ?? "—"}
            </div>
          </div>
          <div
            className="rounded-lg border border-border overflow-hidden"
            style={{ background: theme?.background, color: theme?.foreground }}
          >
            <div className="grid grid-cols-7 gap-px" style={{ background: theme?.border }}>
              {[
                ["BG", theme?.background],
                ["FG", theme?.foreground],
                ["Card", theme?.card],
                ["Muted", theme?.muted],
                ["Border", theme?.border],
                ["Accent", theme?.accent],
                ["Primary", theme?.primary],
              ].map(([label, value]) => (
                <div key={label as string} className="p-3" style={{ background: theme?.background }}>
                  <div
                    className="h-12 w-full rounded-sm border"
                    style={{
                      background: (value as string) ?? "transparent",
                      borderColor: theme?.border,
                    }}
                  />
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-wider opacity-70">
                    {label as string}
                  </div>
                  <div className="font-mono text-[10px] tabular-nums truncate opacity-70">
                    {(value as string) ?? "—"}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-px" style={{ background: theme?.border }}>
              <div className="p-5" style={{ background: theme?.card }}>
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Display</div>
                <div className="mt-1 text-xl" style={{ fontStyle: theme?.displayItalic ? "italic" : "normal" }}>
                  {theme?.displayFont ?? "—"}
                </div>
              </div>
              <div className="p-5" style={{ background: theme?.card }}>
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Body</div>
                <div className="mt-1 text-xl">{theme?.bodyFont ?? "—"}</div>
              </div>
              <div className="p-5" style={{ background: theme?.card }}>
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Motto</div>
                <div className="mt-1 text-sm italic opacity-90 line-clamp-2">{theme?.motto ?? "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative pt-12 pb-16 border-t border-border">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span className="text-primary">02</span>
            <span className="h-px w-8 bg-border" />
            <span>The brief</span>
          </div>
          <blockquote className="mt-4 border-l-2 border-primary pl-5 font-display text-2xl md:text-3xl italic tracking-tight leading-snug text-balance text-muted-foreground">
            “{stack.prompt}”
          </blockquote>
        </div>
      </section>

      <section className="relative pt-12 pb-24 border-t border-border">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span className="text-primary">03</span>
            <span className="h-px w-8 bg-border" />
            <span>The stack</span>
          </div>
          <h2 className="mt-4 font-display text-4xl md:text-5xl tracking-[-0.03em] leading-[0.95]">
            {libraries.length} libraries, picked on purpose.
          </h2>

          <ol className="mt-10 space-y-4">
            {libraries.map((lib, i) => (
              <li key={lib.id} className="rounded-lg border border-border bg-card/40 p-5">
                <div className="flex items-start gap-5">
                  <div className="font-mono text-xs text-muted-foreground tabular-nums w-6 pt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/library/${lib.id}`}
                        className="font-display text-2xl tracking-tight underline-offset-4 hover:underline"
                        data-cursor="hover"
                      >
                        {lib.name}
                      </Link>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                        {lib.category}
                      </Badge>
                      {lib.tier !== "free" && (
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase tracking-wider border-accent/40 text-accent"
                        >
                          {lib.tier}
                        </Badge>
                      )}
                      {lib.requiresAuth && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          <Lock className="h-2.5 w-2.5" />
                          auth
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{lib.tagline}</p>
                    {stack.reasons?.[lib.id] && (
                      <div className="mt-3 rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2 text-sm leading-relaxed">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-primary mr-2">
                          Why
                        </span>
                        {stack.reasons[lib.id]}
                      </div>
                    )}
                  </div>
                  <a
                    href={lib.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                    aria-label={`${lib.name} docs`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
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

function Meter({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: "primary" | "accent"
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="font-mono text-sm tabular-nums">{value}</div>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={accent === "primary" ? "h-full bg-primary" : "h-full bg-accent"}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
