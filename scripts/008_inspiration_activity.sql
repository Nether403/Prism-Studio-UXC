-- Phase QoL: inspiration activity events.
--
-- Two new event types are surfaced on profiles + the dashboard:
--   - inspiration_publish: when an owner flips is_public on a capture (or
--     creates one with is_public=true). Complements the existing `publish`
--     event for stacks so a profile can show "captured + shared a Mobbin
--     reference" alongside "published a stack".
--   - inspiration_cache_hit: when another user re-uses someone's public
--     capture via the cross-user cache path. The author of the public row
--     gets the event on their target_user_id; the actor is the re-user.
--
-- Activity events are written by SECURITY DEFINER triggers/functions, never
-- by direct INSERTs (the policy from migration 003 forbids that). Both new
-- writers run as definers so they can bypass the no-direct-insert policy.

-- 1) Extend the type CHECK constraint. Postgres requires drop + re-add.
alter table public.activity_events
  drop constraint if exists activity_events_type_check;

alter table public.activity_events
  add constraint activity_events_type_check
  check (type in (
    'save',
    'publish',
    'like',
    'fork',
    'inspiration_publish',
    'inspiration_cache_hit'
  ));

-- 2) Optional FK to the inspiration row that triggered the event. Nullable
--    because the existing stack-centric events don't reference one. Cascade
--    on delete so cleaning up an inspiration also removes its event trail.
alter table public.activity_events
  add column if not exists inspiration_id uuid
  references public.inspirations(id) on delete cascade;

create index if not exists activity_inspiration_idx
  on public.activity_events (inspiration_id, created_at desc);

-- 3) Trigger on `inspirations` that fires when:
--      - a row is inserted with is_public = true (rare; most rows start
--        private and get flipped later, but still possible via the API),
--      - or an existing row's is_public flips false -> true.
--
--    The event is attributed to the owner (actor + target are the same
--    user) so it shows up on their profile feed and not on anyone else's
--    "what others did" sidebar.
create or replace function public.log_inspiration_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
begin
  meta := jsonb_build_object(
    'source_type', new.source_type,
    'source_ref', new.source_ref
  );

  if (tg_op = 'INSERT') then
    if new.is_public = true then
      insert into public.activity_events
        (type, actor_id, target_user_id, stack_id, inspiration_id, metadata)
      values
        ('inspiration_publish', new.owner_id, new.owner_id,
         new.generated_stack_id, new.id, meta);
    end if;
  elsif (tg_op = 'UPDATE') then
    if (old.is_public is distinct from new.is_public and new.is_public = true) then
      insert into public.activity_events
        (type, actor_id, target_user_id, stack_id, inspiration_id, metadata)
      values
        ('inspiration_publish', new.owner_id, new.owner_id,
         new.generated_stack_id, new.id, meta);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists inspirations_log_publish on public.inspirations;
create trigger inspirations_log_publish
  after insert or update on public.inspirations
  for each row execute function public.log_inspiration_publish();

-- 4) Extend `bump_cache_hit` to also write a cache-hit event in addition to
--    its existing counter bump. The actor is the re-using viewer
--    (auth.uid()), the target is the original public capture's owner — so
--    the event surfaces on the original author's "what others did" feed
--    and, indirectly, on their public profile activity.
--
--    We re-define the function rather than wrap it because callers
--    (api/rebuild, api/inspire) already invoke `bump_cache_hit()` and
--    expect the integer return value back.
create or replace function public.bump_cache_hit(p_inspiration_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
  parent_owner uuid;
  parent_stack_id text;
  parent_source_type text;
  parent_source_ref text;
  uid uuid := auth.uid();
begin
  -- Only bump rows that are still public — owners flipping `is_public` off
  -- mid-flight should not get phantom counts.
  update public.inspirations
    set cache_hit_count = cache_hit_count + 1
    where id = p_inspiration_id and is_public = true
    returning cache_hit_count, owner_id, generated_stack_id, source_type, source_ref
    into new_count, parent_owner, parent_stack_id, parent_source_type, parent_source_ref;

  if new_count is null then
    -- Row wasn't public (or doesn't exist). Skip the event entirely.
    return 0;
  end if;

  -- Don't log self-hits — when an owner re-captures their own public row
  -- (rare, but possible via /api/inspire) we don't want an event flood on
  -- their own dashboard. uid can also be null for service-role callers;
  -- guard both.
  if uid is not null and uid <> parent_owner then
    insert into public.activity_events
      (type, actor_id, target_user_id, stack_id, inspiration_id, metadata)
    values (
      'inspiration_cache_hit',
      uid,
      parent_owner,
      parent_stack_id,
      p_inspiration_id,
      jsonb_build_object(
        'source_type', parent_source_type,
        'source_ref', parent_source_ref,
        'hit_count', new_count
      )
    );
  end if;

  return new_count;
end;
$$;

grant execute on function public.bump_cache_hit(uuid) to authenticated;
