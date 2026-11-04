-- Shared scheduling is independent of location/geofence pins. All writes use scoped RPCs.
create table public.plans (
 id uuid primary key, couple_id uuid not null references public.couples(id) on delete cascade,
 created_by uuid not null references public.members(user_id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 100),
 notes text not null default '' check(length(notes)<=1000), venue text not null default '' check(length(venue)<=160),
 starts_at timestamptz not null, timezone text not null,
 version int not null default 1 check(version>0), accepted_by uuid[] not null default '{}',
 cancelled boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index plans_upcoming on public.plans(couple_id,starts_at);
create table public.plan_reminders (
 plan_id uuid not null references public.plans(id) on delete cascade,
 user_id uuid not null references public.members(user_id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 lead_minutes int check(lead_minutes in (10,30,60,1440)), queued_version int,
 primary key(plan_id,user_id)
);
create table public.date_ideas (
 id uuid primary key, couple_id uuid not null references public.couples(id) on delete cascade,
 created_by uuid not null references public.members(user_id) on delete cascade,
 kind text not null check(kind in ('idea','place')),
 title text not null check(length(btrim(title)) between 1 and 160),
 notes text not null default '' check(length(notes)<=1000), private boolean not null default false,
 archived boolean not null default false, version int not null default 1,
 created_at timestamptz not null default now()
);
alter table public.plans enable row level security;
alter table public.plan_reminders enable row level security;
alter table public.date_ideas enable row level security;
create policy plans_read on public.plans for select to authenticated using(couple_id=orbit_private.my_couple_id());
create policy reminders_read on public.plan_reminders for select to authenticated using(couple_id=orbit_private.my_couple_id() and user_id=auth.uid());
create policy ideas_read on public.date_ideas for select to authenticated using(couple_id=orbit_private.my_couple_id() and (not private or created_by=auth.uid()));
revoke all on public.plans,public.plan_reminders,public.date_ideas from public,anon,authenticated;
grant select on public.plans,public.plan_reminders,public.date_ideas to authenticated;
grant all on public.plans,public.plan_reminders,public.date_ideas to service_role;

create function public.save_plan(p_id uuid,p_version int,p_title text,p_notes text,p_venue text,p_starts_at timestamptz,p_timezone text)
returns public.plans language plpgsql security definer set search_path='' as $$
declare c uuid; item public.plans;
begin
 c:=orbit_private.my_couple_id();
 if c is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 perform 1 from public.couples where id=c for update;
 if p_id is null or p_title is null or length(btrim(p_title)) not between 1 and 100
 or p_notes is null or length(p_notes)>1000 or p_venue is null or length(p_venue)>160
 or p_starts_at is null or not isfinite(p_starts_at) or p_starts_at<=now() or p_starts_at>now()+interval '2 years'
 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'INVALID_PLAN'; end if;
 select * into item from public.plans where id=p_id for update;
 if found then
  if item.couple_id<>c or item.created_by<>auth.uid() then raise exception 'PLAN_UNAVAILABLE'; end if;
  if item.cancelled or item.starts_at<=now() then raise exception 'PLAN_CLOSED'; end if;
  if (p_version is null or p_version+1=item.version) and item.title=btrim(p_title) and item.notes=p_notes and item.venue=p_venue and item.starts_at=p_starts_at and item.timezone=p_timezone then return item; end if;
  if p_version is null or p_version<>item.version then raise exception 'PLAN_CHANGED'; end if;
  update public.plans set title=btrim(p_title),notes=p_notes,venue=p_venue,starts_at=p_starts_at,timezone=p_timezone,
   version=version+1,accepted_by=array[auth.uid()],updated_at=now() where id=p_id returning * into item;
 else
  if p_version is not null then raise exception 'PLAN_UNAVAILABLE'; end if;
  if (select count(*) from public.plans where couple_id=c and starts_at>now() and not cancelled)>=100 then raise exception 'PLAN_LIMIT'; end if;
  insert into public.plans(id,couple_id,created_by,title,notes,venue,starts_at,timezone,accepted_by)
  values(p_id,c,auth.uid(),btrim(p_title),p_notes,p_venue,p_starts_at,p_timezone,array[auth.uid()]) returning * into item;
 end if;
 return item;
end $$;
create function public.respond_plan(p_id uuid,p_version int,p_accept boolean) returns public.plans
language plpgsql security definer set search_path='' as $$
declare item public.plans; c uuid;
begin
 c:=orbit_private.my_couple_id();
 if c is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 perform 1 from public.couples where id=c for update;
 select * into item from public.plans where id=p_id and couple_id=c for update;
 if not found then raise exception 'PLAN_UNAVAILABLE'; end if;
 if item.version<>p_version then raise exception 'PLAN_CHANGED'; end if;
 if item.cancelled or item.starts_at<=now() then raise exception 'PLAN_CLOSED'; end if;
 if p_accept is null then raise exception 'INVALID_RESPONSE'; end if;
 if p_accept then
  if not auth.uid()=any(item.accepted_by) then
   update public.plans set accepted_by=array_append(accepted_by,auth.uid()),updated_at=now() where id=p_id returning * into item;
  end if;
 else
  update public.plans set cancelled=true,version=version+1,accepted_by='{}',updated_at=now() where id=p_id returning * into item;
 end if;
 return item;
end $$;
create function public.set_plan_reminder(p_id uuid,p_version int,p_minutes int) returns public.plan_reminders
language plpgsql security definer set search_path='' as $$
declare item public.plans; result public.plan_reminders;
begin
 if orbit_private.my_couple_id() is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 select * into item from public.plans where id=p_id and couple_id=orbit_private.my_couple_id() for update;
 if not found then raise exception 'PLAN_UNAVAILABLE'; end if;
 if item.version<>p_version then raise exception 'PLAN_CHANGED'; end if;
 if item.cancelled or item.starts_at<=now() then raise exception 'PLAN_CLOSED'; end if;
 if p_minutes is not null and p_minutes not in (10,30,60,1440) then raise exception 'INVALID_REMINDER'; end if;
 insert into public.plan_reminders(plan_id,user_id,couple_id,lead_minutes) values(p_id,auth.uid(),item.couple_id,p_minutes)
 on conflict(plan_id,user_id) do update set lead_minutes=excluded.lead_minutes returning * into result;
 return result;
end $$;
create function public.save_date_idea(p_id uuid,p_version int,p_kind text,p_title text,p_notes text,p_private boolean,p_archived boolean)
returns public.date_ideas language plpgsql security definer set search_path='' as $$
declare c uuid; item public.date_ideas;
begin
 c:=orbit_private.my_couple_id();
 if c is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 perform 1 from public.couples where id=c for update;
 if p_id is null or p_kind is null or p_kind not in ('idea','place') or p_title is null or length(btrim(p_title)) not between 1 and 160
 or p_notes is null or length(p_notes)>1000 or p_private is null or p_archived is null then raise exception 'INVALID_IDEA'; end if;
 select * into item from public.date_ideas where id=p_id for update;
 if found then
  if item.couple_id<>c or item.created_by<>auth.uid() then raise exception 'IDEA_UNAVAILABLE'; end if;
  if (p_version is null or p_version+1=item.version) and item.title=btrim(p_title) and item.notes=p_notes and item.kind=p_kind and item.private=p_private and item.archived=p_archived then return item; end if;
  if p_version is null or p_version<>item.version then raise exception 'IDEA_CHANGED'; end if;
  update public.date_ideas set kind=p_kind,title=btrim(p_title),notes=p_notes,private=p_private,archived=p_archived,version=version+1 where id=p_id returning * into item;
 else
  if p_version is not null then raise exception 'IDEA_UNAVAILABLE'; end if;
  if (select count(*) from public.date_ideas where couple_id=c)>=500 then raise exception 'IDEA_LIMIT'; end if;
  insert into public.date_ideas(id,couple_id,created_by,kind,title,notes,private,archived)
  values(p_id,c,auth.uid(),p_kind,btrim(p_title),p_notes,p_private,p_archived) returning * into item;
 end if;
 return item;
end $$;
create trigger trg_social_plans after insert or update or delete on public.plans for each row execute function orbit_private.bump_social_revision();
create function orbit_private.idea_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.private or (tg_op='UPDATE' and not old.private) then
  update public.couples set social_revision=social_revision+1 where id=new.couple_id;
 end if;
 return null;
end $$;
create trigger trg_social_ideas after insert or update on public.date_ideas for each row execute function orbit_private.idea_revision();

create function orbit_private.enqueue_plan_reminders() returns int language plpgsql security definer set search_path='' as $$
declare row record; count int:=0;
begin
 for row in select r.plan_id,r.user_id,r.couple_id,p.version,p.starts_at from public.plan_reminders r join public.plans p on p.id=r.plan_id
 where r.lead_minutes is not null and r.queued_version is distinct from p.version and not p.cancelled and p.starts_at>now()
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
-- No reminder exists until a member explicitly chooses a lead time. The worker revalidates each job.
select cron.schedule('orbit-plan-reminders','* * * * *','select orbit_private.enqueue_plan_reminders()');
revoke all on function orbit_private.enqueue_plan_reminders(),orbit_private.idea_revision() from public,anon,authenticated;
revoke all on function public.save_plan(uuid,int,text,text,text,timestamptz,text),public.respond_plan(uuid,int,boolean),public.set_plan_reminder(uuid,int,int),public.save_date_idea(uuid,int,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.save_plan(uuid,int,text,text,text,timestamptz,text),public.respond_plan(uuid,int,boolean),public.set_plan_reminder(uuid,int,int),public.save_date_idea(uuid,int,text,text,text,boolean,boolean) to authenticated;
select pg_notify('pgrst','reload schema');
