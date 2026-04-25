import Link from "next/link"
import { ArrowRight, Heart, GitFork } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { LIBRARIES } from "@/lib/stack-data"
import { DEFAULT_THEME, type Theme } from "@/lib/themes"

type Row = {
  id: string
  headline: string | null
  prompt: string | null
  vibe: string | null
  stack_ids: string[] | null
  theme: Theme | null
  likes: number | null
  fork_count: number | null
  trending_score: number | null
  created_at: string
}

/**
 * Hash a date string to an index, deterministic per-day across all visitors.
 * Uses a quick FNV-1a-like loop over UTF-16 codes.
 */
function dailyIndex(seed: string, max: number) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % Math.max(1, max)
}

function safeTheme(t: Theme | null | undefined): Theme {
  return { ...DEFAULT_THEME, ...(t ?? {}) }
}

export async function StackOfTheDay() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stacks_trending")
    .select(
      "id, headline, prompt, vibe, stack_ids, theme, likes, fork_count, trending_score, created_at",
    )
    .order("trending_score", { ascending: false })
    .limit(7)

  if (error || !data || data.length === 0) return null

  const rows = data as Row[]
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  const pick = rows[dailyIndex(today, rows.length)]

  if (!pick) return null

  const theme = safeTheme(pick.theme)
  const libNames =
    (pick.stack_ids ?? [])
      .map((id) => LIBRARIES.find((l) => l.id === id)?.name)
      .filter(Boolean)
      .slice(0, 6) as string[]

  return (
    <section className="relative border-t border-border py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <span className="text-primary">SOTD</span>
          <span className="h-px w-8 bg-border" />
          <span>Stack of the day</span>
          <span className="ml-auto tabular-nums text-muted-foreground/70">
            {new Date(today).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <Link
          href={`/s/${pick.id}`}
          className="group mt-6 block overflow-hidden rounded-2xl border border-border transition hover:border-primary/40"
          data-cursor="hover"
        >
          <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
            {/* Theme strip */}
            <div
              className="relative h-72 overflow-hidden md:h-auto md:min-h-[24rem]"
              style={{ background: theme.background, color: theme.foreground }}
            >
              <div className="absolute inset-0 grid grid-rows-5">
                <div style={{ background: theme.background }} />
                <div style={{ background: theme.card }} />
                <div style={{ background: theme.muted }} />
                <div style={{ background: theme.accent }} />
                <div style={{ background: theme.primary }} />
              </div>

              <div className="absolute inset-0 flex flex-col justify-between p-7">
                <div
                  className="rounded-full px-2.5 py-0.5 self-start font-mono text-[10px] uppercase tracking-wider"
                  style={{ background: theme.primary, color: theme.primaryForeground }}
                >
                  {theme.name || "Theme"}
                </div>
                <div
                  className="font-display text-5xl md:text-6xl tracking-[-0.03em] leading-[0.95] text-balance max-w-[90%]"
                  style={{
                    color: theme.foreground,
                    fontStyle: theme.displayItalic ? "italic" : "normal",
                  }}
                >
                  {pick.headline ?? "Featured"}
                </div>
              </div>
            </div>

            {/* Detail */}
            <div className="flex flex-col justify-between gap-6 bg-card p-7">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  /{pick.id} · {pick.vibe ?? "minimal"}
                </div>
                <p className="mt-3 text-pretty text-lg leading-relaxed line-clamp-4">
                  {pick.prompt ?? ""}
                </p>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {libNames.map((n) => (
                    <span
                      key={n}
                      className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5" />
                    {pick.likes ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <GitFork className="h-3.5 w-3.5" />
                    {pick.fork_count ?? 0}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-foreground transition group-hover:gap-2">
                  Open stack <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
