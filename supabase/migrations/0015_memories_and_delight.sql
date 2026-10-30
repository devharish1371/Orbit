-- Server-owned daily identity: no backdated answer can be inserted to peek at a partner.
create or replace function public.daily_question() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.couples; d date;
begin
 select * into c from public.couples where id=orbit_private.my_couple_id();
 if c.id is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 d := (now() at time zone c.timezone)::date;
 return jsonb_build_object('day',d,'question_idx',((d-date '2025-01-01')%60+60)%60,'server_now',now());
end $$;
revoke insert,update,delete on public.question_answers from authenticated;
create or replace function public.answer_daily_question(p_answer text) returns public.question_answers
language plpgsql security definer set search_path='' as $$
declare q jsonb; result public.question_answers; c uuid;
begin
 c := orbit_private.my_couple_id();
 q := public.daily_question();
 if length(btrim(p_answer)) not between 1 and 1000 then raise exception 'INVALID_ANSWER'; end if;
 insert into public.question_answers(couple_id,user_id,day,question_idx,answer)
 values(c,auth.uid(),(q->>'day')::date,(q->>'question_idx')::int,btrim(p_answer))
 on conflict(user_id,day) do nothing;
 select * into result from public.question_answers where user_id=auth.uid() and day=(q->>'day')::date;
 return result;
end $$;

-- Capsule content remains protected by existing RLS until the server unlock time.
revoke insert,update,delete on public.capsules from authenticated;
create or replace function public.create_capsule(p_id uuid,p_title text,p_body text,p_unlock_at timestamptz)
returns public.capsules language plpgsql security definer set search_path='' as $$
declare c uuid; result public.capsules;
begin
 c := orbit_private.my_couple_id();
 if c is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,15));
 select * into result from public.capsules where id=p_id;
 if result.id is not null then
  if result.author_id=auth.uid() and result.couple_id=c then return result; end if;
  raise exception 'CAPSULE_UNAVAILABLE';
 end if;
 if length(btrim(p_title)) not between 1 and 80 or length(btrim(p_body)) not between 1 and 4000
  or p_unlock_at is null or not isfinite(p_unlock_at) or p_unlock_at<=now()
  or p_unlock_at>now()+interval '20 years' then raise exception 'INVALID_CAPSULE'; end if;
 insert into public.capsules(id,couple_id,author_id,title,body,unlock_at)
 values(p_id,c,auth.uid(),btrim(p_title),btrim(p_body),p_unlock_at) returning * into result;
 return result;
end $$;
create or replace function public.open_capsule(p_id uuid) returns public.capsules
language plpgsql security definer set search_path='' as $$
declare result public.capsules;
begin
 update public.capsules set opened_at=coalesce(opened_at,now())
 where id=p_id and couple_id=orbit_private.my_couple_id() and author_id<>auth.uid() and unlock_at<=now()
 returning * into result;
 if result.id is null then raise exception 'CAPSULE_UNAVAILABLE'; end if;
 return result;
end $$;
create or replace function public.cancel_capsule(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 delete from public.capsules where id=p_id and couple_id=orbit_private.my_couple_id()
 and author_id=auth.uid() and unlock_at>now();
 if not found then raise exception 'CAPSULE_UNAVAILABLE'; end if;
end $$;
drop trigger if exists trg_social_capsules on public.capsules;
create trigger trg_social_capsules after insert or update or delete on public.capsules
for each row execute function orbit_private.bump_social_revision();
drop trigger if exists trg_social_questions on public.question_answers;
create trigger trg_social_questions after insert on public.question_answers
for each row execute function orbit_private.bump_social_revision();

create or replace function orbit_private.question_ready() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.question_answers where couple_id=new.couple_id and day=new.day and user_id<>new.user_id) then
  insert into public.events(couple_id,user_id,type,payload)
  values(new.couple_id,new.user_id,'question_ready',jsonb_build_object('day',new.day));
 end if;
 return null;
end $$;
-- Serializing the couple prevents concurrent answers from missing the ready event.
create or replace function orbit_private.serialize_question() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.couples where id=new.couple_id for update;
 return new;
end $$;
create trigger trg_question_serial before insert on public.question_answers for each row execute function orbit_private.serialize_question();
create trigger trg_question_ready after insert on public.question_answers for each row execute function orbit_private.question_ready();

-- Small permanent counters survive post/event TTL. Location rollup keeps its own fields.
alter table public.daily_summary add column moments_shared int not null default 0;
alter table public.daily_summary add column places_visited int not null default 0;
create or replace function orbit_private.count_memory_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare d date; zone text; moments int:=0; arrivals int:=0; actor uuid;
begin
 select timezone into zone from public.couples where id=new.couple_id;
 d := (new.created_at at time zone zone)::date;
 if tg_table_name='posts' then
  actor:=new.author_id; moments:=case when new.channel='moment' then 1 else 0 end;
 else
  actor:=new.user_id; arrivals:=case when new.type='arrive' then 1 else 0 end;
 end if;
 if moments+arrivals=0 then return null; end if;
 insert into public.daily_summary(user_id,couple_id,day,moments_shared,places_visited)
 values(actor,new.couple_id,d,moments,arrivals)
 on conflict(user_id,day) do update set
 moments_shared=public.daily_summary.moments_shared+excluded.moments_shared,
 places_visited=public.daily_summary.places_visited+excluded.places_visited;
 return null;
end $$;
create trigger trg_count_moments after insert on public.posts for each row execute function orbit_private.count_memory_activity();
create trigger trg_count_arrivals after insert on public.events for each row execute function orbit_private.count_memory_activity();

create or replace function public.week_recap() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.couples; today date; result jsonb;
begin
 select * into c from public.couples where id=orbit_private.my_couple_id();
 if c.id is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 today:=(now() at time zone c.timezone)::date;
 select jsonb_build_object('from',today-7,'through',today-1,'recorded_km',coalesce(sum(distance_km),0),
 'moments',coalesce(sum(moments_shared),0),'arrivals',coalesce(sum(places_visited),0),
 'location_points',coalesce(sum(points),0)) into result from public.daily_summary
 where couple_id=c.id and day>=today-7 and day<today;
 return result;
end $$;

revoke all on function public.daily_question(),public.answer_daily_question(text),public.create_capsule(uuid,text,text,timestamptz),
public.open_capsule(uuid),public.cancel_capsule(uuid),public.week_recap() from public,anon;
grant execute on function public.daily_question(),public.answer_daily_question(text),public.create_capsule(uuid,text,text,timestamptz),
public.open_capsule(uuid),public.cancel_capsule(uuid),public.week_recap() to authenticated;
revoke all on function orbit_private.question_ready(),orbit_private.serialize_question(),orbit_private.count_memory_activity() from public,anon,authenticated;
