-- v4 migration: add accounts, ownership, account-bound likes, and forks.
-- Backfills are safe: existing anonymous stacks remain readable as long as published.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Auto-create a profile row for every new auth user, with a usable default
-- username derived from the email's local-part (with collisions resolved).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  attempt int := 0;
begin
  base_username := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-z0-9_]+', '', 'g'));
  if base_username is null or length(base_username) < 2 then
    base_username := 'user';
  end if;
  candidate := base_username;

  while exists (select 1 from public.profiles where username = candidate) loop
    attempt := attempt + 1;
    candidate := base_username || attempt::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(new.raw_user_meta_data ->> 'display_name', candidate))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- stacks: ownership, title, published, parent_id, fork_count
-- ---------------------------------------------------------------------------
alter table public.stacks
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists title text,
  add column if not exists published boolean not null default true,
  add column if not exists parent_id text references public.stacks(id) on delete set null,
  add column if not exists fork_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists stacks_user_id_idx on public.stacks (user_id, created_at desc);
create index if not exists stacks_parent_id_idx on public.stacks (parent_id);
create index if not exists stacks_published_idx on public.stacks (published, created_at desc);

-- Tightened RLS:
--  SELECT  - published OR owner
--  INSERT  - either anonymous (user_id null) or owner (user_id = auth.uid())
--  UPDATE  - owner only
--  DELETE  - owner only
drop policy if exists "stacks_public_read" on public.stacks;
create policy "stacks_published_or_owner_read"
  on public.stacks for select
  to anon, authenticated
  using (published = true or auth.uid() = user_id);

drop policy if exists "stacks_public_insert" on public.stacks;
create policy "stacks_anon_or_owner_insert"
  on public.stacks for insert
  to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists "stacks_owner_update" on public.stacks;
create policy "stacks_owner_update"
  on public.stacks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "stacks_owner_delete" on public.stacks;
create policy "stacks_owner_delete"
  on public.stacks for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-update updated_at on row update
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stacks_touch_updated_at on public.stacks;
create trigger stacks_touch_updated_at
  before update on public.stacks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- stack_likes: account-bound, idempotent
-- ---------------------------------------------------------------------------
create table if not exists public.stack_likes (
  stack_id text not null references public.stacks(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stack_id, user_id)
);

create index if not exists stack_likes_user_idx on public.stack_likes (user_id);

alter table public.stack_likes enable row level security;

drop policy if exists "stack_likes_public_read" on public.stack_likes;
create policy "stack_likes_public_read"
  on public.stack_likes for select
  to anon, authenticated
  using (true);

drop policy if exists "stack_likes_self_insert" on public.stack_likes;
create policy "stack_likes_self_insert"
  on public.stack_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "stack_likes_self_delete" on public.stack_likes;
create policy "stack_likes_self_delete"
  on public.stack_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- toggle_like(stack_id) — flips the current user's like, returns
-- {liked: bool, likes: int}. Replaces the v1 anonymous like_stack RPC.
create or replace function public.toggle_like(stack_id text)
returns table(liked boolean, likes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_liked boolean;
  new_count integer;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if exists (select 1 from public.stack_likes l where l.stack_id = toggle_like.stack_id and l.user_id = uid) then
    delete from public.stack_likes l
      where l.stack_id = toggle_like.stack_id and l.user_id = uid;
    update public.stacks
      set likes = greatest(0, likes - 1)
      where id = toggle_like.stack_id
      returning likes into new_count;
    is_liked := false;
  else
    insert into public.stack_likes (stack_id, user_id) values (toggle_like.stack_id, uid)
      on conflict do nothing;
    update public.stacks
      set likes = likes + 1
      where id = toggle_like.stack_id
      returning likes into new_count;
    is_liked := true;
  end if;

  return query select is_liked, coalesce(new_count, 0);
end;
$$;

grant execute on function public.toggle_like(text) to authenticated;

-- ---------------------------------------------------------------------------
-- fork_stack(parent_id, new_id) — copies fields, sets ownership, increments fork_count
-- ---------------------------------------------------------------------------
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

  return new_id;
end;
$$;

grant execute on function public.fork_stack(text, text, text) to authenticated;
