import { Nav } from "@/components/nav"
import { Hero } from "@/components/hero"
import { Marquee } from "@/components/marquee"
import { Generator } from "@/components/generator"
import { LibraryGrid } from "@/components/library-grid"
import { Integrations } from "@/components/integrations"
import { Capabilities } from "@/components/capabilities"
import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <Marquee />
      <Generator />
      <Capabilities />
      <LibraryGrid />
      <Integrations />
      <Footer />
    </main>
  )
}
