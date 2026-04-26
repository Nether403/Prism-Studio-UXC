-- v10 migration: Realtime publication for the public inspirations gallery.
--
-- Phase 4 adds /inspirations — a public grid of every is_public=true row in
-- public.inspirations. The client feed subscribes to INSERT events so newly
-- published captures animate in live, mirroring the /gallery experience.
-- This migration is the one piece you can't do without DDL: add the table to
-- the supabase_realtime publication so the websocket actually emits changes.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inspirations'
  ) then
    execute 'alter publication supabase_realtime add table public.inspirations';
  end if;
end $$;
