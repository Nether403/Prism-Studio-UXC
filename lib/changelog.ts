/**
 * Hand-curated changelog. Each entry is a minor "version" (v1..v6 etc.)
 * with structured highlights so we can render rich UI and emit RSS.
 *
 * Add new entries to the TOP of the array — the RSS feed and changelog index
 * iterate as-given.
 */

export type ChangelogHighlight = {
  /** Short title for the highlight, e.g. "Realtime gallery feed" */
  title: string
  /** 1–3 sentence body. Plain text — no markdown — so RSS, OG, and on-site renders are consistent. */
  body: string
}

export type ChangelogEntry = {
  /** Stable URL slug, e.g. "v6". Used for /changelog/[version] and RSS GUIDs. */
  version: string
  /** Pretty title shown on the page. */
  title: string
  /** ISO date string. */
  date: string
  /** One-line summary used in the index, OG card, and RSS description. */
  summary: string
  /** Bullet highlights. */
  highlights: ChangelogHighlight[]
  /** Optional footer note — extra context, links, or thanks. */
  note?: string
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v6",
    title: "Honesty + Choice",
    date: "2026-04-22",
    summary:
      "Real bundle sizes, WCAG contrast checking, three-way variant generation, and constrained re-rolls in the editor.",
    highlights: [
      {
        title: "Real bundle sizes",
        body: "Hand-curated gzipped kB for every recommended library, sourced from bundlephobia and release notes. Sums into a real perf grade (A through D) instead of a synthetic score.",
      },
      {
        title: "WCAG contrast checker",
        body: "OKLCH theme tokens are parsed via Björn Ottosson's OKLab math, contrast ratios computed against WCAG 2.1, and graded AAA/AA/AA-large/fail with paired sample swatches.",
      },
      {
        title: "Generate 3 variants",
        body: "One click fires three parallel generations — performance-first, balanced, maximalist — each with its own theme, stack, and copy. Pick one to apply.",
      },
      {
        title: "Constrained re-roll",
        body: 'Free-form 280-char nudges in the edit workbench: "make it more brutalist", "lighter palette", "tighter copy". Sent as an explicit override directive to the AI.',
      },
    ],
  },
  {
    version: "v5",
    title: "Liveness",
    date: "2026-04-15",
    summary:
      "The site started feeling alive: realtime gallery, daily picks, activity feeds, embed mode, and OG cards on every shareable URL.",
    highlights: [
      {
        title: "Realtime gallery feed",
        body: "Trending / Newest / All-time tabs backed by a SQL view with 3-day exponential decay. New stacks fade in at the top with a glow ring and animated New pill via Supabase Realtime.",
      },
      {
        title: "Stack of the Day",
        body: "Deterministic daily pick from top-trending, hashed by date. Front-page module that uses the chosen stack's saved OKLCH theme as its swatch.",
      },
      {
        title: "Embed mode and OG cards everywhere",
        body: "/s/[id]/embed renders a themed iframe-friendly card with attribution. New OG routes for recipes and library pages. Every shareable URL now previews properly on Twitter, Discord, and Slack.",
      },
      {
        title: "Activity feed",
        body: "A new activity_events table populated by SECURITY DEFINER triggers logs saves, publishes, likes, and forks. Surfaces on profiles and as a What others did sidebar on the dashboard.",
      },
    ],
  },
  {
    version: "v4",
    title: "Accounts",
    date: "2026-04-08",
    summary:
      "Real Supabase Auth, RLS-enforced ownership, a My Stacks dashboard, an edit workbench with AI re-rolls, public profiles, and animated OG cards for stacks.",
    highlights: [
      {
        title: "Supabase Auth + RLS",
        body: "Email/password sign-in, magic-link confirmations, auto-username generation, profiles table, tightened policies for published-or-owner reads and owner-only writes. Likes moved to a stack_likes table with a toggle_like RPC.",
      },
      {
        title: "Dashboard + edit workbench",
        body: "/dashboard lists everything you own with stats. /dashboard/edit/[id] is a three-column workbench with theme pickers, library selectors, and an AI Regenerate button.",
      },
      {
        title: "Public profiles",
        body: "/u/[username] surfaces a user's published stacks as theme swatch cards with proper OG metadata.",
      },
      {
        title: "Stack OG cards",
        body: "Every /s/[id] now generates a 1200x630 share card on demand using the stack's saved theme and the chosen library list.",
      },
    ],
  },
  {
    version: "v3",
    title: "Variety",
    date: "2026-04-01",
    summary:
      "AI-generated themes, an editorial library page, recipe browsing, and a real export pipeline (ZIP + StackBlitz).",
    highlights: [
      {
        title: "AI themes",
        body: "Generation now produces a custom OKLCH theme: background, foreground, primary, accent, plus typography and radius tokens. Themes are saved with each stack and applied on view.",
      },
      {
        title: "Recipe library",
        body: "Six hand-curated briefs with override stacks, custom themes, and detail pages. Long-form descriptions and SEO-friendly slugs.",
      },
      {
        title: "Library editorial pages",
        body: "/library and /library/[id] act as a real reference: tags, demos, when-to-use, frequently paired, and stacks using this library.",
      },
      {
        title: "Real exports",
        body: "JSZip-based ZIP export with package.json, README, and starter source. StackBlitz button opens an editable sandbox preloaded with the chosen libraries.",
      },
    ],
  },
  {
    version: "v2",
    title: "Generation",
    date: "2026-03-25",
    summary:
      "AI SDK 6 streaming structured output, a live preview pane, and a smarter recommendation engine.",
    highlights: [
      {
        title: "Streaming generation",
        body: "Switched from canned text to AI SDK 6 streamObject with a Zod schema. Headlines, rationales, and per-library reasons stream into the result panel as they're produced.",
      },
      {
        title: "Live preview pane",
        body: "Multiple preview layouts (hero, pricing, form, editorial) react to the active theme and selected libraries in real time, including animated and 3D-ready states.",
      },
      {
        title: "Recommendation engine",
        body: "Library scoring respects vibe, audience, performance budget, paid/free toggle, and tag affinity. Output ordered by score with reasons.",
      },
    ],
  },
  {
    version: "v1",
    title: "Foundation",
    date: "2026-03-18",
    summary:
      "The first version of Prism: a brief in, a curated stack out, with a beautiful editorial homepage.",
    highlights: [
      {
        title: "Editorial homepage",
        body: "Hero, marquee, capabilities, library grid, and integrations sections with GSAP scroll triggers, Lenis smooth scroll, and a custom cursor.",
      },
      {
        title: "Stack composer",
        body: "Brief + vibe + audience + perf controls. Outputs a recommended stack with per-library reasons and an impact score.",
      },
      {
        title: "20-library catalog",
        body: "Curated entries for Three.js, GSAP, Framer Motion, Shadcn, Tailwind, Lenis, R3F, drei, Rapier, Spline, OGL, Matter.js, Plasma, WebGPU, Recharts, Mapbox, and more.",
      },
    ],
  },
]

export function getChangelogEntry(version: string): ChangelogEntry | undefined {
  return CHANGELOG.find((c) => c.version === version)
}
