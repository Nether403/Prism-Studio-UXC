import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import type { Theme } from "@/lib/themes"
import { Heart, GitFork } from "lucide-react"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  return {
    title: `@${username} · Prism`,
    description: `Stacks published by @${username}.`,
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

  const { data: stacks } = await supabase
    .from("stacks")
    .select("id,title,headline,prompt,vibe,likes,fork_count,theme,stack_ids")
    .eq("user_id", profile.id)
    .eq("published", true)
    .order("created_at", { ascending: false })

  const rows: Row[] = (stacks ?? []) as Row[]

  return (
    <main className="relative">
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
        </div>
      </section>

      <Footer />
      <CommandPalette />
    </main>
  )
}
