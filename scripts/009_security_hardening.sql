-- Security hardening: remove legacy anonymous writes and tighten public feeds.

-- Supabase exposes public views through the Data API. Make the trending view
-- run with the querying user's permissions so public.stacks RLS still applies.
alter view if exists public.stacks_trending set (security_invoker = true);

-- Anonymous gallery inserts are no longer accepted. Stacks must be owned by
-- the authenticated caller; public sharing is controlled by the `published`
-- flag after creation.
drop policy if exists "stacks_anon_or_owner_insert" on public.stacks;
drop policy if exists "stacks_owner_insert" on public.stacks;
create policy "stacks_owner_insert"
  on public.stacks for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Remove the legacy anonymous like RPC. Account-bound likes use toggle_like().
do $$
begin
  if to_regprocedure('public.like_stack(text)') is not null then
    revoke execute on function public.like_stack(text) from anon, authenticated;
  end if;
end $$;
drop function if exists public.like_stack(text);

-- Some deployed databases may not have the later inspiration activity patch yet.
-- Add the column before referencing it in the replacement read policy.
alter table public.activity_events
  add column if not exists inspiration_id uuid
  references public.inspirations(id) on delete cascade;

create index if not exists activity_inspiration_idx
  on public.activity_events (inspiration_id, created_at desc);

-- Activity events should not be globally enumerable unless they relate to a
-- public stack/inspiration. Owners and actors can still see their own events.
drop policy if exists "activity_public_read" on public.activity_events;
drop policy if exists "activity_public_safe_read" on public.activity_events;
create policy "activity_public_safe_read"
  on public.activity_events for select
  to anon, authenticated
  using (
    auth.uid() = actor_id
    or auth.uid() = target_user_id
    or (
      stack_id is not null
      and exists (
        select 1 from public.stacks s
        where s.id = activity_events.stack_id and s.published = true
      )
    )
    or (
      inspiration_id is not null
      and exists (
        select 1 from public.inspirations i
        where i.id = activity_events.inspiration_id and i.is_public = true
      )
    )
  );
