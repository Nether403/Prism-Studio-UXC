import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FromImageStudio } from "@/components/from-image-studio"
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
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const sp = await searchParams

  if (!user) {
    const next = sp.next ?? "/from-image"
    redirect(`/auth/login?next=${encodeURIComponent(next)}`)
  }

  return (
    <div className="min-h-svh bg-background">
      <Nav />
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <header className="mb-10 max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Image-to-stack
            </p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-[-0.02em] leading-[1.05] text-pretty">
              Drop a screenshot. Get a buildable stack.
            </h1>
            <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
              Drop, paste, or link to a piece of visual reference. UXC extracts a Signature —
              palette, fonts, vibe, motion — and proposes a custom stack you can
              {" "}
              <Link href="/dashboard" className="underline underline-offset-4">
                save
              </Link>{" "}
              or open in v0 with one click.
            </p>
          </header>

          <FromImageStudio userEmail={user.email ?? null} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
