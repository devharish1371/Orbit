-- One bounded request per recipient, shared only with their couple. No push alerts,
-- tracking opt-in changes, or historical request log are created by a refresh.
create table public.location_refresh (
  user_id uuid primary key references public.members(user_id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  requested_at timestamptz not null,
  expires_at timestamptz not null,
  location_epoch bigint not null,
  baseline_at timestamptz
);
alter table public.location_refresh enable row level security;
revoke all on public.location_refresh from public,anon,authenticated;
grant select on public.location_refresh to authenticated;
create policy location_refresh_select on public.location_refresh for select to authenticated
using (couple_id=orbit_private.my_couple_id());

create function public.request_location_refresh(p_user_id uuid) returns public.location_refresh
language plpgsql security definer set search_path='' as $$
declare m public.members; r public.location_refresh; stamp timestamptz:=clock_timestamp();
begin
  -- Lock only the recipient, so simultaneous reciprocal requests cannot deadlock.
  select * into m from public.members where user_id=p_user_id
    and couple_id=orbit_private.my_couple_id() for update;
  if not found then raise exception 'MEMBERSHIP_REQUIRED'; end if;
  if m.share_mode='paused' then raise exception 'SHARING_PAUSED'; end if;
  select * into r from public.location_refresh where user_id=m.user_id;
  -- Duplicate taps/devices share the existing request. At most one new request/minute.
  if found and r.location_epoch=m.location_epoch and r.requested_at>stamp-interval '1 minute' then return r; end if;
  insert into public.location_refresh(user_id,couple_id,requested_at,expires_at,location_epoch,baseline_at)
  values(m.user_id,m.couple_id,stamp,stamp+interval '2 minutes',m.location_epoch,
    (select recorded_at from public.live_location where user_id=m.user_id))
  on conflict(user_id) do update set couple_id=excluded.couple_id,requested_at=excluded.requested_at,
    expires_at=excluded.expires_at,location_epoch=excluded.location_epoch,baseline_at=excluded.baseline_at
  returning * into r;
  return r;
end $$;
revoke all on function public.request_location_refresh(uuid) from public,anon;
grant execute on function public.request_location_refresh(uuid) to authenticated;
alter publication supabase_realtime add table public.location_refresh;
