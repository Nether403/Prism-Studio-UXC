import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { EditWorkbench } from "@/components/edit-workbench"
import type { Theme } from "@/lib/themes"

export const metadata = { title: "Edit stack · Prism" }

type StackRow = {
  id: string
  title: string | null
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
  published: boolean
  parent_id: string | null
  user_id: string | null
}

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/dashboard/edit/${id}`)

  const { data, error } = await supabase.from("stacks").select("*").eq("id", id).maybeSingle()
  if (error) console.error("[v0] edit page error", error)
  if (!data) notFound()

  const row = data as StackRow
  if (row.user_id !== user.id) {
    // Not the owner — kick to read-only page
    redirect(`/s/${row.id}`)
  }

  return (
    <main className="relative">
      <Nav />

      <section className="relative pt-32 pb-8 md:pt-40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <Link href="/dashboard" className="text-primary hover:underline" data-cursor="hover">
              ← Dashboard
            </Link>
            <span className="h-px w-8 bg-border" />
            <span>/{row.id}</span>
            <span>·</span>
            <span>{row.published ? "Published" : "Draft"}</span>
          </div>
          <h1 className="mt-5 font-display text-4xl md:text-6xl tracking-[-0.04em] leading-[0.95]">
            Edit & regenerate.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Tweak the brief, adjust the libraries, hand-edit the theme tokens — or push regenerate
            to let the AI rewrite the copy and theme around your changes.
          </p>
        </div>
      </section>

      <section className="relative pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <EditWorkbench row={row} />
        </div>
      </section>

      <Footer />
      <CommandPalette />
    </main>
  )
}
