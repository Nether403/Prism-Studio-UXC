-- v8 migration: inspirations — unified ingestion table for the two moonshots.
--
-- One table replaces the originally proposed split between `rebuilds` and
-- `image_briefs`. The discriminator column `source_type` is enough to render
-- the right card variant in the dashboard and to branch in the API route.
--
-- A row here represents "the system saw something" — a URL captured, an image
-- uploaded, an OG image scraped, or text pasted. The `signature jsonb` column
-- holds the canonical Signature shape from `lib/signature.ts`. The optional
-- `generated_stack_id` connects the inspiration to the stack it produced.

create extension if not exists pgcrypto;

create table if not exists public.inspirations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,

  -- Provenance ------------------------------------------------------------
  source_type text not null check (source_type in ('url', 'image', 'og', 'paste')),
  source_ref  text not null,        -- URL, blob storage path, or paste hash
  source_hash text,                 -- SHA-256 of the captured/uploaded image bytes (cache key)

  screenshot_url text,              -- nullable for pure paste inputs

  -- Output ----------------------------------------------------------------
  signature jsonb,                                          -- canonical Signature (see lib/signature.ts)
  generated_stack_id text references public.stacks(id) on delete set null,

  -- Sharing ---------------------------------------------------------------
  is_public boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspirations_owner_idx
  on public.inspirations (owner_id, created_at desc);

create index if not exists inspirations_stack_idx
  on public.inspirations (generated_stack_id);

create index if not exists inspirations_public_idx
  on public.inspirations (is_public, created_at desc)
  where is_public = true;

-- Per-user cache lookup: "have I already processed this exact image?"
create unique index if not exists inspirations_owner_source_hash_uidx
  on public.inspirations (owner_id, source_hash)
  where source_hash is not null;

-- Cross-user cache lookup: skip the multimodal call if any user has processed
-- this exact image hash before. Cheaper than a uniqueness constraint.
create index if not exists inspirations_source_hash_idx
  on public.inspirations (source_hash);

alter table public.inspirations enable row level security;

-- SELECT: public OR owner. Same shape as stacks_published_or_owner_read.
drop policy if exists "inspirations_public_or_owner_read" on public.inspirations;
create policy "inspirations_public_or_owner_read"
  on public.inspirations for select
  to anon, authenticated
  using (is_public = true or auth.uid() = owner_id);

-- INSERT: owner only. Anonymous inspirations are intentionally NOT allowed
-- because /rebuild and /from-image both gate on auth + per-user quota.
drop policy if exists "inspirations_owner_insert" on public.inspirations;
create policy "inspirations_owner_insert"
  on public.inspirations for insert
  to authenticated
  with check (auth.uid() = owner_id);

-- UPDATE / DELETE: owner only.
drop policy if exists "inspirations_owner_update" on public.inspirations;
create policy "inspirations_owner_update"
  on public.inspirations for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "inspirations_owner_delete" on public.inspirations;
create policy "inspirations_owner_delete"
  on public.inspirations for delete
  to authenticated
  using (auth.uid() = owner_id);

-- Auto-update updated_at on row update. Reuses the function defined in 002.
drop trigger if exists inspirations_touch_updated_at on public.inspirations;
create trigger inspirations_touch_updated_at
  before update on public.inspirations
  for each row execute function public.touch_updated_at();
