import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FromImageStudio, type ResumedInspiration } from "@/components/from-image-studio"
import type { Signature, SourceType } from "@/lib/signature"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "From image — UXC",
  description:
    "Drop a screenshot, paste from clipboard, or paste a Mobbin / Dribbble URL. Get a stack proposal with a matching theme.",
}

export default async function FromImagePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const sp = await searchParams

  if (!user) {
    // Preserve the ?ref param across login so the user lands back on the
    // exact resume URL after auth. Without this, clicking "Resume" from a
    // dashboard captures strip while logged out would silently drop the
    // inspiration id.
    const fallback =
      sp.next ?? (sp.ref ? `/from-image?ref=${encodeURIComponent(sp.ref)}` : "/from-image")
    redirect(`/auth/login?next=${encodeURIComponent(fallback)}`)
  }

  // Resume mode: when ?ref=<inspirationId> points at a capture the user
  // owns, we hand the studio a pre-extracted Signature so it skips the
  // upload UI and jumps straight into "pick a variant". RLS handles the
  // ownership check on top of our explicit eq("owner_id", user.id) — both
  // in case RLS policy ever changes.
  let resumed: ResumedInspiration | null = null
  if (sp.ref) {
    const { data: row } = await supabase
      .from("inspirations")
      .select("id, source_type, source_ref, screenshot_url, signature")
      .eq("id", sp.ref)
      .eq("owner_id", user.id)
      .maybeSingle()
    if (row?.signature) {
      resumed = {
        inspirationId: row.id as string,
        sourceType: row.source_type as SourceType,
        sourceRef: row.source_ref as string,
        screenshotUrl: (row.screenshot_url as string | null) ?? null,
        signature: row.signature as unknown as Signature,
      }
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <Nav />
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <header className="mb-10 max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {resumed ? "Resume capture" : "Image-to-stack"}
            </p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-[-0.02em] leading-[1.05] text-pretty">
              {resumed
                ? "Pick up where you left off."
                : "Drop a screenshot. Get a buildable stack."}
            </h1>
            <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
              {resumed ? (
                <>
                  We loaded your previous extract — palette, vibe, brief, all already
                  there. Pick a variant to{" "}
                  <Link href="/dashboard" className="underline underline-offset-4">
                    save
                  </Link>{" "}
                  it as a draft, or open the brief in v0.
                </>
              ) : (
                <>
                  Drop, paste, or link to a piece of visual reference. UXC extracts a
                  Signature — palette, fonts, vibe, motion — and proposes a custom stack
                  you can{" "}
                  <Link href="/dashboard" className="underline underline-offset-4">
                    save
                  </Link>{" "}
                  or open in v0 with one click.
                </>
              )}
            </p>
          </header>

          <FromImageStudio userEmail={user.email ?? null} resumed={resumed} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
