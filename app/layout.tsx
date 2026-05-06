import type { Metadata, Viewport } from "next"
import {
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Bricolage_Grotesque,
  Space_Grotesk,
  Fraunces,
  JetBrains_Mono,
  Playfair_Display,
  DM_Serif_Display,
  Anton,
  Inter,
  Plus_Jakarta_Sans,
} from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LenisProvider } from "@/components/lenis-provider"
import { PrismThemeProvider } from "@/components/prism-theme-provider"
import { Cursor } from "@/components/cursor"
import { Toaster } from "@/components/ui/sonner"
import { SITE_URL, SITE } from "@/lib/site"
import { JsonLd } from "@/components/json-ld"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
})

// Extra fonts available for AI-generated themes (loaded via CSS variables on document).
// preload: false + display: "swap" keeps them out of the critical path — they only
// fetch when an AI-generated theme actually selects one. This prevents 9 extra
// <link rel="preload"> tags from blocking first paint on every route.
//
// NOTE: next/font's SWC plugin requires fully-static call options — no spread,
// no shared object, no variables. Each option must be inlined per call.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  preload: false,
  display: "swap",
})
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  preload: false,
  display: "swap",
})
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  preload: false,
  display: "swap",
})
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  preload: false,
  display: "swap",
})
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  preload: false,
  display: "swap",
})
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  preload: false,
  display: "swap",
})
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  preload: false,
  display: "swap",
})
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  preload: false,
  display: "swap",
})
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  preload: false,
  display: "swap",
})

const fontVariables = [
  geist.variable,
  geistMono.variable,
  instrument.variable,
  bricolage.variable,
  spaceGrotesk.variable,
  fraunces.variable,
  jetbrains.variable,
  playfair.variable,
  dmSerif.variable,
  anton.variable,
  inter.variable,
  jakarta.variable,
].join(" ")

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE.fullName,
    template: "%s · UXC",
  },
  description:
    "Describe an idea. UXC curates a stack of best-in-class design libraries — Three.js, GSAP, Shadcn, Tailwind, Lenis, Next.js — tuned for visual impact.",
  applicationName: SITE.name,
  generator: "v0.app",
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/feed.xml", title: "UXC changelog" }] },
  },
  keywords: [
    "UX curator",
    "design generator",
    "stack generator",
    "Three.js",
    "GSAP",
    "Shadcn",
    "Tailwind",
    "Lenis",
    "Next.js",
    "WebGL",
    "WebGPU",
    "creative coding",
    "AI design",
  ],
  openGraph: {
    title: SITE.fullName,
    description:
      "Describe an idea. UXC curates a stack of best-in-class design libraries tuned for visual impact.",
    type: "website",
    url: SITE_URL,
    siteName: SITE.name,
    locale: SITE.locale,
    images: [{ url: "/uxc-mark.jpg", width: 1024, height: 1024, alt: "UXC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.fullName,
    description:
      "Describe an idea. UXC curates a stack of best-in-class design libraries tuned for visual impact.",
    images: ["/uxc-mark.jpg"],
  },
  icons: {
    // Single SVG favicon — the gradient mark renders identically on both
    // light and dark browser chrome because we paint it on a baked-in
    // dark canvas. Apple touch icon points at the 1024² brand mark JPG.
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/uxc-mark.jpg",
  },
}

export const viewport: Viewport = {
  // Warm-tinted near-black canvas, matching --background. Browser chrome
  // on iOS/Android picks this up for the mobile address-bar tint.
  themeColor: "#0c0807",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontVariables} bg-background`}>
      <body className="font-sans antialiased overflow-x-hidden">
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE.name,
              url: SITE_URL,
              description: SITE.shortDescription,
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/gallery?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE.name,
              url: SITE_URL,
              logo: `${SITE_URL}/icon.svg`,
            },
          ]}
        />
        <PrismThemeProvider>
          <LenisProvider>
            <div className="relative z-10">{children}</div>
            <Cursor />
            <Toaster />
          </LenisProvider>
        </PrismThemeProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
