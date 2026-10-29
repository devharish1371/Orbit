create schema if not exists orbit_private;
revoke all on schema orbit_private from public, anon;
grant usage on schema orbit_private to authenticated, service_role;
create extension if not exists pgcrypto;

-- ============ couple & members ============
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Us',
  anniversary date,
  timezone text not null default 'Asia/Kolkata',
  retention_days int not null default 7 check (retention_days between 1 and 30),
  keepsake_quota_mb int not null default 300 check (keepsake_quota_mb between 10 and 800),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  display_name text not null,
  nickname text,
  phone text,
  color text not null default '#FF6B8A',
  avatar_path text,
  share_mode text not null default 'live' check (share_mode in ('live','paused','surprise')),
  share_mode_until timestamptz,
  stale_notified boolean not null default false,
  notify_prefs jsonb not null default '{"arrive":true,"leave":true,"low_battery":true,"sharing_stopped":true,"nudge":true,"moments":true,"chat":true,"reactions":true,"capsule":true}',
  quiet_start time not null default '23:00',
  quiet_end time not null default '07:00',
  telegram_chat_id text,
  created_at timestamptz not null default now()
);
create index if not exists members_couple_idx on public.members(couple_id);

create or replace function orbit_private.limit_members() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.members where couple_id = new.couple_id) >= 2 then
    raise exception 'A couple can only have two members';
  end if;
  return new;
end $$;
drop trigger if exists trg_limit_members on public.members;
create trigger trg_limit_members before insert on public.members
  for each row execute function orbit_private.limit_members();

create or replace function orbit_private.my_couple_id() returns uuid
language sql stable security definer set search_path = '' as
$$ select couple_id from public.members where user_id = auth.uid() $$;

create or replace function orbit_private.partner_id() returns uuid
language sql stable security definer set search_path = '' as
$$ select user_id from public.members
   where couple_id = (select couple_id from public.members where user_id = auth.uid())
     and user_id <> auth.uid() limit 1 $$;

revoke all on function orbit_private.my_couple_id() from public, anon;
revoke all on function orbit_private.partner_id() from public, anon;
grant execute on function orbit_private.my_couple_id() to authenticated;
grant execute on function orbit_private.partner_id() to authenticated;

-- ============ live location & history ============
create table if not exists public.live_location (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_m real, speed_mps real, heading real,
  battery_pct smallint check (battery_pct between 0 and 100),
  charging boolean,
  is_moving boolean not null default false,
  fuzzed boolean not null default false,
  recorded_at timestamptz not null,           -- when the GPS fix happened (device clock)
  updated_at timestamptz not null default now() -- server time of last upload/heartbeat
);

create table if not exists public.location_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  lat double precision not null, lng double precision not null,
  accuracy_m real, speed_mps real, battery_pct smallint,
  recorded_at timestamptz not null,
  expires_at timestamptz not null default (now() + interval '7 days')
);
create index if not exists lh_user_time_idx on public.location_history(user_id, recorded_at desc);
create index if not exists lh_expires_idx on public.location_history(expires_at);

create table if not exists public.daily_summary (          -- permanent, tiny
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  day date not null,
  distance_km real not null default 0,
  points int not null default 0,
  primary key (user_id, day)
);

-- ============ places & presence ============
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  emoji text not null default '📍',
  lat double precision not null, lng double precision not null,
  radius_m int not null default 150 check (radius_m between 50 and 2000),
  notify_arrive boolean not null default true,
  notify_leave boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.place_presence (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  inside boolean not null,
  changed_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- ============ events (alerts feed → push) ============
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,   -- the actor
  type text not null check (type in ('arrive','leave','low_battery','sharing_stopped','sharing_resumed',
        'mode_changed','nudge','call_request','sos','capsule_unlocked','question_ready')),
  place_id uuid references public.places(id) on delete set null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
create index if not exists events_couple_time_idx on public.events(couple_id, created_at desc);
create index if not exists events_expires_idx on public.events(expires_at);

-- ============ posts (moments + chat), comments, reactions ============
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('moment','chat')),
  kind text not null check (kind in ('text','photo','voice','mood')),
  body text check (body is null or char_length(body) <= 2000),
  media_path text, thumb_path text,
  media_bytes int not null default 0, thumb_bytes int not null default 0,
  media_duration_s real,
  lat double precision, lng double precision,           -- optional: memory map pin
  ttl_hours int check (ttl_hours is null or ttl_hours between 1 and 720),
  keep boolean not null default false,
  kept_by uuid references auth.users(id) on delete set null,
  kept_at timestamptz,
  expires_at timestamptz,                               -- set by trigger; null when kept
  created_at timestamptz not null default now(),
  check (kind <> 'text' or body is not null),
  check (kind not in ('photo','voice') or media_path is not null)
);
create index if not exists posts_feed_idx on public.posts(couple_id, channel, created_at desc);
create index if not exists posts_expiry_idx on public.posts(expires_at) where keep = false;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments(post_id, created_at);

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

