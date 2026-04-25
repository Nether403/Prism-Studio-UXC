-- v5: Realtime gallery, trending score, activity events.

-- Trending view: weighted score with exponential decay over 3 days
create or replace view public.stacks_trending as
select
  s.*,
  (
    (coalesce(s.likes, 0) + coalesce(s.fork_count, 0) * 2 + coalesce(s.views, 0) * 0.05)
    * exp(- (extract(epoch from (now() - s.created_at)) / 86400.0) / 3.0)
  )::float as trending_score
from public.stacks s
where s.published = true;

-- Activity events: durable feed for profiles + dashboard
create table if not exists public.activity_events (
  id bigserial primary key,
  type text not null check (type in ('save','publish','like','fork')),
  actor_id uuid references auth.users(id) on delete set null,
  stack_id text references public.stacks(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_actor_idx on public.activity_events (actor_id, created_at desc);
create index if not exists activity_target_idx on public.activity_events (target_user_id, created_at desc);
create index if not exists activity_stack_idx on public.activity_events (stack_id, created_at desc);
create index if not exists activity_recent_idx on public.activity_events (created_at desc);

alter table public.activity_events enable row level security;

drop policy if exists "activity_public_read" on public.activity_events;
create policy "activity_public_read"
  on public.activity_events for select
  to anon, authenticated
  using (true);

-- inserts happen only via triggers / SECURITY DEFINER functions; deny direct writes
drop policy if exists "activity_no_direct_insert" on public.activity_events;
create policy "activity_no_direct_insert"
  on public.activity_events for insert
  to authenticated
  with check (false);

-- Trigger: log on stack insert + on publish flip
create or replace function public.log_stack_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.activity_events (type, actor_id, stack_id, target_user_id, metadata)
    values (
      case when new.published then 'publish' else 'save' end,
      new.user_id,
      new.id,
      new.user_id,
      jsonb_build_object('headline', new.headline, 'vibe', new.vibe)
    );
  elsif (tg_op = 'UPDATE') then
    if (old.published is distinct from new.published and new.published = true) then
      insert into public.activity_events (type, actor_id, stack_id, target_user_id, metadata)
      values ('publish', new.user_id, new.id, new.user_id,
              jsonb_build_object('headline', new.headline, 'vibe', new.vibe));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists stacks_log_event on public.stacks;
create trigger stacks_log_event
  after insert or update on public.stacks
  for each row execute function public.log_stack_event();

-- Trigger: log on like
create or replace function public.log_like_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.stacks%rowtype;
begin
  select * into s from public.stacks where id = new.stack_id;
  if not found then return new; end if;
  insert into public.activity_events (type, actor_id, stack_id, target_user_id, metadata)
  values ('like', new.user_id, new.stack_id, s.user_id,
          jsonb_build_object('headline', s.headline));
  return new;
end;
$$;

drop trigger if exists stack_likes_log_event on public.stack_likes;
create trigger stack_likes_log_event
  after insert on public.stack_likes
  for each row execute function public.log_like_event();

-- Patch fork_stack to log a fork event (security definer so it can write)
create or replace function public.fork_stack(parent_id text, new_id text, new_title text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  src public.stacks%rowtype;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into src from public.stacks where id = fork_stack.parent_id;
  if not found then
    raise exception 'Source stack not found' using errcode = 'P0002';
  end if;
  if not (src.published or src.user_id = uid) then
    raise exception 'Cannot fork private stack' using errcode = '42501';
  end if;

  insert into public.stacks (
    id, prompt, vibe, audience, performance, include_paid,
    headline, rationale, stack_ids, reasons, theme,
    impact_score, perf_budget, views, likes,
    user_id, title, published, parent_id, fork_count
  ) values (
    fork_stack.new_id, src.prompt, src.vibe, src.audience, src.performance, src.include_paid,
    src.headline, src.rationale, src.stack_ids, src.reasons, src.theme,
    src.impact_score, src.perf_budget, 0, 0,
    uid, coalesce(fork_stack.new_title, 'Fork of ' || coalesce(src.title, src.headline)),
    false, fork_stack.parent_id, 0
  );

  update public.stacks set fork_count = fork_count + 1 where id = fork_stack.parent_id;

  insert into public.activity_events (type, actor_id, stack_id, target_user_id, metadata)
  values ('fork', uid, fork_stack.parent_id, src.user_id,
          jsonb_build_object('child_id', fork_stack.new_id, 'headline', src.headline));

  return new_id;
end;
$$;

grant execute on function public.fork_stack(text, text, text) to authenticated;

-- Realtime: ensure stacks is in the supabase_realtime publication so INSERTs
-- broadcast to subscribed clients. Idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stacks'
  ) then
    execute 'alter publication supabase_realtime add table public.stacks';
  end if;
end $$;
