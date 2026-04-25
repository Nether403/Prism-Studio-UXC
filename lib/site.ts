/**
 * Canonical site URL — used for absolute URLs in metadata,
 * sitemap, OG cards, RSS, and JSON-LD.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — set explicitly for prod (https://prism.example.com)
 *   2. VERCEL_PROJECT_PRODUCTION_URL — automatic on Vercel prod deploys
 *   3. VERCEL_URL — automatic on preview deploys
 *   4. http://localhost:3000 — dev fallback
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL)
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

function stripTrailingSlash(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s
}

export const SITE_URL = resolveSiteUrl()

export const SITE = {
  name: "Prism",
  fullName: "Prism — Visual Stack Generator",
  shortDescription:
    "Compose a stack of best-in-class design libraries from a single brief.",
  longDescription:
    "Prism turns a one-line brief into a curated stack of best-in-class design libraries — Three.js, GSAP, Lenis, Shadcn, Tailwind, Next.js — with a generated theme, real bundle metrics, WCAG contrast checks, and exportable starter code.",
  twitter: "@v0",
  locale: "en_US",
  url: SITE_URL,
} as const

export function abs(path: string): string {
  if (!path.startsWith("/")) path = "/" + path
  return SITE_URL + path
}
