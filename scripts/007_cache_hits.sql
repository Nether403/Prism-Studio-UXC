-- Phase 5: Cross-user cache hits.
--
-- When a user uploads an image or rebuilds a URL whose source_hash already
-- exists in a *public* inspiration row, we want to skip the expensive
-- capture/extract pipeline and re-use the existing signature + screenshot.
-- That requires:
--   1. A counter (`cache_hit_count`) so we can surface "Most rebuilt URLs"
--      leaderboards and rank candidate public rows when several share the
--      same hash.
--   2. A SECURITY DEFINER bump RPC, because users cannot `UPDATE` rows they
--      don't own under existing RLS policies.
--   3. A leaderboard index on (cache_hit_count desc, created_at desc),
--      partial on `is_public = true and cache_hit_count > 0` to keep it
--      tight.

alter table public.inspirations
  add column if not exists cache_hit_count integer not null default 0;

create index if not exists inspirations_cache_hits_idx
  on public.inspirations (cache_hit_count desc, created_at desc)
  where is_public = true and cache_hit_count > 0;

create or replace function public.bump_cache_hit(p_inspiration_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  -- Only bump rows that are still public — owners flipping `is_public` off
  -- mid-flight should not get phantom counts.
  update public.inspirations
    set cache_hit_count = cache_hit_count + 1
    where id = p_inspiration_id and is_public = true
    returning cache_hit_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.bump_cache_hit(uuid) to authenticated;
