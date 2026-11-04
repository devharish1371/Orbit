-- Keep lock ordering consistent across planning writes and their foreign keys/revision triggers.
create or replace function public.set_plan_reminder(p_id uuid,p_version int,p_minutes int,p_expected_user uuid,p_expected_couple uuid)
returns public.plan_reminders
language plpgsql security definer set search_path='' as $$
declare item public.plans; result public.plan_reminders;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() then raise exception 'DRAFT_ACCOUNT_CHANGED'; end if;
 if orbit_private.my_couple_id() is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 perform 1 from public.couples where id=orbit_private.my_couple_id() for update;
 select * into item from public.plans where id=p_id and couple_id=orbit_private.my_couple_id() for update;
 if not found then raise exception 'PLAN_UNAVAILABLE'; end if;
 if p_version is null or item.version<>p_version then raise exception 'PLAN_CHANGED'; end if;
 if item.cancelled or item.starts_at<=now() then raise exception 'PLAN_CLOSED'; end if;
 if p_minutes is not null and p_minutes not in (10,30,60,1440) then raise exception 'INVALID_REMINDER'; end if;
 insert into public.plan_reminders(plan_id,user_id,couple_id,lead_minutes) values(p_id,auth.uid(),item.couple_id,p_minutes)
 on conflict(plan_id,user_id) do update set lead_minutes=excluded.lead_minutes returning * into result;
 return result;
end $$;

create or replace function public.delete_date_idea(p_id uuid,p_version int,p_expected_user uuid,p_expected_couple uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() then raise exception 'DRAFT_ACCOUNT_CHANGED'; end if;
 if orbit_private.my_couple_id() is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 perform 1 from public.couples where id=orbit_private.my_couple_id() for update;
 delete from public.date_ideas where id=p_id and created_by=auth.uid() and couple_id=orbit_private.my_couple_id() and version=p_version;
 if not found then raise exception 'IDEA_CHANGED'; end if;
end $$;
