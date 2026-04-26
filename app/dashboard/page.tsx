import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { DashboardList } from "@/components/dashboard-list"
import { ActivityFeed, type ActivityEvent } from "@/components/activity-feed"
import { ProvenanceThumb, type ProvenanceInspiration } from "@/components/provenance-card"
import type { Signature } from "@/lib/signature"
import type { Theme } from "@/lib/themes"

export const metadata = {
  title: "My Stacks · Prism",
  description: "Your saved stacks, drafts, and forks.",
}

type StackRow = {
  id: string
  title: string | null
  headline: string
  prompt: string
  vibe: string
  audience: string
  published: boolean
  parent_id: string | null
  fork_count: number
  likes: number
  views: number
  stack_ids: string[]
  theme: Theme | null
  impact_score: number
  perf_budget: number
  created_at: string
  updated_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login?next=/dashboard")

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle()

  const [{ data: stacks }, { data: events }, { data: inspirationsRaw }] = await Promise.all([
    supabase
      .from("stacks")
      .select(
        "id,title,headline,prompt,vibe,audience,published,parent_id,fork_count,likes,views,stack_ids,theme,impact_score,perf_budget,created_at,updated_at",
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select("id,type,created_at,stack_id,metadata,actor:profiles!activity_events_actor_id_fkey(username,display_name)")
      .eq("target_user_id", user.id)
      .neq("actor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("inspirations")
      .select("id,source_type,source_ref,screenshot_url,signature,is_public,generated_stack_id,created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const rows: StackRow[] = (stacks ?? []) as StackRow[]
  const drafts = rows.filter((s) => !s.published)
  const published = rows.filter((s) => s.published)
  const incoming = ((events ?? []) as unknown as ActivityEvent[]) ?? []

  // Build a lookup so each inspiration thumb can show the title of the stack
  // it produced (when linked).
  const stacksById = new Map(rows.map((r) => [r.id, r]))
  type InspirationRow = ProvenanceInspiration & { generated_stack_id: string | null }
  const inspirations: InspirationRow[] = ((inspirationsRaw ?? []) as Array<{
    id: string
    source_type: ProvenanceInspiration["source_type"]
    source_ref: string
    screenshot_url: string | null
    signature: Signature | null
    is_public: boolean
    generated_stack_id: string | null
    created_at: string
  }>).map((row) => ({
    id: row.id,
    source_type: row.source_type,
    source_ref: row.source_ref,
    screenshot_url: row.screenshot_url,
    signature: row.signature,
    is_public: row.is_public,
    created_at: row.created_at,
    generated_stack_id: row.generated_stack_id,
  }))

  return (
    <main className="relative">
      <Nav />

      <section className="relative pt-32 pb-12 md:pt-40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                01 · Workspace
              </div>
              <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-[-0.04em] leading-[0.95]">
                {profile?.display_name || profile?.username || "Your stacks"}.
              </h1>
              <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                Every stack you generate auto-saves here. Rename them, publish them, fork them,
                pick up where you left off.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Counter label="Total" value={rows.length} />
              <Counter label="Published" value={published.length} accent />
              <Counter label="Drafts" value={drafts.length} />
            </div>
          </div>

          <div className="mt-10 flex items-center gap-3">
            <Link
              href="/#generator"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              data-cursor="hover"
            >
              + New stack
            </Link>
            <Link
              href="/gallery"
              className="text-sm text-muted-foreground hover:text-foreground transition"
              data-cursor="hover"
            >
              Browse the gallery
            </Link>
            {profile?.username && (
              <Link
                href={`/u/${profile.username}`}
                className="ml-auto text-sm text-muted-foreground hover:text-foreground transition"
                data-cursor="hover"
              >
                Public profile →
              </Link>
            )}
          </div>
        </div>
      </section>

      {inspirations.length > 0 && (
        <section className="relative pb-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                <span className="text-primary">02</span>
                <span className="h-px w-8 bg-border" />
                <span>Recent inspirations</span>
              </div>
              <p className="hidden md:block text-sm text-muted-foreground">
                Captures from{" "}
                <Link
                  href="/from-image"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                  data-cursor="hover"
                >
                  /from-image
                </Link>{" "}
                and{" "}
                <Link
                  href="/rebuild"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                  data-cursor="hover"
                >
                  /rebuild
                </Link>
                .
              </p>
            </div>
            <div className="-mx-6 px-6 overflow-x-auto">
              <ul className="flex items-stretch gap-4 pb-2">
                {inspirations.map((insp) => {
                  const linkedStack = insp.generated_stack_id
                    ? stacksById.get(insp.generated_stack_id)
                    : null
                  return (
                    <li key={insp.id} className="contents">
                      <ProvenanceThumb
                        inspiration={insp}
                        generatedStackId={insp.generated_stack_id}
                        generatedStackTitle={
                          linkedStack
                            ? linkedStack.title || linkedStack.headline
                            : null
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="relative pb-24">
        <div className="mx-auto max-w-6xl px-6 grid gap-10 lg:grid-cols-[1fr_320px]">
          <DashboardList rows={rows} />

          <aside className="space-y-4">
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span className="text-primary">A</span>
              <span className="h-px w-8 bg-border" />
              <span>What others did</span>
            </div>
            <ActivityFeed
              events={incoming}
              emptyLabel="No likes or forks on your work yet. Publish something and share the link."
            />
          </aside>
        </div>
      </section>

      <Footer />
      <CommandPalette />
    </main>
  )
}

function Counter({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-3 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 font-display text-2xl tabular-nums normal-case tracking-tight ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  )
}
