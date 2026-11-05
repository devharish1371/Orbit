-- Expiry immediately hides partner reads through RLS. Erase old text on the next sweep;
-- keep only an empty version tombstone, so stale devices cannot recreate an old status.
create function orbit_private.expire_member_status() returns void
language plpgsql security definer set search_path='' as $$
begin
 with expired as (
  select user_id from public.member_status where expires_at<=now()
  order by expires_at for update skip locked limit 500
 ) update public.member_status s set emoji='',message='',expires_at=null,version=version+1
 from expired e where s.user_id=e.user_id;
end $$;
revoke all on function orbit_private.expire_member_status() from public,anon,authenticated;
select cron.schedule('orbit-status-expiry','*/5 * * * *','select orbit_private.expire_member_status()');