-- ============ delight ============
create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 4000),
  unlock_at timestamptz not null,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.question_answers (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  question_idx int not null,
  answer text not null check (char_length(answer) between 1 and 1000),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ============ infra ============
create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens(user_id);

create table if not exists public.retention_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  posts_deleted int not null default 0,
  files_deleted int not null default 0,
  orphans_deleted int not null default 0,
  history_deleted int not null default 0,
  events_deleted int not null default 0,
  bytes_freed bigint not null default 0,
  error text
);

create table if not exists public._migrations (
  name text primary key, checksum text, applied_at timestamptz not null default now()
);

-- Deletion leases serialize storage cleanup with Keep. Tombstones serialize orphan
-- cleanup with late references. Neither table/state is writable by an app user.
alter table public.posts add column if not exists deleting_at timestamptz;
alter table public.posts add column if not exists deletion_token uuid;
alter table public.capsules add column if not exists notified_at timestamptz;
create table if not exists public.media_gc (
  path text primary key,
  claimed_at timestamptz not null default now()
);
alter table public.media_gc enable row level security;

-- Related-row ownership must agree even when the caller knows an inaccessible UUID.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_identity_couple') then
    alter table public.members add constraint members_identity_couple unique (user_id, couple_id);
    alter table public.places add constraint places_identity_couple unique (id, couple_id);
    alter table public.posts add constraint posts_identity_couple unique (id, couple_id);
    alter table public.live_location add constraint live_member foreign key (user_id,couple_id) references public.members(user_id,couple_id) on delete cascade;
    alter table public.location_history add constraint history_member foreign key (user_id,couple_id) references public.members(user_id,couple_id) on delete cascade;
    alter table public.daily_summary add constraint summary_member foreign key (user_id,couple_id) references public.members(user_id,couple_id) on delete cascade;
    alter table public.posts add constraint post_member foreign key (author_id,couple_id) references public.members(user_id,couple_id) on delete cascade;
    alter table public.capsules add constraint capsule_member foreign key (author_id,couple_id) references public.members(user_id,couple_id) on delete cascade;
    alter table public.question_answers add constraint answer_member foreign key (user_id,couple_id) references public.members(user_id,couple_id) on delete cascade;
    alter table public.place_presence add constraint presence_place foreign key (place_id,couple_id) references public.places(id,couple_id) on delete cascade;
    alter table public.place_presence add constraint presence_member foreign key (user_id,couple_id) references public.members(user_id,couple_id) on delete cascade;
    alter table public.comments add constraint comment_post foreign key (post_id,couple_id) references public.posts(id,couple_id) on delete cascade;
    alter table public.reactions add constraint reaction_post foreign key (post_id,couple_id) references public.posts(id,couple_id) on delete cascade;
    alter table public.events add constraint event_member foreign key (user_id,couple_id) references public.members(user_id,couple_id) on delete cascade;
    alter table public.events add constraint event_place foreign key (place_id,couple_id) references public.places(id,couple_id);
    alter table public.posts add constraint nonnegative_bytes check (media_bytes >= 0 and thumb_bytes >= 0);
    alter table public.posts add constraint post_location check ((lat is null and lng is null) or (lat between -90 and 90 and lng between -180 and 180));
    alter table public.places add constraint place_location check (lat between -90 and 90 and lng between -180 and 180);
    alter table public.location_history add constraint history_location check (lat between -90 and 90 and lng between -180 and 180);
    alter table public.posts add constraint media_uuid_path check (media_path is null or media_path ~ ('^' || couple_id || '/' || author_id || '/' || id || '\.(webp|jpg|jpeg|png|webm|ogg|m4a|mp4|mp3|aac)$'));
    alter table public.posts add constraint thumb_uuid_path check (thumb_path is null or thumb_path = couple_id || '/' || author_id || '/' || id || '_t.webp');
  end if;
end $$;

-- Serialize membership counts, including administrative inserts and updates.
create or replace function orbit_private.limit_members() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.couples where id = new.couple_id for update;
  if (select count(*) from public.members where couple_id = new.couple_id and user_id <> new.user_id) >= 2 then
    raise exception 'COUPLE_MEMBER_LIMIT';
  end if;
  return new;
end $$;
drop trigger if exists trg_limit_members on public.members;
create trigger trg_limit_members before insert or update of couple_id on public.members
for each row execute function orbit_private.limit_members();
