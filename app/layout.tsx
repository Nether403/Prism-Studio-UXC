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
import { SceneMount } from "@/components/scene-mount"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
})

// Extra fonts available for AI-generated themes (loaded via CSS variables on document)
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" })
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-fraunces" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair" })
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" })
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" })

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
  title: "Prism — Visual Stack Generator",
  description:
    "Describe an idea. Prism composes a stack of best-in-class design libraries — Three.js, GSAP, Shadcn, Tailwind, Lenis, Next.js — tuned for visual impact.",
  generator: "v0.app",
  keywords: [
    "design generator",
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
    title: "Prism — Visual Stack Generator",
    description:
      "Describe an idea. Prism composes a stack of best-in-class design libraries tuned for visual impact.",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${fontVariables} bg-background`}>
      <body className="font-sans antialiased overflow-x-hidden">
        <PrismThemeProvider>
          <LenisProvider>
            <SceneMount />
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
