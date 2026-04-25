import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LenisProvider } from "@/components/lenis-provider"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
})

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
  ],
  openGraph: {
    title: "Prism — Visual Stack Generator",
    description:
      "Describe an idea. Prism composes a stack of best-in-class design libraries tuned for visual impact.",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
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
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable} bg-background`}
    >
      <body className="font-sans antialiased overflow-x-hidden">
        <LenisProvider>{children}</LenisProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
