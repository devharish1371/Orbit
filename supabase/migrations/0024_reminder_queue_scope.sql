-- Scoped private entry point lets tests enqueue only their disposable couple.
create function orbit_private.enqueue_plan_reminders_for(p_couple uuid) returns int language plpgsql security definer set search_path='' as $$
declare row record; count int:=0;
begin
 for row in select r.plan_id,r.user_id,r.couple_id,p.version,p.starts_at from public.plan_reminders r join public.plans p on p.id=r.plan_id
 where (p_couple is null or p.couple_id=p_couple) and r.lead_minutes is not null and r.queued_version is distinct from p.version and not p.cancelled and p.starts_at>now()
 and p.starts_at-make_interval(mins=>r.lead_minutes)<=now()
 and (select count(*) from public.members m where m.couple_id=p.couple_id)=2
 and not exists(select 1 from public.members m where m.couple_id=p.couple_id and not m.user_id=any(p.accepted_by))
 order by p.starts_at limit 100 for update of p,r skip locked
 loop
  insert into orbit_private.notification_jobs(source_table,record) values('plan_reminders',jsonb_build_object('plan_id',row.plan_id,'couple_id',row.couple_id,'user_id',row.user_id,'version',row.version,'expires_at',row.starts_at));
  update public.plan_reminders set queued_version=row.version where plan_id=row.plan_id and user_id=row.user_id;
  count:=count+1;
 end loop;
 return count;
end $$;

create or replace function orbit_private.enqueue_plan_reminders() returns int language sql security definer set search_path='' as $$ select orbit_private.enqueue_plan_reminders_for(null); $$;
revoke all on function orbit_private.enqueue_plan_reminders_for(uuid) from public,anon,authenticated;
