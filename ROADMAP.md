# Roadmap

A living document of what's shipped and what's planned next for
UXC (formerly Prism Studio). Reorder, edit, or strike through items freely as
priorities shift.

> Last updated: April 2026 (QoL bundle — profile provenance strip, dashboard bulk-privacy, `/from-image?ref=` resume, inspiration activity events)

---

## Now (in flight)

Work that's already merged or actively being built.

- [x] **Phase 0 — Foundation**: unified `signature` schema, palette
      extractor, OG/URL capture pipeline.
- [x] **Phase 1 — Multimodal inspiration pipeline**: `/from-image`
      and `/rebuild` routes, `inspirations` table, `linkInspirationToStack`
      server action, RLS for owner-or-public visibility.
- [x] **Phase 2 — Provenance display**:
  - [x] `<ProvenanceCard>` on `/s/[id]` — "Originated from" detail block
        with screenshot, source-type chip, hostname link, vibe statement,
        content signature, source palette, owner-only "Re-rebuild" CTA.
  - [x] `<ProvenanceStrip>` + `<ProvenanceThumb>` on `/dashboard` —
        horizontal capture carousel with linked / pending states.
  - [x] **Live privacy toggle** — flip `is_public` from the dashboard
        strip and from the share page itself, optimistic UI, RLS-enforced.
  - [x] **`?url=` prefill** — owner clicks "Re-rebuild" → lands in
        `/rebuild` with their original URL pre-filled.

---

## Next (Q2 2026)

The smallest set of changes that turns "Phase 2 done" into "the
inspiration loop feels complete."

### Phase 3 — Variants from inspirations

- [x] Wire `/api/variants` to accept an `inspirationId` and condition
      its re-roll on the source signature (palette, fonts, vibe statement,
      library hints), not just the generated stack.
- [x] Add a "More like this" button to `<ProvenanceCard>` that fires
      `/api/variants` and renders a 3-card grid of alternative stacks
      (`<MoreLikeThis>` component).
- [x] Persist variants as `inspirations.parent_inspiration_id` (migration
      `005_inspiration_lineage.sql`) so each saved variant gets its own
      inspiration row pointing back to the parent capture.
- [ ] Eval coverage: variant diversity score (palette delta, font delta,
      stack-id Jaccard distance) added to `scripts/evals/`.
- [x] Surface a "variant of …" breadcrumb on `/s/[id]` when the showing
      stack's inspiration has a `parent_inspiration_id`, with a link to
      the source.
- [x] Render lineage trees on `/dashboard` — group variants under their
      parent in the captures strip (`<ProvenanceStrip>` re-orders rows
      newest-root-first then walks each root's children oldest→newest;
      child thumbs get a primary-tinted left rail and a "Variant N/M"
      badge anchored to their parent).

### Phase 4 — Public inspiration gallery

- [x] New route `/inspirations` — public grid of `is_public = true`
      inspirations, sortable by recency.
- [x] Each card links to the producing stack's share page.
- [x] Filter chips: source type (URL / image / OG / paste).
- [x] Realtime-subscribed: new public inspirations animate in
      (`alter publication supabase_realtime add table public.inspirations`,
      migration `006_inspirations_realtime.sql`).
- [x] Sort by popularity (cache-hit count) — new "Popular" tab on
      `/inspirations` filters to `cache_hit_count > 0` and orders desc,
      with a per-card "· N reuses" badge.
- [x] Dominant-hue filter chip — five-bucket clustering (Warm / Sun /
      Cool / Purple / Mono) computed client-side from
      `signature.palette[0]` via HSL; chips show per-bucket counts and
      disable when empty. URL param `?hue=…` makes filters shareable.
- [ ] "Featured" boolean column + admin moderation queue.

### Phase 5 — Cross-user cache hits

- [x] When `/api/inspire` or `/api/rebuild` receives a source whose
      `source_hash` already exists publicly, clone the signature +
      screenshot into an owned row and skip the capture/extract
      pipeline (no Gemini call, no Blob upload, no quota spend on
      `/api/rebuild`).
- [x] Owner sees a "Cached from public capture" chip and can re-run
      with `?force=1` via the "Capture fresh anyway" button.
- [x] Counter on `inspirations`: `cache_hit_count` (migration
      `007_cache_hits.sql`) bumped via `bump_cache_hit(uuid)`
      SECURITY DEFINER RPC, with a `where is_public = true and
      cache_hit_count > 0` partial index for leaderboard queries.
