import { Nav } from "@/components/nav"
import { Hero } from "@/components/hero"
import { Marquee } from "@/components/marquee"
import { Generator } from "@/components/generator"
import { IngressPicker } from "@/components/ingress-picker"
import { LibraryGrid } from "@/components/library-grid"
import { Integrations } from "@/components/integrations"
import { Capabilities } from "@/components/capabilities"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { StackOfTheDay } from "@/components/stack-of-the-day"
import { SceneMount } from "@/components/scene-mount"
import { JsonLd } from "@/components/json-ld"
import { createClient } from "@/lib/supabase/server"
import { SITE_URL, SITE } from "@/lib/site"
import { PERSON_ID } from "@/lib/person"

export const revalidate = 300

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return (
    <main className="relative">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE.name,
          applicationCategory: "DesignApplication",
          operatingSystem: "Web",
          url: SITE_URL,
          description: SITE.longDescription,
          author: { "@id": PERSON_ID },
          creator: { "@id": PERSON_ID },
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          featureList: [
            "AI-driven stack composition",
            "OKLCH theme generation",
            "Real bundle-size grading",
            "WCAG contrast checking",
            "Variant generation (3 directions)",
            "Constrained re-rolls",
            "ZIP and StackBlitz exports",
            "Realtime gallery",
          ],
        }}
      />
      <SceneMount />
      <Nav />
      <Hero />
      <Marquee />
      <StackOfTheDay />
      <IngressPicker />
      <Generator isAuthed={!!user} />
      <Capabilities />
      <LibraryGrid />
      <Integrations />
      <Footer />
      <CommandPalette />
    </main>
  )
}
