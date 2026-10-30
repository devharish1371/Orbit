-- Service-only durable delivery queue. App users can read only their couple's events.
create table if not exists orbit_private.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  record jsonb not null,
  created_at timestamptz not null default now(),
  next_attempt timestamptz not null default now(),
  lease_until timestamptz,
  attempts int not null default 0,
  status text not null default 'pending',
  delivered_tokens text[] not null default '{}'
);
create index if not exists notification_jobs_due on orbit_private.notification_jobs(next_attempt) where status='pending';
create table if not exists orbit_private.notification_dedupe (
  key text primary key,
  job_id uuid not null,
  claimed_at timestamptz not null default now()
);
revoke all on orbit_private.notification_jobs,orbit_private.notification_dedupe from public,anon,authenticated;

create or replace function orbit_private.call_notify() returns trigger
language plpgsql security definer set search_path='' as $$
declare s text; u text; job uuid;
begin
  insert into orbit_private.notification_jobs(source_table,record) values(tg_table_name,to_jsonb(new)) returning id into job;
  select decrypted_secret into s from vault.decrypted_secrets where name='orbit_fn_secret';
  select decrypted_secret into u from vault.decrypted_secrets where name='orbit_fn_base_url';
  if s is not null and u is not null then
    begin
      perform net.http_post(url:=u||'/notify',headers:=jsonb_build_object('Content-Type','application/json','x-orbit-secret',s),body:=jsonb_build_object('job_id',job),timeout_milliseconds:=10000);
    exception when others then null; end; -- cron retries the committed queue
  end if;
  return new;
end $$;

create or replace function public.claim_notification_jobs(p_id uuid default null,p_limit int default 5)
returns setof orbit_private.notification_jobs language sql security definer set search_path='' as $$
  with jobs as (
    select id from orbit_private.notification_jobs
    where status='pending' and attempts<6 and next_attempt<=now()
      and (lease_until is null or lease_until<now()) and (p_id is null or id=p_id)
    order by created_at limit greatest(1,least(p_limit,5)) for update skip locked
  ) update orbit_private.notification_jobs j set lease_until=now()+interval '5 minutes',attempts=attempts+1
    from jobs where j.id=jobs.id returning j.*;
$$;
create or replace function public.reserve_notification(p_id uuid,p_key text) returns boolean
language plpgsql security definer set search_path='' as $$
declare reserved boolean;
begin
  insert into orbit_private.notification_dedupe(key,job_id) values(p_key,p_id)
  on conflict(key) do update set job_id=excluded.job_id,claimed_at=now()
    where notification_dedupe.job_id=excluded.job_id or notification_dedupe.claimed_at<now()-interval '2 minutes'
  returning true into reserved;
  return coalesce(reserved,false);
end $$;
create or replace function public.finish_notification(p_id uuid,p_status text,p_tokens text[] default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_status not in ('sent','skipped','dry_run','retry') then raise exception 'INVALID_NOTIFICATION_STATUS'; end if;
  update orbit_private.notification_jobs set
    status=case when p_status='retry' and attempts<6 then 'pending' when p_status='retry' then 'failed' else p_status end,
    lease_until=null,next_attempt=now()+make_interval(secs=>least(900,30*power(2,attempts)::int)),
    delivered_tokens=p_tokens where id=p_id;
end $$;
revoke all on function public.claim_notification_jobs(uuid,int),public.reserve_notification(uuid,text),public.finish_notification(uuid,text,text[]) from public,anon,authenticated;
grant execute on function public.claim_notification_jobs(uuid,int),public.reserve_notification(uuid,text),public.finish_notification(uuid,text,text[]) to service_role;

-- Client-triggered attention requests derive actor/couple and enforce a cooldown atomically.
create or replace function public.send_attention(p_type text,p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare member public.members; existing public.events;
begin
  if auth.uid() is null or p_type not in ('nudge','call_request','sos') then raise exception 'INVALID_ATTENTION'; end if;
  select * into member from public.members where user_id=auth.uid() for update;
  if not found then raise exception 'MEMBERSHIP_REQUIRED'; end if;
  select * into existing from public.events where id=p_id;
  if found then
    if existing.user_id<>auth.uid() or existing.type<>p_type then raise exception 'INVALID_ATTENTION_ID'; end if;
    return existing.id;
  end if;
  if exists(select 1 from public.events where user_id=auth.uid() and type=p_type
    and created_at>now()-case when p_type='sos' then interval '30 seconds' else interval '2 minutes' end)
    then raise exception 'ATTENTION_COOLDOWN'; end if;
  insert into public.events(id,couple_id,user_id,type) values(p_id,member.couple_id,auth.uid(),p_type);
  return p_id;
end $$;
revoke all on function public.send_attention(text,uuid) from public,anon;
grant execute on function public.send_attention(text,uuid) to authenticated;
-- Attention requests must use the cooldown RPC; tracker transitions retain their policy.
alter policy ev_insert on public.events with check (
 user_id=auth.uid() and couple_id=orbit_private.my_couple_id() and type in ('arrive','leave','low_battery')
);

-- Bound preferences and time zones so invalid client state cannot break delivery.
alter table public.members drop constraint if exists notify_prefs_object;
alter table public.members add constraint notify_prefs_object check(jsonb_typeof(notify_prefs)='object');
create or replace function orbit_private.validate_notify_preferences() returns trigger
language plpgsql set search_path='' as $$
begin
  if exists(select 1 from jsonb_each(new.notify_prefs) where jsonb_typeof(value)<>'boolean') then raise exception 'INVALID_NOTIFY_PREFERENCES'; end if;
  return new;
end $$;
drop trigger if exists trg_notify_preferences on public.members;
create trigger trg_notify_preferences before insert or update of notify_prefs on public.members
  for each row execute function orbit_private.validate_notify_preferences();
revoke all on function orbit_private.validate_notify_preferences() from public,anon,authenticated;

select cron.schedule('orbit-notify-retry','* * * * *',$cron$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='orbit_fn_base_url')||'/notify',
    headers:=jsonb_build_object('Content-Type','application/json','x-orbit-secret',(select decrypted_secret from vault.decrypted_secrets where name='orbit_fn_secret')),
    body:='{}'::jsonb,timeout_milliseconds:=10000);
$cron$);
select cron.schedule('orbit-notify-cleanup','41 * * * *',$cron$
  delete from orbit_private.notification_jobs where created_at<now()-interval '7 days';
  delete from orbit_private.notification_dedupe where claimed_at<now()-interval '1 day';
$cron$);
