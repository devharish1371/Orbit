# 04 · Database, Security & Auto‑Delete (Retention)

Put each block below in `supabase/migrations/` with the shown filename. Apply in order with
`tools/apply_sql.py`. All migrations must be **idempotent** (`if not exists`, `create or replace`,
guarded policy creation) so re-runs are safe. If an extension can't be created via SQL, enable it
in Dashboard → Database → Extensions (human task #2) and re-run.

> Rule: **never `delete from storage.objects`**. Deleting through SQL leaves the physical file
> orphaned and it keeps counting against quota. Use the Storage API (`.remove([...])`, max 1000
> paths per call) from the Edge Function.

---
## 0001_core.sql — tables & helpers

```sql
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

create or replace function public.limit_members() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.members where couple_id = new.couple_id) >= 2 then
    raise exception 'A couple can only have two members';
  end if;
  return new;
end $$;
drop trigger if exists trg_limit_members on public.members;
create trigger trg_limit_members before insert on public.members
  for each row execute function public.limit_members();

create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path = public as
$$ select couple_id from public.members where user_id = auth.uid() $$;

create or replace function public.partner_id() returns uuid
language sql stable security definer set search_path = public as
$$ select user_id from public.members
   where couple_id = (select couple_id from public.members where user_id = auth.uid())
     and user_id <> auth.uid() limit 1 $$;

revoke all on function public.my_couple_id() from public, anon;
revoke all on function public.partner_id() from public, anon;
grant execute on function public.my_couple_id() to authenticated;
grant execute on function public.partner_id() to authenticated;

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
  name text primary key, applied_at timestamptz not null default now()
);
```

---
## 0002_rls.sql — Row Level Security (default deny)

```sql
-- Lock down anon completely
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

do $$ declare t text; begin
  foreach t in array array['couples','members','live_location','location_history','daily_summary',
    'places','place_presence','events','posts','comments','reactions','capsules',
    'question_answers','device_tokens','retention_runs','_migrations'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop; end $$;

-- helper: drop-and-create keeps this migration re-runnable
create or replace procedure public._policy(tbl text, pname text, ddl text)
language plpgsql as $$ begin
  execute format('drop policy if exists %I on public.%I', pname, tbl);
  execute ddl; end $$;

-- couples
call public._policy('couples','couples_select', $$create policy couples_select on public.couples for select to authenticated using (id = public.my_couple_id())$$);
call public._policy('couples','couples_update', $$create policy couples_update on public.couples for update to authenticated using (id = public.my_couple_id()) with check (id = public.my_couple_id())$$);

-- members (insert/delete only by service role)
call public._policy('members','members_select', $$create policy members_select on public.members for select to authenticated using (couple_id = public.my_couple_id())$$);
call public._policy('members','members_update_self', $$create policy members_update_self on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id())$$);
-- users may only change these columns on themselves:
revoke update on public.members from authenticated;
grant update (display_name, nickname, phone, color, avatar_path, share_mode, share_mode_until,
              notify_prefs, quiet_start, quiet_end) on public.members to authenticated;

-- live_location
call public._policy('live_location','ll_select', $$create policy ll_select on public.live_location for select to authenticated using (couple_id = public.my_couple_id())$$);
call public._policy('live_location','ll_insert', $$create policy ll_insert on public.live_location for insert to authenticated with check (user_id = auth.uid() and couple_id = public.my_couple_id())$$);
call public._policy('live_location','ll_update', $$create policy ll_update on public.live_location for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id())$$);

-- location_history (append-only for users)
call public._policy('location_history','lh_select', $$create policy lh_select on public.location_history for select to authenticated using (couple_id = public.my_couple_id())$$);
call public._policy('location_history','lh_insert', $$create policy lh_insert on public.location_history for insert to authenticated with check (user_id = auth.uid() and couple_id = public.my_couple_id())$$);

-- daily_summary (read-only to users; written by SQL function)
call public._policy('daily_summary','ds_select', $$create policy ds_select on public.daily_summary for select to authenticated using (couple_id = public.my_couple_id())$$);

-- places (either partner manages)
call public._policy('places','pl_all', $$create policy pl_all on public.places for all to authenticated using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id())$$);

-- place_presence
call public._policy('place_presence','pp_select', $$create policy pp_select on public.place_presence for select to authenticated using (couple_id = public.my_couple_id())$$);
call public._policy('place_presence','pp_write', $$create policy pp_write on public.place_presence for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id())$$);

-- events
call public._policy('events','ev_select', $$create policy ev_select on public.events for select to authenticated using (couple_id = public.my_couple_id())$$);
call public._policy('events','ev_insert', $$create policy ev_insert on public.events for insert to authenticated with check (user_id = auth.uid() and couple_id = public.my_couple_id())$$);

-- posts: author inserts/deletes; EITHER partner can flip `keep` (column-level grant)
call public._policy('posts','po_select', $$create policy po_select on public.posts for select to authenticated using (couple_id = public.my_couple_id())$$);
call public._policy('posts','po_insert', $$create policy po_insert on public.posts for insert to authenticated with check (author_id = auth.uid() and couple_id = public.my_couple_id() and keep = false)$$);
call public._policy('posts','po_delete', $$create policy po_delete on public.posts for delete to authenticated using (author_id = auth.uid())$$);
call public._policy('posts','po_update_keep', $$create policy po_update_keep on public.posts for update to authenticated using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id())$$);
revoke update on public.posts from authenticated;
grant update (keep) on public.posts to authenticated;

-- comments / reactions
call public._policy('comments','co_select', $$create policy co_select on public.comments for select to authenticated using (couple_id = public.my_couple_id())$$);
call public._policy('comments','co_insert', $$create policy co_insert on public.comments for insert to authenticated with check (author_id = auth.uid() and couple_id = public.my_couple_id())$$);
call public._policy('comments','co_delete', $$create policy co_delete on public.comments for delete to authenticated using (author_id = auth.uid())$$);
call public._policy('reactions','re_select', $$create policy re_select on public.reactions for select to authenticated using (couple_id = public.my_couple_id())$$);
call public._policy('reactions','re_insert', $$create policy re_insert on public.reactions for insert to authenticated with check (user_id = auth.uid() and couple_id = public.my_couple_id())$$);
call public._policy('reactions','re_delete', $$create policy re_delete on public.reactions for delete to authenticated using (user_id = auth.uid())$$);

-- capsules: author always; partner only after unlock
call public._policy('capsules','ca_select', $$create policy ca_select on public.capsules for select to authenticated using (couple_id = public.my_couple_id() and (author_id = auth.uid() or unlock_at <= now()))$$);
call public._policy('capsules','ca_insert', $$create policy ca_insert on public.capsules for insert to authenticated with check (author_id = auth.uid() and couple_id = public.my_couple_id() and unlock_at > now())$$);
call public._policy('capsules','ca_delete', $$create policy ca_delete on public.capsules for delete to authenticated using (author_id = auth.uid() and unlock_at > now())$$);
-- recipient marks opened:
call public._policy('capsules','ca_open', $$create policy ca_open on public.capsules for update to authenticated using (couple_id = public.my_couple_id() and author_id <> auth.uid() and unlock_at <= now()) with check (couple_id = public.my_couple_id())$$);
revoke update on public.capsules from authenticated;
grant update (opened_at) on public.capsules to authenticated;

-- question_answers: partner's answer visible only after you answered that day
create or replace function public.has_answered(p_day date) returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.question_answers where user_id = auth.uid() and day = p_day) $$;
grant execute on function public.has_answered(date) to authenticated;
call public._policy('question_answers','qa_select', $$create policy qa_select on public.question_answers for select to authenticated using (couple_id = public.my_couple_id() and (user_id = auth.uid() or public.has_answered(day)))$$);
call public._policy('question_answers','qa_insert', $$create policy qa_insert on public.question_answers for insert to authenticated with check (user_id = auth.uid() and couple_id = public.my_couple_id())$$);

-- device_tokens: own only
call public._policy('device_tokens','dt_own', $$create policy dt_own on public.device_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())$$);

-- retention_runs: read-only status for members
call public._policy('retention_runs','rr_select', $$create policy rr_select on public.retention_runs for select to authenticated using (public.my_couple_id() is not null)$$);

-- remove the helper so it can never be invoked by clients (it is re-created at the top on re-run)
drop procedure if exists public._policy(text, text, text);

-- realtime
do $$ begin
  begin alter publication supabase_realtime add table public.live_location; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.posts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reactions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.comments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.places; exception when duplicate_object then null; end;
end $$;
```

---
## 0003_triggers_ttl_stale.sql — expiry, keep quota, stale detection, roll-up

```sql
-- expiry stamping
create or replace function public.set_expiry() returns trigger
language plpgsql security definer set search_path = public as $$
declare d int;
begin
  select retention_days into d from public.couples where id = new.couple_id;
  d := coalesce(d, 7);
  if tg_table_name = 'posts' then
    new.expires_at := now() + make_interval(hours => coalesce(new.ttl_hours, d * 24));
  else
    new.expires_at := now() + make_interval(days => d);
  end if;
  return new;
end $$;
drop trigger if exists trg_posts_expiry on public.posts;
create trigger trg_posts_expiry before insert on public.posts for each row execute function public.set_expiry();
drop trigger if exists trg_events_expiry on public.events;
create trigger trg_events_expiry before insert on public.events for each row execute function public.set_expiry();
drop trigger if exists trg_lh_expiry on public.location_history;
create trigger trg_lh_expiry before insert on public.location_history for each row execute function public.set_expiry();

-- keep / un-keep with quota
create or replace function public.posts_keep_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare used bigint; q int; d int;
begin
  if new.keep and not old.keep then
    select coalesce(sum(media_bytes + thumb_bytes), 0) into used
      from public.posts where couple_id = new.couple_id and keep and id <> new.id;
    select keepsake_quota_mb into q from public.couples where id = new.couple_id;
    if used + new.media_bytes + new.thumb_bytes > q::bigint * 1024 * 1024 then
      raise exception 'KEEPSAKE_QUOTA_EXCEEDED' using errcode = 'P0001';
    end if;
    new.expires_at := null; new.kept_at := now(); new.kept_by := auth.uid();
  elsif not new.keep and old.keep then
    select retention_days into d from public.couples where id = new.couple_id;
    new.expires_at := now() + make_interval(days => coalesce(d, 7));
    new.kept_at := null; new.kept_by := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_posts_keep on public.posts;
create trigger trg_posts_keep before update of keep on public.posts
  for each row when (old.keep is distinct from new.keep) execute function public.posts_keep_change();

-- live_location: bump updated_at; clear stale flag & announce resume
create or replace function public.on_live_location_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare was_stale boolean;
begin
  new.updated_at := now();
  select stale_notified into was_stale from public.members where user_id = new.user_id;
  if coalesce(was_stale, false) then
    update public.members set stale_notified = false where user_id = new.user_id;
    insert into public.events (couple_id, user_id, type) values (new.couple_id, new.user_id, 'sharing_resumed');
  end if;
  return new;
end $$;
drop trigger if exists trg_ll_write on public.live_location;
create trigger trg_ll_write before insert or update on public.live_location
  for each row execute function public.on_live_location_write();

-- stale detection (runs every 5 min via pg_cron; works even if the phone is dead)
create or replace function public.check_stale_members() returns void
language plpgsql security definer set search_path = public as $$
begin
  with stale as (
    select m.user_id, m.couple_id, l.updated_at
    from public.members m join public.live_location l on l.user_id = m.user_id
    where m.share_mode = 'live' and not m.stale_notified
      and l.updated_at < now() - interval '30 minutes'
  ), ins as (
    insert into public.events (couple_id, user_id, type, payload)
    select couple_id, user_id, 'sharing_stopped', jsonb_build_object('last_seen', updated_at) from stale
    returning user_id
  )
  update public.members set stale_notified = true where user_id in (select user_id from ins);
end $$;

-- auto-resume of paused/surprise modes whose time elapsed (also handled client-side)
create or replace function public.expire_share_modes() returns void
language plpgsql security definer set search_path = public as $$
begin
  with exp as (
    update public.members set share_mode = 'live', share_mode_until = null
    where share_mode <> 'live' and share_mode_until is not null and share_mode_until < now()
    returning user_id, couple_id)
  insert into public.events (couple_id, user_id, type, payload)
  select couple_id, user_id, 'mode_changed', '{"to":"live","auto":true}' from exp;
end $$;

-- nightly roll-up (previous local day) BEFORE raw history expires
create or replace function public.rollup_daily() returns void
language plpgsql security definer set search_path = public as $$
declare c record; d date;
begin
  for c in select id, timezone from public.couples loop
    d := (now() at time zone c.timezone)::date - 1;
    insert into public.daily_summary (user_id, couple_id, day, distance_km, points)
    select user_id, couple_id, d,
           coalesce(sum(seg_km) filter (where seg_km / greatest(extract(epoch from dt) / 3600.0, 0.0003) < 250), 0)::real,
           count(*)::int
    from (
      select user_id, couple_id,
        recorded_at - lag(recorded_at) over w as dt,
        2 * 6371 * asin(sqrt(
          power(sin(radians(lat - lag(lat) over w) / 2), 2) +
          cos(radians(lag(lat) over w)) * cos(radians(lat)) *
          power(sin(radians(lng - lag(lng) over w) / 2), 2))) as seg_km
      from public.location_history
      where couple_id = c.id and (recorded_at at time zone c.timezone)::date = d
      window w as (partition by user_id order by recorded_at)
    ) s
    where dt is not null
    group by user_id, couple_id
    on conflict (user_id, day) do update set distance_km = excluded.distance_km, points = excluded.points;
  end loop;
end $$;

revoke all on function public.check_stale_members() from public, anon, authenticated;
revoke all on function public.expire_share_modes() from public, anon, authenticated;
revoke all on function public.rollup_daily() from public, anon, authenticated;
```

---
## 0004_storage.sql — private `media` bucket

Path convention: `media/{couple_id}/{user_id}/{uuid}.{ext}` (thumbs: `{uuid}_t.webp`). Avatars: same bucket.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media','media', false, 5242880,
  array['image/webp','image/jpeg','image/png','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types, public = false;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_couple_id()::text);

drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text);
-- no update policy: files are immutable
```

---
## 0005_notify_and_cron.sql — push trigger + schedules (secrets via Vault, none in git)

`tools/seed_vault.py` first creates Vault secrets `orbit_fn_secret` and `orbit_fn_base_url`
(`select vault.create_secret(<value>, <name>)`; update if exists). Then:

```sql
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.call_notify() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare s text; u text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'orbit_fn_secret';
  select decrypted_secret into u from vault.decrypted_secrets where name = 'orbit_fn_base_url';
  if s is null or u is null then return new; end if;     -- never block user writes
  perform net.http_post(
    url := u || '/notify',
    headers := jsonb_build_object('Content-Type','application/json','x-orbit-secret', s),
    body := jsonb_build_object('table', tg_table_name, 'record', to_jsonb(new)));
  return new;
exception when others then return new;                    -- notifications are best-effort
end $$;

drop trigger if exists trg_notify_events on public.events;
create trigger trg_notify_events after insert on public.events for each row execute function public.call_notify();
drop trigger if exists trg_notify_posts on public.posts;
create trigger trg_notify_posts after insert on public.posts for each row execute function public.call_notify();
drop trigger if exists trg_notify_comments on public.comments;
create trigger trg_notify_comments after insert on public.comments for each row execute function public.call_notify();
drop trigger if exists trg_notify_reactions on public.reactions;
create trigger trg_notify_reactions after insert on public.reactions for each row execute function public.call_notify();

-- schedules (idempotent)
do $$ declare j record; begin
  for j in select jobid from cron.job where jobname in
    ('orbit-retention','orbit-stale','orbit-modes','orbit-rollup','orbit-capsules') loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule('orbit-stale',   '*/5 * * * *',  $$select public.check_stale_members()$$);
select cron.schedule('orbit-modes',   '*/5 * * * *',  $$select public.expire_share_modes()$$);
select cron.schedule('orbit-rollup',  '40 18 * * *',  $$select public.rollup_daily()$$);   -- 00:10 IST
select cron.schedule('orbit-retention','17 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='orbit_fn_base_url') || '/retention',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-orbit-secret',(select decrypted_secret from vault.decrypted_secrets where name='orbit_fn_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
$$);
-- capsule unlock notifier (inserts 'capsule_unlocked' events when unlock_at passes)
select cron.schedule('orbit-capsules','*/10 * * * *', $$
  insert into public.events (couple_id, user_id, type, payload)
  select c.couple_id, c.author_id, 'capsule_unlocked', jsonb_build_object('capsule_id', c.id, 'title', c.title)
  from public.capsules c
  where c.unlock_at <= now() and c.opened_at is null
    and not exists (select 1 from public.events e where e.type='capsule_unlocked' and e.payload->>'capsule_id' = c.id::text)
$$);
```
If `pg_cron`/`pg_net`/Vault are unavailable via SQL, ask the human to enable them in the dashboard (08 #2).

---
## Edge Function `retention` (supabase/functions/retention/index.ts)

Behavior: (1) delete **expired, non‑kept** posts: first remove files via Storage API, only then
delete rows (if file removal errors, skip row deletion and record error); (2) delete expired
`location_history` and `events`; (3) **orphan sweep**: list files in `media` older than 24 h not
referenced by `posts.media_path/thumb_path` or `members.avatar_path`, remove them; (4) write a
`retention_runs` row. Idempotent and safe to run concurrently.

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } });

const safeEq = (a: string, b: string) => {          // constant-time compare
  if (a.length !== b.length || b.length === 0) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

Deno.serve(async (req) => {
  if (!safeEq(req.headers.get('x-orbit-secret') ?? '', Deno.env.get('ORBIT_FN_SECRET') ?? ''))
    return new Response('forbidden', { status: 403 });

  const s = { posts: 0, files: 0, bytes: 0, history: 0, events: 0, orphans: 0, error: null as string | null };
  try {
    const nowIso = new Date().toISOString();
    for (let guard = 0; guard < 50; guard++) {
      const { data: rows, error } = await sb.from('posts')
        .select('id, media_path, thumb_path, media_bytes, thumb_bytes')
        .eq('keep', false).lt('expires_at', nowIso).limit(500);
      if (error) throw error;
      if (!rows?.length) break;
      const paths = rows.flatMap(r => [r.media_path, r.thumb_path]).filter(Boolean) as string[];
      for (let i = 0; i < paths.length; i += 900) {
        const { error: e } = await sb.storage.from('media').remove(paths.slice(i, i + 900));
        if (e) throw e;
      }
      const { error: d } = await sb.from('posts').delete().in('id', rows.map(r => r.id));
      if (d) throw d;
      s.posts += rows.length; s.files += paths.length;
      s.bytes += rows.reduce((a, r) => a + r.media_bytes + r.thumb_bytes, 0);
    }
    const h = await sb.from('location_history').delete({ count: 'exact' }).lt('expires_at', nowIso);
    s.history = h.count ?? 0;
    const e = await sb.from('events').delete({ count: 'exact' }).lt('expires_at', nowIso);
    s.events = e.count ?? 0;

    // TODO(agent): orphan sweep — for each folder {couple}/{user}, list() objects older than 24h,
    // collect referenced paths from posts + members.avatar_path, remove the rest, count in s.orphans.
  } catch (err) {
    s.error = String((err as Error).message ?? err);
  }
  await sb.from('retention_runs').insert({
    posts_deleted: s.posts, files_deleted: s.files, orphans_deleted: s.orphans,
    history_deleted: s.history, events_deleted: s.events, bytes_freed: s.bytes, error: s.error });
  return new Response(JSON.stringify(s), { status: s.error ? 500 : 200,
    headers: { 'content-type': 'application/json' } });
});
```
> Verify current env var names for service key in Supabase Edge Functions (they have been
> evolving); adapt and log in DECISIONS.md. Deploy with `--no-verify-jwt`.

## Client-side rules that complement the DB
- Create post: upload files first → insert row → on row failure, `remove()` uploaded files.
- Unsend: `storage.remove([...])` then `delete from posts` (retention's orphan sweep is the safety net).
- Show expiry ring from `expires_at - now()` using server-time offset (sample `now()` once via RPC/headers).
- Un-keep shows a confirm: "This will fade in 7 days."

## Required automated checks (see 07)
RLS isolation · cannot insert for another couple · cannot update `author_id` · stranger gets 0 rows ·
partner can flip `keep` but nothing else · quota trigger rejects overflow · capsule hidden before unlock ·
retention deletes row **and** file · stale function emits one event · surprise-mode data has `fuzzed=true`.
