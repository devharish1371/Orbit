-- expiry stamping
create or replace function orbit_private.set_expiry() returns trigger
language plpgsql security definer set search_path = '' as $$
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
create trigger trg_posts_expiry before insert on public.posts for each row execute function orbit_private.set_expiry();
drop trigger if exists trg_events_expiry on public.events;
create trigger trg_events_expiry before insert on public.events for each row execute function orbit_private.set_expiry();
drop trigger if exists trg_lh_expiry on public.location_history;
create trigger trg_lh_expiry before insert on public.location_history for each row execute function orbit_private.set_expiry();

-- keep / un-keep with quota
create or replace function orbit_private.posts_keep_change() returns trigger
language plpgsql security definer set search_path = '' as $$
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
  for each row when (old.keep is distinct from new.keep) execute function orbit_private.posts_keep_change();

-- live_location: bump updated_at; clear stale flag & announce resume
create or replace function orbit_private.on_live_location_write() returns trigger
language plpgsql security definer set search_path = '' as $$
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
  for each row execute function orbit_private.on_live_location_write();

-- stale detection (runs every 5 min via pg_cron; works even if the phone is dead)
create or replace function orbit_private.check_stale_members() returns void
language plpgsql security definer set search_path = '' as $$
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
create or replace function orbit_private.expire_share_modes() returns void
language plpgsql security definer set search_path = '' as $$
begin
  with exp as (
    update public.members set share_mode = 'live', share_mode_until = null
    where share_mode <> 'live' and share_mode_until is not null and share_mode_until < now()
    returning user_id, couple_id)
  insert into public.events (couple_id, user_id, type, payload)
  select couple_id, user_id, 'mode_changed', '{"to":"live","auto":true}' from exp;
end $$;

-- nightly roll-up (previous local day) BEFORE raw history expires
create or replace function orbit_private.rollup_daily() returns void
language plpgsql security definer set search_path = '' as $$
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
    group by user_id, couple_id
    on conflict (user_id, day) do update set distance_km = excluded.distance_km, points = excluded.points;
  end loop;
end $$;

revoke all on function orbit_private.check_stale_members() from public, anon, authenticated;
revoke all on function orbit_private.expire_share_modes() from public, anon, authenticated;
revoke all on function orbit_private.rollup_daily() from public, anon, authenticated;

-- Quota accounting is serialized by the couple row. A claimed post cannot be kept.
create or replace function orbit_private.posts_keep_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare used bigint; q int; d int;
begin
  select keepsake_quota_mb, retention_days into q,d from public.couples where id = new.couple_id for update;
  if old.deleting_at is not null then raise exception 'POST_CLEANUP_IN_PROGRESS'; end if;
  if new.keep then
    select coalesce(sum(media_bytes::bigint + thumb_bytes::bigint),0) into used
    from public.posts where couple_id = new.couple_id and keep and id <> new.id;
    if used + new.media_bytes::bigint + new.thumb_bytes::bigint > q::bigint * 1024 * 1024 then
      raise exception 'KEEPSAKE_QUOTA_EXCEEDED';
    end if;
    new.expires_at := null; new.kept_by := auth.uid(); new.kept_at := now();
  else
    new.expires_at := now() + make_interval(days => d);
    new.kept_by := null; new.kept_at := null;
  end if;
  return new;
end $$;

-- Trust actual storage metadata, not a client-supplied byte count. A post's ID
-- owns its immutable filenames, so two posts cannot share a physical media file.
create or replace function orbit_private.verify_media_reference(p_path text, p_prefix text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare n bigint;
begin
  if p_path is null then return 0; end if;
  if p_path not like p_prefix || '%' then raise exception 'INVALID_MEDIA_OWNER'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_path,0));
  if exists (select 1 from public.media_gc where path = p_path) then raise exception 'MEDIA_CLEANUP_IN_PROGRESS'; end if;
  select (metadata->>'size')::bigint into n from storage.objects where bucket_id='media' and name=p_path;
  if n is null then raise exception 'MEDIA_NOT_UPLOADED'; end if;
  return n;
end $$;
create or replace function orbit_private.prepare_post() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.media_bytes := orbit_private.verify_media_reference(new.media_path, new.couple_id || '/' || new.author_id || '/');
  new.thumb_bytes := orbit_private.verify_media_reference(new.thumb_path, new.couple_id || '/' || new.author_id || '/');
  new.created_at := now(); new.keep := false; new.kept_at := null; new.kept_by := null;
  new.deleting_at := null; new.deletion_token := null;
  return new;
end $$;
drop trigger if exists trg_post_prepare on public.posts;
create trigger trg_post_prepare before insert on public.posts for each row execute function orbit_private.prepare_post();

