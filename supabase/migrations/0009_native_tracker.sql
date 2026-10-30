-- A generation prevents queued fixes crossing a pause/surprise boundary.
alter table public.members add column location_epoch bigint not null default 0;
alter table public.location_history add column client_id uuid;
alter table public.location_history add constraint history_client_id unique(user_id,client_id);
create or replace function orbit_private.advance_location_epoch() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.share_mode is distinct from new.share_mode then new.location_epoch:=old.location_epoch+1; end if;
  return new;
end $$;
revoke all on function orbit_private.advance_location_epoch() from public,anon,authenticated;
create trigger trg_member_location_epoch before update on public.members
for each row execute function orbit_private.advance_location_epoch();

-- Atomic, retry-safe native upload; auth.uid owns every inserted row.
create or replace function public.submit_locations(p_epoch bigint,p_fixes jsonb,p_transitions jsonb default '[]',p_low_battery boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members; f jsonb; t jsonb; p public.places; l_lat float8; l_lng float8; stamp timestamptz;
  was_inside boolean; previous_time timestamptz; history_count int:=0; days int; pct int;
begin
  select * into m from public.members where user_id=auth.uid() for update;
  if not found then raise exception 'MEMBERSHIP_REQUIRED'; end if;
  if m.share_mode='paused' then raise exception 'SHARING_PAUSED'; end if;
  if m.location_epoch<>p_epoch then raise exception 'LOCATION_EPOCH_CHANGED'; end if;
  if jsonb_typeof(p_fixes)<>'array' or jsonb_array_length(p_fixes)>100
     or jsonb_typeof(p_transitions)<>'array' or jsonb_array_length(p_transitions)>100 then raise exception 'INVALID_BATCH'; end if;
  select retention_days into days from public.couples where id=m.couple_id;
  for f in select value from jsonb_array_elements(p_fixes) order by (value->>'recorded_at')::timestamptz loop
    stamp:=(f->>'recorded_at')::timestamptz;
    if stamp>now()+interval '1 minute' then raise exception 'FUTURE_FIX'; end if;
    if stamp<now()-make_interval(days=>days) then continue; end if;
    l_lat:=(f->>'lat')::float8; l_lng:=(f->>'lng')::float8;
    if not (l_lat between -90 and 90 and l_lng between -180 and 180) then raise exception 'INVALID_LOCATION'; end if;
    if m.share_mode='surprise' then
      l_lat:=(floor(l_lat/0.018)+0.5)*0.018; l_lng:=(floor(l_lng/0.018)+0.5)*0.018;
    end if;
    insert into public.live_location(user_id,couple_id,lat,lng,accuracy_m,speed_mps,heading,battery_pct,charging,is_moving,fuzzed,recorded_at)
    values(m.user_id,m.couple_id,l_lat,l_lng,case when m.share_mode='surprise' then 2000 else (f->>'accuracy_m')::real end,
      case when m.share_mode='surprise' then null else (f->>'speed_mps')::real end,
      case when m.share_mode='surprise' then null else (f->>'heading')::real end,(f->>'battery_pct')::smallint,
      coalesce((f->>'charging')::boolean,false),coalesce((f->>'is_moving')::boolean,false),m.share_mode='surprise',stamp)
    on conflict(user_id) do update set lat=excluded.lat,lng=excluded.lng,accuracy_m=excluded.accuracy_m,
      speed_mps=excluded.speed_mps,heading=excluded.heading,battery_pct=excluded.battery_pct,charging=excluded.charging,
      is_moving=excluded.is_moving,fuzzed=excluded.fuzzed,recorded_at=excluded.recorded_at
    where excluded.recorded_at>=public.live_location.recorded_at;
    if m.share_mode='live' and coalesce((f->>'history')::boolean,false) then
      insert into public.location_history(user_id,couple_id,client_id,lat,lng,accuracy_m,speed_mps,battery_pct,recorded_at)
      values(m.user_id,m.couple_id,(f->>'client_id')::uuid,l_lat,l_lng,(f->>'accuracy_m')::real,(f->>'speed_mps')::real,(f->>'battery_pct')::smallint,stamp)
      on conflict(user_id,client_id) do nothing;
      history_count:=history_count+1;
    end if;
  end loop;
  if m.share_mode='live' then
    for t in select value from jsonb_array_elements(p_transitions) order by (value->>'recorded_at')::timestamptz loop
      select * into p from public.places where id=(t->>'place_id')::uuid and couple_id=m.couple_id for share;
      if not found then continue; end if;
      stamp:=(t->>'recorded_at')::timestamptz;
      if stamp>now()+interval '1 minute' or stamp<now()-make_interval(days=>days) then continue; end if;
      select inside,changed_at into was_inside,previous_time from public.place_presence where user_id=m.user_id and place_id=p.id for update;
      if previous_time is not null and stamp<=previous_time then continue; end if;
      if was_inside is distinct from (t->>'inside')::boolean then
        insert into public.place_presence(user_id,place_id,couple_id,inside,changed_at) values(m.user_id,p.id,m.couple_id,(t->>'inside')::boolean,stamp)
        on conflict(user_id,place_id) do update set inside=excluded.inside,changed_at=excluded.changed_at;
        if ((t->>'inside')::boolean and p.notify_arrive) or (not (t->>'inside')::boolean and p.notify_leave) then
          insert into public.events(id,couple_id,user_id,type,place_id,payload)
          values((t->>'id')::uuid,m.couple_id,m.user_id,case when (t->>'inside')::boolean then 'arrive' else 'leave' end,p.id,jsonb_build_object('recorded_at',stamp)) on conflict(id) do nothing;
        end if;
      end if;
    end loop;
  end if;
  if p_low_battery then
    -- Server dedupe survives retries, process death and client reinstallation.
    pct:=(select battery_pct from public.live_location where user_id=m.user_id);
    if pct<=15 and not exists(select 1 from public.events where user_id=m.user_id and type='low_battery' and created_at>now()-interval '4 hours') then
      insert into public.events(couple_id,user_id,type,payload) values(m.couple_id,m.user_id,'low_battery',jsonb_build_object('pct',pct));
    end if;
  end if;
  return jsonb_build_object('ok',true,'history_processed',history_count);
end $$;
revoke all on function public.submit_locations(bigint,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.submit_locations(bigint,jsonb,jsonb,boolean) to authenticated;
