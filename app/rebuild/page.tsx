import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { readRebuildQuota, REBUILD_DAILY_LIMIT } from "@/lib/ratelimit"
import { RebuildStudio } from "@/components/rebuild-studio"

export const metadata: Metadata = {
  title: "Rebuild any site — Prism Studio",
  description:
    "Paste any URL. We capture, analyze, and propose a fresh design direction with a stack to match.",
}

export default async function RebuildPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?next=/rebuild")
  }

  const quota = await readRebuildQuota(user.id).catch(() => ({
    ok: true,
    used: 0,
    limit: REBUILD_DAILY_LIMIT,
    remaining: REBUILD_DAILY_LIMIT,
    resetAt: new Date().toISOString(),
  }))

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-28 md:pt-36">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            v8 · live rebuild
          </p>
          <h1 className="text-balance font-serif text-4xl leading-[1.05] md:text-6xl">
            Rebuild any site, in your voice.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Paste a URL. We capture the page, extract its palette, type, and
            structure, and propose a stack-and-design direction across three
            performance budgets. The original is on the left. The
            reinterpretation is on the right.
          </p>
        </header>

        <RebuildStudio initialQuota={quota} />
      </section>
    </main>
  )
}
