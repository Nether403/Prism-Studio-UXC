-- Prism Studio: Gallery of generated stacks (anonymous shares)
create table if not exists public.stacks (
  id text primary key,
  prompt text not null,
  vibe text not null,
  audience text not null,
  performance text not null,
  include_paid boolean not null default true,
  headline text not null,
  rationale text,
  stack_ids text[] not null default '{}',
  reasons jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  impact_score int not null default 0,
  perf_budget int not null default 0,
  views int not null default 0,
  likes int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stacks_created_at_idx on public.stacks (created_at desc);

alter table public.stacks enable row level security;

-- Anonymous, public gallery: anyone can read and create.
-- We don't allow update/delete from clients to prevent vandalism.
drop policy if exists "stacks_public_read" on public.stacks;
create policy "stacks_public_read"
  on public.stacks for select
  to anon, authenticated
  using (true);

drop policy if exists "stacks_public_insert" on public.stacks;
create policy "stacks_public_insert"
  on public.stacks for insert
  to anon, authenticated
  with check (true);

-- Likes counter: a separate function we expose so we can increment safely.
create or replace function public.like_stack(stack_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_likes int;
begin
  update public.stacks
    set likes = likes + 1
    where id = stack_id
    returning likes into new_likes;
  return coalesce(new_likes, 0);
end;
$$;

grant execute on function public.like_stack(text) to anon, authenticated;
