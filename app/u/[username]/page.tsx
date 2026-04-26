import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { ActivityFeed, type ActivityEvent } from "@/components/activity-feed"
import { JsonLd } from "@/components/json-ld"
import type { Theme } from "@/lib/themes"
import { Heart, GitFork } from "lucide-react"
import { SITE_URL } from "@/lib/site"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const canonical = `/u/${username}`
  return {
    title: `@${username} · UXC`,
    description: `Stacks published by @${username}.`,
    alternates: { canonical },
    openGraph: {
      title: `@${username} on UXC`,
      description: `Design stacks published by @${username}.`,
      type: "profile",
      url: canonical,
    },
  }
}

type Row = {
  id: string
  title: string | null
  headline: string
  prompt: string
  vibe: string
  likes: number
  fork_count: number
  theme: Theme | null
  stack_ids: string[]
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio")
    .eq("username", username)
    .maybeSingle()
  if (!profile) notFound()

  const [{ data: stacks }, { data: events }] = await Promise.all([
    supabase
      .from("stacks")
      .select("id,title,headline,prompt,vibe,likes,fork_count,theme,stack_ids")
      .eq("user_id", profile.id)
      .eq("published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select("id,type,created_at,stack_id,metadata,actor:profiles!activity_events_actor_id_fkey(username,display_name)")
      .or(`actor_id.eq.${profile.id},target_user_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const rows: Row[] = (stacks ?? []) as Row[]
  const activity = ((events ?? []) as unknown as ActivityEvent[]) ?? []

  return (
    <main className="relative">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Profiles", item: `${SITE_URL}/gallery` },
              {
                "@type": "ListItem",
                position: 2,
                name: `@${profile.username}`,
                item: `${SITE_URL}/u/${profile.username}`,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: profile.display_name || profile.username,
            alternateName: `@${profile.username}`,
            url: `${SITE_URL}/u/${profile.username}`,
            description: profile.bio ?? undefined,
          },
        ]}
      />
      <Nav />

      <section className="relative pt-32 pb-12 md:pt-40">
        <div className="mx-auto max-w-5xl px-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Profile · @{profile.username}
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-7xl tracking-[-0.04em] leading-[0.95]">
            {profile.display_name || profile.username}.
          </h1>
          {profile.bio && (
            <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">{profile.bio}</p>
          )}
          <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {rows.length} published {rows.length === 1 ? "stack" : "stacks"}
          </div>
        </div>
      </section>

      <section className="relative pb-24">
        <div className="mx-auto max-w-5xl px-6">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
              No published stacks yet.
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {rows.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/s/${s.id}`}
                    className="block rounded-lg border border-border bg-card/40 p-5 transition hover:border-foreground/30"
                    data-cursor="hover"
                  >
                    <div
                      className="h-2 w-full rounded-full mb-4"
                      style={{
                        background: `linear-gradient(90deg, ${s.theme?.primary ?? "var(--primary)"}, ${
                          s.theme?.accent ?? "var(--accent)"
                        })`,
                      }}
                    />
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      /{s.id} · {s.vibe}
                    </div>
                    <h2 className="mt-2 font-display text-2xl tracking-tight leading-tight">
                      {s.title || s.headline}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                      {s.prompt}
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span className="tabular-nums">{s.likes}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        <span className="tabular-nums">{s.fork_count}</span>
                      </span>
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-wider">
                        {s.stack_ids.length} libs
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-16">
            <div className="mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span className="text-primary">A</span>
              <span className="h-px w-8 bg-border" />
              <span>Recent activity</span>
            </div>
            <ActivityFeed
              events={activity}
              emptyLabel="Nothing yet — once people interact with these stacks it&apos;ll show up here."
            />
          </div>
        </div>
      </section>

      <Footer />
      <CommandPalette />
    </main>
  )
}