- [x] "Most rebuilt URLs" leaderboard surface — `<MostRebuiltStrip>`
      hero on `/inspirations` renders the top 6 public rows by
      `cache_hit_count` (parallel-fetched alongside the feed; query
      hits the `inspirations_cache_hits_idx` partial index).

### Quality of life

- [x] **`/from-image` resume** — `?ref=<inspirationId>` server-fetches
      the owner's row, validates ownership, and hands a `ResumedInspiration`
      down to `<FromImageStudio>` so it boots straight into the variant
      picker with the existing palette/brief loaded; pending captures
      from the dashboard now link here instead of forcing a re-upload.
- [x] **Provenance on profiles** — `/u/[username]` renders a
      `<ProvenanceStrip>` of the user's public captures (limit 24,
      `parent_inspiration_id` included so lineage groups still work);
      header gets a "· N public captures" sub-stat next to the stack
      count.
- [x] **Bulk privacy** — `<DashboardCapturesStrip>` adds a "Manage"
      mode that turns thumbs into selection targets; a sticky toolbar
      surfaces "Make public / Make private" actions wired to the new
      `setInspirationsPublicBulk` server action (RLS + explicit
      `eq("owner_id", uid)` double-guard, 100-row defensive cap).
- [x] **Activity events for inspirations** — migration
      `008_inspiration_activity.sql` widens the `activity_events.type`
      CHECK to add `inspiration_publish` + `inspiration_cache_hit`,
      installs an `AFTER INSERT/UPDATE` trigger on `inspirations` that
      logs publishes (insert with `is_public=true` or false-to-true
      flip), and replaces `bump_cache_hit()` so it also writes a
      cache-hit event with the original author as `target_user_id`.
      `<ActivityFeed>` renders both with hostname-only labels for URL
      sources (no leaked blob paths for image uploads).

---

## Later (H2 2026)

Bigger bets that depend on the above shipping cleanly first.

### Collaboration

- [ ] **Shared workspaces** — multiple users can co-own a set of stacks
      and inspirations. New `workspace_id` foreign key on `stacks` /
      `inspirations`, RLS extended to "owner OR workspace member."
- [ ] **Comments** on share pages with threaded replies + Markdown.
- [ ] **Mentions** (`@username`) wire into the activity feed.

### Generation depth

- [ ] **Progressive disclosure** in the studio — first response shows
      the headline + palette in &lt; 2s, the full rationale streams in
      after.
- [ ] **Constrained generation** — let the user pin specific options
      (e.g. "must use Tailwind") and re-roll the rest.
- [ ] **Recipe derivation** — one-click "Turn this stack into a recipe"
      drafts a long-form `/recipes/[slug]` writeup with implementation
      steps, ready for editorial review.
- [ ] **Code export** — generate a starter `app/page.tsx` matching the
      stack's palette, type, and motion choices, exportable as a zip
      via existing `jszip` dep.

### Distribution

- [ ] **API access** — public REST endpoint for `/api/generate` and
      `/api/inspire` with per-key rate limiting via Upstash.
- [ ] **Figma plugin** — paste a UXC stack URL into Figma, get the
      palette + type tokens applied to the file.
- [ ] **Browser extension** — right-click any site → "Rebuild with
      UXC" opens `/rebuild?url=<current>`.

### Trust & moderation

- [ ] **NSFW / abuse filter** on the public gallery + inspirations
      gallery, using AI Gateway's classification models.
- [ ] **DMCA reporting flow** for screenshots of third-party sites.
- [ ] **`robots.txt` honoring** — when `/rebuild` captures a URL,
      respect `User-agent: *` `Disallow:` rules and surface a clear
      error to the user.

---

## Experimental (parking lot)

Things we'd love to try but haven't committed to.

- **Audio-to-stack** — drop a track, get a stack tuned to its energy
  curve and timbre. (Probably needs a dedicated audio-feature
  extractor.)
- **Stack diff view** — pick two share pages, get a side-by-side
  rationale of what changed and why.
- **Time-machine recipes** — "What would this brief look like in 2008?
  In 2032?" Era-conditioned generation with period-appropriate stacks.
- **Live coediting in studio** — two people drive the prompt + answers
  together, presence cursors via Supabase realtime.
- **Skill graph** — map every option in `/library` to a difficulty +
  popularity score, surface "you've never picked Astro" prompts.

---

## Done (recent)

