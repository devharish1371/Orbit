create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function orbit_private.call_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
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
create trigger trg_notify_events after insert on public.events for each row execute function orbit_private.call_notify();
drop trigger if exists trg_notify_posts on public.posts;
create trigger trg_notify_posts after insert on public.posts for each row execute function orbit_private.call_notify();
drop trigger if exists trg_notify_comments on public.comments;
create trigger trg_notify_comments after insert on public.comments for each row execute function orbit_private.call_notify();
drop trigger if exists trg_notify_reactions on public.reactions;
create trigger trg_notify_reactions after insert on public.reactions for each row execute function orbit_private.call_notify();

-- schedules (idempotent)
do $$ declare j record; begin
  for j in select jobid from cron.job where jobname in
    ('orbit-retention','orbit-stale','orbit-modes','orbit-rollup','orbit-capsules') loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule('orbit-stale',   '*/5 * * * *',  $$select orbit_private.check_stale_members()$$);
select cron.schedule('orbit-modes',   '*/5 * * * *',  $$select orbit_private.expire_share_modes()$$);
select cron.schedule('orbit-rollup',  '10 * * * *',  $$select orbit_private.rollup_daily()$$);   -- 00:10 IST
select cron.schedule('orbit-retention','17 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='orbit_fn_base_url') || '/retention',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-orbit-secret',(select decrypted_secret from vault.decrypted_secrets where name='orbit_fn_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
$$);
-- capsule unlock notifier (inserts 'capsule_unlocked' events when unlock_at passes)
select cron.schedule('orbit-capsules','*/10 * * * *', $cron$
  with unlocked as (
    update public.capsules set notified_at=now()
    where unlock_at <= now() and notified_at is null
    returning id,couple_id,author_id,title
  ) insert into public.events(couple_id,user_id,type,payload)
    select couple_id,author_id,'capsule_unlocked',jsonb_build_object('capsule_id',id,'title',title) from unlocked
$cron$);
revoke all on all functions in schema orbit_private from public,anon;
revoke all on function orbit_private.call_notify() from authenticated;
revoke all on all functions in schema orbit_private from authenticated;
grant execute on function orbit_private.my_couple_id(),orbit_private.partner_id(),orbit_private.has_answered(date) to authenticated;
