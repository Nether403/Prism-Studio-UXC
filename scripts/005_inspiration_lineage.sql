-- v9 migration: inspiration lineage.
--
-- Adds `parent_inspiration_id` to public.inspirations so a "More like this"
-- variant generated from an existing capture can be persisted as its own
-- inspiration row while still pointing back to the original. This lets each
-- variant have independent privacy, sharing, and re-roll history without
-- forcing the original capture to fan out to N stacks.
--
-- The column is nullable (most inspirations are root captures, not variants)
-- and uses ON DELETE SET NULL so deleting a parent doesn't cascade-blow-away
-- every variant that descended from it — variants become independent roots
-- in that case.

alter table public.inspirations
  add column if not exists parent_inspiration_id uuid references public.inspirations(id) on delete set null;

-- Walk-down index for "show me every variant of this capture".
create index if not exists inspirations_parent_idx
  on public.inspirations (parent_inspiration_id, created_at desc)
  where parent_inspiration_id is not null;