- 2026-04 — QoL bundle. `/u/[username]` profiles now mount a
  `<ProvenanceStrip>` of the user's public captures with lineage
  grouping intact, plus a "· N public captures" stat in the profile
  header. The dashboard strip is replaced by `<DashboardCapturesStrip>`
  with a "Manage" toggle that turns thumbs into selectable targets and
  surfaces a sticky toolbar driving `setInspirationsPublicBulk` (single
  round-trip, RLS-double-guarded, 100-row cap). `/from-image` accepts a
  `?ref=<inspirationId>` query param: the page server-fetches the
  owner's row and hands a `ResumedInspiration` down to the studio so
  the variant picker boots without a re-upload — the dashboard's
  "Pending" thumbs now deep-link here, and pending captures preserve
  `?ref=` across login. Activity migration `008_inspiration_activity.sql`
  widens the `type` CHECK to add `inspiration_publish` and
  `inspiration_cache_hit`, installs an `AFTER INSERT/UPDATE` trigger on
  `inspirations` to log publishes, and replaces `bump_cache_hit()` so
  the existing counter bump also writes a cache-hit event attributed
  to the re-using viewer with the original author as
  `target_user_id`. `<ActivityFeed>` renders both new event types with
  hostname-only labels for URL sources (no leaked blob paths).
- 2026-04 — Phase 3/4/5 close-the-loop. The dashboard captures strip
  now groups "More like this" variants under their parent thumb
  (newest root first, children oldest→newest, primary-tinted left
  rail + "Variant N/M" badge). `/inspirations` gains a "Popular" tab
  that filters and sorts by `cache_hit_count`, a five-bucket
  dominant-hue chip set (Warm / Sun / Cool / Purple / Mono) computed
  client-side from `signature.palette[0]` HSL, and a per-card
  "· N reuses" pill on every row that's been hit. A new
  `<MostRebuiltStrip>` hero sits above the feed and surfaces the top
  six rows by `cache_hit_count` via the `inspirations_cache_hits_idx`
  partial index from migration `007`.
- 2026-04 — Phase 5 v1 — cross-user cache hits. `/api/inspire` and
  `/api/rebuild` now consult a public `inspirations.source_hash`
  lookup after the per-owner cache miss; on hit they clone the
  signature/screenshot into an owned row with
  `parent_inspiration_id` set and bump `cache_hit_count` on the
  parent via the new `bump_cache_hit(uuid)` SECURITY DEFINER RPC
  (migration `007`). The studios surface a "Cached from public
  capture" chip plus a "Capture fresh anyway" button that re-submits
  with `?force=1` to skip the lookup. Cached `/api/rebuild`
  responses don't consume daily quota.
- 2026-04 — Phase 4 v1 — public inspirations gallery at `/inspirations`.
  Realtime feed of `is_public = true` rows with tabs (newest / with-stack
  / captures-only) and source-type filter chips; cards deep-link to the
  generated stack when one exists. Migration `006` adds
  `public.inspirations` to the `supabase_realtime` publication so
  inserts stream live to subscribed clients. Closes Phase 3 with the
  "variant of …" lineage breadcrumb on `/s/[id]`, walking
  `parent_inspiration_id → generated_stack_id` to link a variant back
  to its source stack.
- 2026-04 — Phase 3 v1 — variants from inspirations. `/api/variants`
  now accepts `inspirationId` and seeds every variant from the stored
  signature; `<MoreLikeThis>` renders an owner-only 3-card strip on
  the share page; `saveVariantFromInspiration` writes the new stack
  with full `parent_inspiration_id` lineage.
- 2026-04 — Page-unresponsive triage: lazy theme fonts, scene
  perf-pass (600 stars, no HDRI), IntersectionObserver gate, rAF
  cursor, `?nofx=1` escape hatch.
- 2026-04 — Supabase graceful-degradation stub (`lib/supabase/stub.ts`)
  so forks without env vars still render the marketing surface.
- 2026-04 — Provenance UI Phase 2 complete (card + strip + privacy
  toggle + `?url=` prefill).
- 2026-03 — Phase 1 multimodal pipeline (URL rebuild + image
  extraction + `inspirations` schema).
- 2026-03 — `/about` page with structured metadata.
- 2026-02 — Realtime gallery + activity events.
- 2026-02 — Account-bound likes, forks, profiles.

---

## How to use this file

- Move items between sections as priorities shift.
- Tick `[x]` boxes when shipped, but keep the line — the timeline
  below the "Now" / "Next" / "Later" sections is what becomes the
  "Done" log.
- When a phase is fully shipped, summarize it in **Done** and remove
  the per-task list above to keep this readable.
- Big ideas that aren't real commitments live in **Experimental**.
- Keep this file under ~300 lines. If it gets longer, archive
  completed phases to `docs/roadmap-archive.md`.