create or replace function orbit_private.prepare_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.avatar_path is not null and (tg_op = 'INSERT' or new.avatar_path is distinct from old.avatar_path) then
    if new.avatar_path !~ ('^' || new.couple_id || '/' || new.user_id || '/avatar_[a-f0-9-]+\.(webp|jpg|jpeg|png)$') then
      raise exception 'INVALID_AVATAR_PATH';
    end if;
    perform orbit_private.verify_media_reference(new.avatar_path,new.couple_id || '/' || new.user_id || '/');
  end if;
  if new.share_mode = 'surprise' then
    new.share_mode_until := coalesce(new.share_mode_until,now()+interval '4 hours');
    if new.share_mode_until > now()+interval '24 hours' then raise exception 'SURPRISE_MAX_24_HOURS'; end if;
  elsif new.share_mode = 'live' then new.share_mode_until := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_member_prepare on public.members;
create trigger trg_member_prepare before insert or update on public.members for each row execute function orbit_private.prepare_member();

create or replace function orbit_private.on_live_location_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where user_id = new.user_id for update;
  if m.share_mode = 'paused' then raise exception 'SHARING_PAUSED'; end if;
  if m.share_mode = 'surprise' and (not new.fuzzed or new.speed_mps is not null or new.heading is not null) then
    raise exception 'SURPRISE_REQUIRES_BLUR';
  end if;
  new.updated_at := now();
  if m.stale_notified then
    update public.members set stale_notified=false where user_id=new.user_id;
    insert into public.events(couple_id,user_id,type) values(new.couple_id,new.user_id,'sharing_resumed');
  end if;
  return new;
end $$;
create or replace function orbit_private.check_stale_members() returns void
language plpgsql security definer set search_path = '' as $$
begin
  with stale as (
    update public.members m set stale_notified=true
    where m.share_mode='live' and not m.stale_notified and
      coalesce((select l.updated_at from public.live_location l where l.user_id=m.user_id),m.created_at) < now()-interval '30 minutes'
    returning m.user_id,m.couple_id
  ) insert into public.events(couple_id,user_id,type)
    select couple_id,user_id,'sharing_stopped' from stale;
end $$;

-- Atomic post leases: Keep either wins before this lock, or fails while cleanup
-- owns the row. Failed file deletion leaves the row for a later lease retry.
create or replace function public.claim_expired_posts(p_limit int default 500) returns setof public.posts
language sql security definer set search_path = '' as $$
  update public.posts p set deleting_at=now(), deletion_token=gen_random_uuid()
  where p.id in (
    select id from public.posts where not keep and expires_at < now()
    and (deleting_at is null or deleting_at < now()-interval '10 minutes')
    order by expires_at for update skip locked limit least(greatest(p_limit,1),500)
  ) returning p.*;
$$;
create or replace function public.finish_expired_post(p_id uuid,p_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.posts where id=p_id and deletion_token=p_token and not keep and expires_at < now();
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- Storage timestamps and references are checked again under the same advisory
-- locks used by reference creation. Rows are tombstones until Storage removal succeeds.
create or replace function public.claim_orphan_media(p_paths text[]) returns setof text
language plpgsql security definer set search_path = '' as $$
declare p text;
begin
  foreach p in array p_paths loop
    perform pg_advisory_xact_lock(hashtextextended(p,0));
    if exists (select 1 from storage.objects where bucket_id='media' and name=p and created_at < now()-interval '24 hours')
      and not exists (select 1 from public.posts where media_path=p or thumb_path=p)
      and not exists (select 1 from public.members where avatar_path=p)
      and not exists (select 1 from public.media_gc where path=p and claimed_at > now()-interval '10 minutes') then
      insert into public.media_gc(path) values(p) on conflict(path) do update set claimed_at=now();
      return next p;
    end if;
  end loop;
end $$;
revoke all on function public.claim_expired_posts(int),public.finish_expired_post(uuid,uuid),public.claim_orphan_media(text[]) from public,anon,authenticated;
grant execute on function public.claim_expired_posts(int),public.finish_expired_post(uuid,uuid),public.claim_orphan_media(text[]) to service_role;
revoke all on all functions in schema orbit_private from public,anon;
revoke all on function orbit_private.verify_media_reference(text,text),orbit_private.prepare_post(),orbit_private.prepare_member() from authenticated;

create or replace function orbit_private.announce_mode() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.share_mode is distinct from new.share_mode then
    insert into public.events(couple_id,user_id,type,payload)
    values(new.couple_id,new.user_id,'mode_changed',jsonb_build_object('from',old.share_mode,'to',new.share_mode));
  end if;
  return new;
end $$;
drop trigger if exists trg_member_mode on public.members;
create trigger trg_member_mode after update of share_mode on public.members for each row execute function orbit_private.announce_mode();
create or replace function orbit_private.expire_share_modes() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.members set share_mode='live',share_mode_until=null
  where share_mode <> 'live' and share_mode_until < now();
end $$;
revoke all on function orbit_private.announce_mode(),orbit_private.expire_share_modes() from public,anon,authenticated;
create or replace function public.finish_orphan_media(p_paths text[]) returns void
language sql security definer set search_path = '' as $$
  delete from public.media_gc where path=any(p_paths);
$$;
revoke all on function public.finish_orphan_media(text[]) from public,anon,authenticated;
grant execute on function public.finish_orphan_media(text[]) to service_role;
