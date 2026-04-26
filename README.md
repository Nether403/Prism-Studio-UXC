# Prism Studio

> Generate cohesive design + tech stacks from a prompt, a URL, or an image.

Prism Studio is an AI-powered design lab that turns vague creative briefs into
concrete, opinionated stack recommendations — typography, color, motion,
component library, and the rationale behind every pick. It ships with three
ingestion modes (prompt, URL rebuild, image extraction), a public gallery
with realtime activity, account-bound forks and likes, and a provenance
system that traces every generated stack back to its source.

[![Continue working on v0](https://img.shields.io/badge/v0.app-Continue%20editing-black?style=for-the-badge)](https://v0.app/chat/projects/prj_cc3ThMxk4OogqytMImMizdVnnol6)
[![Open in Kiro](https://img.shields.io/badge/Kiro-Open%20repo-blue?style=for-the-badge)](https://v0.app/chat/api/kiro/clone/Nether403/Prism-Studio-UXC)

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Database setup](#database-setup)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Key concepts](#key-concepts)
- [Scripts](#scripts)
- [Performance notes](#performance-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Generation

- **Prompt-first generator** at `/` — describe a vibe, get a full stack with
  reasoning, perf budget, and impact score.
- **Rebuild from URL** at `/rebuild` — paste any public site, Prism captures a
  screenshot, extracts the canonical signature (palette, type, vibe statement,
  content signature), and re-imagines it as a fresh stack.
- **From image** at `/from-image` — upload a reference image, get a signature
  and a generated stack tuned to that aesthetic.

### Sharing & social

- **Public gallery** at `/gallery` with realtime updates via Supabase
  realtime — new published stacks animate in live.
- **Account-bound likes** with `toggle_like(text)` RPC — one tap per user,
  optimistic UI, persisted activity events.
- **Forks** via `fork_stack(parent_id, new_id, new_title)` — fork any public
  stack into your own draft, preserving lineage via `parent_id` for "Forked
  from" chips.
- **Activity feed** on `/dashboard` — incoming likes, forks, and follows from
  other users, owner-scoped.
- **User profiles** at `/u/[username]` with auto-generated handles on signup.
- **Trending view** (`stacks_trending`) — weighted decaying score that
  combines likes, forks, views, and recency.

### Provenance (the multimodal inspiration pipeline)

- **`inspirations` table** records every URL, image, OG, or paste that
  becomes a stack — with screenshot URL, canonical signature JSON, and a
  foreign key to the generated stack.
- **Provenance card** on `/s/[id]` — every share page ends with an
  "Originated from" section showing the source screenshot, hostname,
  vibe statement, content signature, source palette, and a "Re-rebuild"
  CTA that prefills `?url=` for owners.
- **Provenance strip** on `/dashboard` — horizontal carousel of every
  inspiration you've made, with linked thumbnails for completed stacks and
  dashed-border "Pending" cards for inspirations that haven't produced a
  stack yet (one click resumes them in the originating studio).
- **Live privacy toggle** — owners can flip any capture between public and
  private from either the dashboard strip or the share page itself, with
  optimistic UI and Supabase RLS enforcement.
- **Source-hash deduplication** — `inspirations_source_hash_idx` enables
  cross-user cache hits (Phase 5 roadmap item).

### Recipes & library

- Editorial **recipes** at `/recipes/[slug]` — long-form writeups that pair
  a generated stack with implementation notes.
- **Library** at `/library/[id]` — the catalog of every stack option Prism
  can pick from (frameworks, motion libs, type, color systems).
- **Embed view** at `/s/[id]/embed` — minimal iframeable view for sharing
  in Notion, Figma, Linear, etc.

### Studio polish

- Three.js hero scene (`<SceneMount>`, `<Scene>`) with mouse-reactive orb,
  decaying ring, and 600-point starfield. Gated behind
  `IntersectionObserver` so it only mounts when actually visible.
- GSAP-powered custom cursor with magnetic snap on hover targets and
  rAF-coalesced movement.
- [Lenis](https://lenis.darkroom.engineering/) smooth scroll on
  desktop/non-reduced-motion only.
- AI-generated theme system that swaps fonts and colors per stack via
  `--font-*` CSS variables on `<html>` (12 fonts available, 9 lazy-loaded).
- Keyboard-first command palette (`cmd-k`).
- `?nofx=1` URL escape hatch disables Scene + Lenis + Cursor for
  debugging or low-power devices.

---

## Tech stack

| Layer            | Choice                                                   |
| ---------------- | -------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, RSC, Turbopack)                  |
| Runtime          | React 19                                                 |
| Styling          | Tailwind CSS v4 (`@theme inline`, no config file)        |
| UI primitives    | Radix UI + custom components (`components/ui/*`)         |
| 3D               | React Three Fiber + drei                                 |
| Motion           | GSAP, Motion (Framer), Lenis                             |
| AI               | Vercel AI SDK 6 + AI Gateway                             |
| Database         | Supabase Postgres (RLS, RPC, triggers, realtime, views)  |
| Auth             | Supabase Auth (email + OAuth-ready)                      |
| File storage     | Vercel Blob (screenshots, uploaded references)           |
| Rate limiting    | Upstash Redis + `@upstash/ratelimit`                     |
| Image processing | Sharp + Cheerio (OG extraction)                          |
| Type safety      | TypeScript 5.7, Zod schemas                              |
| Forms            | react-hook-form + Zod resolvers                          |
| Notifications    | Sonner toasts                                            |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  ─────────                                                        │
│  Next.js 16 App Router · RSC · Turbopack                          │
│  Tailwind v4 · Radix · R3F · GSAP · Lenis                         │
└───────────────────────────────────────────────────────────────────┘
              │                                  │
              │ Server Actions                   │ Route Handlers
              ▼                                  ▼
┌──────────────────────────┐        ┌──────────────────────────────┐
│  app/actions/*           │        │  app/api/*                   │
│  ───────────────         │        │  ───────────────             │
│  inspiration.ts          │        │  /api/generate     (stream)  │
│   · linkInspirationToStack│        │  /api/inspire      (image)   │
│   · setInspirationPublic │        │  /api/rebuild      (URL)     │
│  stack.ts                │        │  /api/regenerate   (variant) │
│  like.ts, fork.ts        │        │  /api/variants     (re-roll) │
└──────────────────────────┘        └──────────────────────────────┘
              │                                  │
              ├──────────────┬───────────────────┤
              ▼              ▼                   ▼
       ┌────────────┐  ┌────────────┐     ┌────────────────┐
       │ Supabase   │  │ Vercel     │     │ AI Gateway     │
       │ Postgres   │  │ Blob       │     │ (OpenAI,       │
       │ + Auth     │  │ (assets)   │     │  Anthropic,    │
       │ + Realtime │  │            │     │  Google)       │
       └────────────┘  └────────────┘     └────────────────┘
              │
              ▼
       ┌──────────────────────────────────────────┐
       │  Tables:                                 │
       │   profiles, stacks, stack_likes,         │
       │   activity_events, inspirations          │
       │  Views:                                  │
       │   stacks_trending                        │
       │  RPCs:                                   │
       │   toggle_like, fork_stack, like_stack    │
       │  Triggers:                               │
       │   handle_new_user, log_stack_event,      │
       │   log_like_event, touch_updated_at       │
       │  Realtime publications:                  │
       │   public.stacks                          │
       └──────────────────────────────────────────┘
```

The `lib/supabase` directory has three entry points:

- `client.ts` — browser client (used in client components for realtime).
- `server.ts` — server client (used in RSCs and server actions, reads
  cookies for the auth session).
- `proxy.ts` — middleware-style auth refresher invoked from `proxy.ts`.

All three gracefully fall back to a stub (`lib/supabase/stub.ts`) when env
vars are missing, so the marketing surface (`/`, `/about`, `/changelog`,
recipes) renders even on a fork without Supabase configured.

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/Nether403/Prism-Studio-UXC.git
cd Prism-Studio-UXC
pnpm install
```

The repo uses **pnpm** (see `pnpm-lock.yaml`). npm/yarn/bun will work but
won't get the same dependency resolution.

### 2. Set up environment variables

Create `.env.local` (see [Environment variables](#environment-variables)
below). At minimum you need Supabase + AI Gateway. The app will boot
without them but most features will no-op.

### 3. Run the database migrations

Apply the four SQL migrations in `scripts/` in order. The fastest way is
the Supabase dashboard SQL editor:

1. `001_create_stacks.sql`
2. `002_add_accounts.sql`
3. `003_realtime_and_activity.sql`
4. `004_create_inspirations.sql`

Each is idempotent (`if not exists`, `drop policy if exists`), so re-running
them is safe.

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database setup

| Migration                              | What it adds                                                       |
| -------------------------------------- | ------------------------------------------------------------------ |
| `001_create_stacks.sql`                | `stacks` table, public RLS, `like_stack(text)` RPC                 |
| `002_add_accounts.sql`                 | `profiles`, ownership on `stacks`, `stack_likes`, `toggle_like`, `fork_stack`, auto-create profile trigger |
| `003_realtime_and_activity.sql`        | `stacks_trending` view, `activity_events` table, log triggers, `supabase_realtime` publication |
| `004_create_inspirations.sql`          | `inspirations` table, owner/public RLS, source-hash unique index   |

All tables have RLS enabled. Public read is allowed for `stacks` (when
`published = true`) and `inspirations` (when `is_public = true`).
Writes are owner-scoped via `auth.uid() = user_id` / `owner_id`.

---

## Environment variables

| Variable                            | Required | Purpose                                         |
| ----------------------------------- | -------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | Yes      | Supabase project URL                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Yes      | Supabase anon key (browser + RSC)               |
| `AI_GATEWAY_API_KEY`                | Yes      | Vercel AI Gateway key (used by `/api/*`)        |
| `BLOB_READ_WRITE_TOKEN`             | Yes      | Vercel Blob token for screenshots/uploads       |
| `UPSTASH_REDIS_REST_URL`            | Yes      | Upstash Redis URL (rate limiting)               |
| `UPSTASH_REDIS_REST_TOKEN`          | Yes      | Upstash Redis REST token                        |
| `NEXT_PUBLIC_SITE_URL`              | No       | Used by metadata + sitemap (defaults to vercel.app) |

When `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
missing, `lib/supabase/stub.ts` short-circuits all queries so the public
marketing pages still render.

---

## Project structure

```
app/
  api/                 Route handlers (generate, inspire, rebuild, …)
  actions/             Server actions (inspiration, stack, like, fork)
  auth/                Login / sign-up / error pages
  changelog/           Static changelog pages by version
  dashboard/           Owner dashboard + edit page
  from-image/          Image-driven generator
  gallery/             Public gallery with realtime stream
  library/             Catalog of stack options
  recipes/             Long-form editorial writeups
  rebuild/             URL-driven rebuild studio
  s/[id]/              Public share page + embed view
  u/[username]/        Public profile pages
  page.tsx             Homepage (prompt-first generator)
  layout.tsx           Root layout: fonts, theme provider, scene mount
  globals.css          Tailwind v4 + design tokens

components/
  ui/                  shadcn-style Radix wrappers
  scene.tsx            R3F orb + ring + stars
  scene-mount.tsx      IntersectionObserver-gated dynamic import
  cursor.tsx           GSAP magnetic cursor
  lenis-provider.tsx   Smooth-scroll provider (desktop only)
  generator.tsx        Main prompt-driven studio
  rebuild-studio.tsx   URL-driven studio (accepts initialUrl)
  from-image-studio.tsx Image-driven studio
  provenance-card.tsx  /s/[id] "Originated from" section
  provenance-thumb.tsx /dashboard horizontal capture strip
  inspiration-privacy-toggle.tsx  Live public/private toggle
  …                    50+ feature components

lib/
  supabase/            client, server, proxy, stub
  signature.ts         Signature JSON shape + helpers
  themes.ts            AI-generated theme schema + applier
  fx.ts                ?nofx=1 escape hatch helper
  ratelimit.ts         Upstash quota helpers
  …

scripts/
  001-004 .sql         Idempotent migrations
  evals/               LLM eval harness (run with `pnpm evals:run`)

proxy.ts               Next.js middleware (Supabase auth refresh)
```

---

## Key concepts

### Stacks

A `stack` is a generated recommendation: prompt + answers + headline +
rationale + 6 chosen options (framework, motion, type, color, etc.).
Stacks are public-by-default for anonymous generations, owner-scoped
once the user signs up.

### Inspirations

An `inspiration` is the **input** that produced a stack — a URL, image,
OG image, or pasted notes. It stores the screenshot, the extracted
`Signature` JSON, and a foreign key to the generated stack. Inspirations
are private-by-default; owners can flip them public to expose the
"Originated from" section to other viewers.

### Signature

The canonical extracted essence of a source: `palette` (5 swatches with
roles), `type` (heading/body font hints), `vibeStatement` (one-line
poetic summary), `contentSignature` (paragraph describing the content
DNA), and `dominantHues`. Used by the generator to anchor the stack to
the source's actual aesthetic.

### Provenance

The chain that connects an inspiration to its stack(s) and lets viewers
trace the lineage. Surfaces in three places:
1. `<ProvenanceCard>` on `/s/[id]` — the full "Originated from" detail block.
2. `<ProvenanceThumb>` / `<ProvenanceStrip>` on `/dashboard` — capture carousel.
3. The "Re-rebuild / Re-extract" CTA — deep-links the owner back into the
   originating studio with `?url=…` prefilled when applicable.

### Themes

Every generated stack ships with a `theme` JSONB blob that names a
heading font, body font, and color palette. The root `<html>` has 12
font CSS variables wired up; the theme applier swaps them per stack
without re-loading the page. Nine of those fonts are lazy (preload:
false + display: swap) so they only fetch when an active theme picks
them.

### Forks

`fork_stack(parent_id, new_id, new_title)` clones a published stack
into a new draft owned by the caller. `parent_id` and `fork_count` are
populated automatically; the share page surfaces "Forked from →" when
present.

---

## Scripts

```bash
pnpm dev               # Next.js dev server (Turbopack)
pnpm build             # Production build
pnpm start             # Production server
pnpm lint              # ESLint

pnpm evals:run         # Run LLM evals against current model
pnpm evals:baseline    # Save current eval results as baseline
pnpm evals:diff        # Diff current run against baseline
```

---

## Performance notes

- **Fonts**: only `Geist`, `Geist Mono`, and `Instrument Serif` are
  preloaded. The other 9 fonts use `preload: false` + `display: "swap"`
  and only fetch when an AI-generated theme picks them.
- **Three.js scene**: mounts only after `IntersectionObserver` confirms
  the hero is visible. Star count is 600 (down from 2000), no HDRI
  environment, the orb compensates with higher `emissiveIntensity`.
- **Cursor**: `mousemove` is rAF-coalesced. The `closest()` magnetic-snap
  walk is skipped when the cursor is moving fast (>4px/frame).
- **Lenis**: bails on touch / coarse pointer / `prefers-reduced-motion` /
  width &lt; 768px.
- **`?nofx=1`**: append to any URL to disable Scene + Lenis + Cursor.
  Useful for Lighthouse runs and v0 chat previews.
- **Supabase stub**: when env vars are missing, all queries short-circuit
  to empty results instead of throwing — the marketing surface renders
  cleanly on forks without DB access.

---

## Contributing

This repo is connected to a [v0 project](https://v0.app/chat/projects/prj_cc3ThMxk4OogqytMImMizdVnnol6).
Most changes are authored in v0 and pushed as PRs to `main`. To contribute
manually:

1. Branch from `main`.
2. Run migrations against your own Supabase project before testing.
3. Keep migrations **additive and idempotent** — never edit a migration
   that has already been merged; create `005_…sql` instead.
4. Server components and server actions go in `app/`; client-only state
   in `components/`.
5. Match the existing Tailwind / Radix / cn() patterns.

See [ROADMAP.md](./ROADMAP.md) for what's planned next.

---

## License

MIT

---

<a href="https://v0.app/chat/api/kiro/clone/Nether403/Prism-Studio-UXC" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
