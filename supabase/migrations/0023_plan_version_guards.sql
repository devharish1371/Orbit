-- Explicit versions are required for decisions and reminder changes.
create or replace function public.respond_plan(p_id uuid,p_version int,p_accept boolean) returns public.plans
language plpgsql security definer set search_path='' as $$
declare item public.plans; c uuid;
begin
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
create or replace function public.set_plan_reminder(p_id uuid,p_version int,p_minutes int) returns public.plan_reminders
language plpgsql security definer set search_path='' as $$
declare item public.plans; result public.plan_reminders;
begin
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

create or replace function orbit_private.idea_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if not old.private then update public.couples set social_revision=social_revision+1 where id=old.couple_id; end if;
 elsif not new.private or (tg_op='UPDATE' and not old.private) then
  update public.couples set social_revision=social_revision+1 where id=new.couple_id;
 end if;
 return null;
end $$;
create trigger trg_social_ideas_delete after delete on public.date_ideas for each row execute function orbit_private.idea_revision();
create function public.delete_date_idea(p_id uuid,p_version int) returns void language plpgsql security definer set search_path='' as $$
begin
 if orbit_private.my_couple_id() is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 delete from public.date_ideas where id=p_id and created_by=auth.uid() and couple_id=orbit_private.my_couple_id() and version=p_version;
 if not found then raise exception 'IDEA_CHANGED'; end if;
end $$;
revoke all on function public.delete_date_idea(uuid,int) from public,anon;
grant execute on function public.delete_date_idea(uuid,int) to authenticated;
select pg_notify('pgrst','reload schema');
