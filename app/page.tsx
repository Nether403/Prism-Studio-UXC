import { Nav } from "@/components/nav"
import { Hero } from "@/components/hero"
import { Marquee } from "@/components/marquee"
import { Generator } from "@/components/generator"
import { LibraryGrid } from "@/components/library-grid"
import { Integrations } from "@/components/integrations"
import { Capabilities } from "@/components/capabilities"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <Marquee />
      <Generator isAuthed={!!user} />
      <Capabilities />
      <LibraryGrid />
      <Integrations />
      <Footer />
      <CommandPalette />
    </main>
  )
}
