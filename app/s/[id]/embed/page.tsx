import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LIBRARIES } from "@/lib/stack-data"
import { DEFAULT_THEME, type Theme } from "@/lib/themes"

export const revalidate = 60

type Row = {
  id: string
  headline: string
  prompt: string
  vibe: string
  audience: string
  stack_ids: string[] | null
  theme: Theme | null
  impact_score: number
  perf_budget: number
  likes: number
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Embed · ${id} · Prism`,
    robots: { index: false, follow: false },
    other: {
      // Allow same-origin and arbitrary embed contexts.
      "x-frame-options": "ALLOWALL",
    },
  }
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("stacks")
    .select(
      "id, headline, prompt, vibe, audience, stack_ids, theme, impact_score, perf_budget, likes",
    )
    .eq("id", id)
    .eq("published", true)
    .maybeSingle()

  if (!data) notFound()

  const stack = data as Row
  const theme: Theme = { ...DEFAULT_THEME, ...(stack.theme ?? {}) }
  const libMap = Object.fromEntries(LIBRARIES.map((l) => [l.id, l]))
  const libs = (stack.stack_ids ?? []).map((sid) => libMap[sid]).filter(Boolean)

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: theme.background, color: theme.foreground }}
    >
      <style>{`
        /* Hide the global ambient scene + cursor in embed contexts. */
        [data-prism-scene], [data-prism-cursor] { display: none !important; }
        body { overflow: hidden; }
      `}</style>

      <article className="mx-auto flex h-screen max-w-3xl flex-col px-6 py-7 md:px-10 md:py-10">
        {/* Header strip */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] opacity-70">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: theme.primary }}
            />
            <span>{theme.name || "Prism"}</span>
            <span className="opacity-50">·</span>
            <span>{stack.vibe}</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] opacity-60">
            <span>impact {stack.impact_score}</span>
            <span>perf {stack.perf_budget}</span>
            <span>♥ {stack.likes}</span>
          </div>
        </header>

        {/* Headline */}
        <h1
          className="mt-6 font-display tracking-[-0.03em] leading-[0.95] text-balance text-4xl md:text-6xl"
          style={{ fontStyle: theme.displayItalic ? "italic" : "normal" }}
        >
          {stack.headline}
        </h1>

        <p
          className="mt-4 max-w-[58ch] text-pretty leading-relaxed opacity-80 text-base md:text-lg"
          style={{ color: theme.foreground }}
        >
          {stack.prompt}
        </p>

        {/* Theme strip */}
        <div className="mt-6 grid grid-cols-5 overflow-hidden rounded-md">
          <div className="h-8" style={{ background: theme.background }} />
          <div className="h-8" style={{ background: theme.card }} />
          <div className="h-8" style={{ background: theme.muted }} />
          <div className="h-8" style={{ background: theme.accent }} />
          <div className="h-8" style={{ background: theme.primary }} />
        </div>

        {/* Library chips */}
        {libs.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {libs.slice(0, 10).map((l) => (
              <span
                key={l.id}
                className="rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
                style={{
                  borderColor: theme.border,
                  background: theme.card,
                  color: theme.foreground,
                  opacity: 0.85,
                }}
              >
                {l.name}
              </span>
            ))}
            {libs.length > 10 && (
              <span
                className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider opacity-70"
                style={{ background: theme.muted, color: theme.foreground }}
              >
                +{libs.length - 10}
              </span>
            )}
          </div>
        )}

        {/* Attribution footer pinned to bottom */}
        <div
          className="mt-auto flex items-center justify-between gap-4 pt-6"
          style={{ borderTop: `1px solid ${theme.border}` }}
        >
          <Link
            href={`/s/${stack.id}`}
            target="_top"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
            style={{ background: theme.primary, color: theme.primaryForeground }}
          >
            Open the breakdown
            <span aria-hidden>→</span>
          </Link>

          <Link
            href="/"
            target="_top"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] opacity-70 transition hover:opacity-100"
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-sm"
              style={{ background: theme.accent }}
            />
            Made with Prism
          </Link>
        </div>
      </article>
    </div>
  )
}
