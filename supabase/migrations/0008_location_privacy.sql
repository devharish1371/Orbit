-- History must not accept precise fixes after pause/surprise, including an in-flight write.
create or replace function orbit_private.guard_location_history() returns trigger
language plpgsql security definer set search_path = '' as $$
declare mode text;
begin
  select share_mode into mode from public.members where user_id=new.user_id for update;
  if mode <> 'live' then raise exception 'HISTORY_REQUIRES_LIVE_SHARING'; end if;
  return new;
end $$;
revoke all on function orbit_private.guard_location_history() from public,anon,authenticated;
create trigger trg_history_sharing before insert on public.location_history
for each row execute function orbit_private.guard_location_history();
-- Couple settings changes should be reflected on the partner's open client too.
alter publication supabase_realtime add table public.couples;
