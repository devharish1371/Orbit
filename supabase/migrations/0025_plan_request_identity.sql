-- Bind planning mutations to the account/couple that composed the request.
drop function public.save_plan(uuid,int,text,text,text,timestamptz,text);
create function public.save_plan(p_id uuid,p_version int,p_title text,p_notes text,p_venue text,p_starts_at timestamptz,p_timezone text,p_expected_user uuid,p_expected_couple uuid)
returns public.plans language plpgsql security definer set search_path='' as $$
declare c uuid; item public.plans;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() then raise exception 'DRAFT_ACCOUNT_CHANGED'; end if;
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
revoke all on function public.save_plan(uuid,int,text,text,text,timestamptz,text,uuid,uuid) from public,anon;
grant execute on function public.save_plan(uuid,int,text,text,text,timestamptz,text,uuid,uuid) to authenticated;
drop function public.respond_plan(uuid,int,boolean);
create function public.respond_plan(p_id uuid,p_version int,p_accept boolean,p_expected_user uuid,p_expected_couple uuid)
returns public.plans
language plpgsql security definer set search_path='' as $$
declare item public.plans; c uuid;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() then raise exception 'DRAFT_ACCOUNT_CHANGED'; end if;
 c:=orbit_private.my_couple_id();
 if c is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 perform 1 from public.couples where id=c for update;
 select * into item from public.plans where id=p_id and couple_id=c for update;
 if not found then raise exception 'PLAN_UNAVAILABLE'; end if;
 if p_version is null or item.version<>p_version then raise exception 'PLAN_CHANGED'; end if;
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
revoke all on function public.respond_plan(uuid,int,boolean,uuid,uuid) from public,anon;
grant execute on function public.respond_plan(uuid,int,boolean,uuid,uuid) to authenticated;
drop function public.set_plan_reminder(uuid,int,int);
create function public.set_plan_reminder(p_id uuid,p_version int,p_minutes int,p_expected_user uuid,p_expected_couple uuid)
returns public.plan_reminders
language plpgsql security definer set search_path='' as $$
declare item public.plans; result public.plan_reminders;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() then raise exception 'DRAFT_ACCOUNT_CHANGED'; end if;
 if orbit_private.my_couple_id() is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 select * into item from public.plans where id=p_id and couple_id=orbit_private.my_couple_id() for update;
 if not found then raise exception 'PLAN_UNAVAILABLE'; end if;
 if p_version is null or item.version<>p_version then raise exception 'PLAN_CHANGED'; end if;
 if item.cancelled or item.starts_at<=now() then raise exception 'PLAN_CLOSED'; end if;
 if p_minutes is not null and p_minutes not in (10,30,60,1440) then raise exception 'INVALID_REMINDER'; end if;
 insert into public.plan_reminders(plan_id,user_id,couple_id,lead_minutes) values(p_id,auth.uid(),item.couple_id,p_minutes)
 on conflict(plan_id,user_id) do update set lead_minutes=excluded.lead_minutes returning * into result;
 return result;
end $$;

revoke all on function public.set_plan_reminder(uuid,int,int,uuid,uuid) from public,anon;
grant execute on function public.set_plan_reminder(uuid,int,int,uuid,uuid) to authenticated;
drop function public.save_date_idea(uuid,int,text,text,text,boolean,boolean);
create function public.save_date_idea(p_id uuid,p_version int,p_kind text,p_title text,p_notes text,p_private boolean,p_archived boolean,p_expected_user uuid,p_expected_couple uuid)
returns public.date_ideas language plpgsql security definer set search_path='' as $$
declare c uuid; item public.date_ideas;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() then raise exception 'DRAFT_ACCOUNT_CHANGED'; end if;
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
revoke all on function public.save_date_idea(uuid,int,text,text,text,boolean,boolean,uuid,uuid) from public,anon;
grant execute on function public.save_date_idea(uuid,int,text,text,text,boolean,boolean,uuid,uuid) to authenticated;
drop function public.delete_date_idea(uuid,int);
create function public.delete_date_idea(p_id uuid,p_version int,p_expected_user uuid,p_expected_couple uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() then raise exception 'DRAFT_ACCOUNT_CHANGED'; end if;
 if orbit_private.my_couple_id() is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 delete from public.date_ideas where id=p_id and created_by=auth.uid() and couple_id=orbit_private.my_couple_id() and version=p_version;
 if not found then raise exception 'IDEA_CHANGED'; end if;
end $$;
revoke all on function public.delete_date_idea(uuid,int,uuid,uuid) from public,anon;
grant execute on function public.delete_date_idea(uuid,int,uuid,uuid) to authenticated;
select pg_notify('pgrst','reload schema');
