-- Voluntary status only; clearing retains a version tombstone for stale-device protection.
create table public.member_status (
 user_id uuid primary key references public.members(user_id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 emoji text not null default '', message text not null default '', expires_at timestamptz,
 version int not null check(version>0)
);
alter table public.member_status enable row level security;
create policy status_read on public.member_status for select to authenticated using(
 couple_id=orbit_private.my_couple_id() and (user_id=auth.uid() or expires_at>now())
);
revoke all on public.member_status from public,anon,authenticated;
grant select on public.member_status to authenticated;
grant all on public.member_status to service_role;

create function public.set_member_status(p_expected_user uuid,p_expected_couple uuid,p_version int,p_emoji text,p_message text,p_hours int)
returns public.member_status language plpgsql security definer set search_path='' as $$
declare item public.member_status;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 if p_version is null or p_version<0 or p_emoji is null or p_message is null or p_hours is null
 or p_hours not in (0,1,4,24) or length(btrim(p_message))>80 or p_message ~ '[[:cntrl:]]'
 or p_emoji not in ('','💬','☕','🌙','🎧','📚','🌿','✨','❤️')
 or (p_hours>0 and p_emoji='' and btrim(p_message)='')
 or (p_hours=0 and (p_emoji<>'' or btrim(p_message)<>'')) then raise exception 'INVALID_STATUS'; end if;
 perform pg_advisory_xact_lock(hashtextextended('status:'||auth.uid()::text,0));
 select * into item from public.member_status where user_id=auth.uid() for update;
 if coalesce(item.version,0)<>p_version then raise exception 'STATUS_CHANGED'; end if;
 insert into public.member_status(user_id,couple_id,emoji,message,expires_at,version)
 values(auth.uid(),p_expected_couple,p_emoji,btrim(p_message),case when p_hours=0 then null else now()+p_hours*interval '1 hour' end,p_version+1)
 on conflict(user_id) do update set emoji=excluded.emoji,message=excluded.message,expires_at=excluded.expires_at,version=excluded.version
 returning * into item;
 update public.couples set social_revision=social_revision+1 where id=p_expected_couple;
 return item;
end $$;

-- Server date and couple timezone; only actual retained memories from earlier years.
create function public.on_this_day_keepsakes(p_before_created timestamptz default null,p_before_id uuid default null)
returns setof public.posts language plpgsql stable security invoker set search_path='' as $$
declare zone text; today date;
begin
 if (p_before_created is null)<>(p_before_id is null) or (p_before_created is not null and not isfinite(p_before_created)) then raise exception 'INVALID_MEMORY_CURSOR'; end if;
 select timezone into zone from public.couples where id=orbit_private.my_couple_id();
 if zone is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 today=(now() at time zone zone)::date;
 return query select p.* from public.posts p
 where p.couple_id=orbit_private.my_couple_id() and p.keep and p.unsent_at is null
 and extract(year from p.created_at at time zone zone)<extract(year from today)
 and to_char(p.created_at at time zone zone,'MM-DD')=to_char(today,'MM-DD')
 and (p_before_id is null or (p.created_at,p.id)<(p_before_created,p_before_id))
 order by p.created_at desc,p.id desc limit 30;
end $$;
revoke all on function public.set_member_status(uuid,uuid,int,text,text,int),public.on_this_day_keepsakes(timestamptz,uuid) from public,anon;
grant execute on function public.set_member_status(uuid,uuid,int,text,text,int),public.on_this_day_keepsakes(timestamptz,uuid) to authenticated;
