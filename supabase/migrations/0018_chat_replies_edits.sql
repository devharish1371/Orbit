-- A reply retains only an identifier; content is re-read through ordinary post RLS.
-- No FK: retain an unavailable-quote marker when retention physically deletes the target.
alter table public.posts add column reply_to_id uuid;
alter table public.posts add column edited_at timestamptz;
alter table public.posts add column edit_version int not null default 0 check(edit_version>=0);
alter table public.posts add constraint post_no_self_reply check(reply_to_id is null or reply_to_id<>id);

create or replace function public.create_shared_post(p_post jsonb) returns public.posts
language plpgsql security definer set search_path='' as $$
declare member public.members; item public.posts; pin public.places; post_id uuid;
begin
 select * into member from public.members where user_id=auth.uid();
 if not found then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 post_id:=(p_post->>'id')::uuid;
 if post_id is null then raise exception 'POST_ID_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(post_id::text,0));
 select * into item from public.posts where id=post_id;
 if found then
   if item.author_id<>auth.uid() or item.couple_id<>member.couple_id or item.unsent_at is not null then raise exception 'POST_ID_UNAVAILABLE'; end if;
   return item; -- retry after an ambiguous network response never creates a duplicate
 end if;
 if p_post->>'channel' not in ('moment','chat') or p_post->>'kind' not in ('text','photo','voice','mood')
   or p_post->>'channel' is null or p_post->>'kind' is null then raise exception 'INVALID_POST'; end if;
 if coalesce(p_post->>'note_style','ink') not in ('ink','glow','paper') then raise exception 'INVALID_NOTE_STYLE'; end if;
 if p_post->>'kind' in ('text','mood') and length(btrim(coalesce(p_post->>'body','')))=0 then raise exception 'EMPTY_POST'; end if;
 if p_post->>'kind'='voice' and (p_post->>'duration' is null or (p_post->>'duration')::real not between 0.1 and 120) then raise exception 'INVALID_VOICE_DURATION'; end if;
 if p_post->>'reply_to_id' is not null then
   if p_post->>'channel'<>'chat' or not exists(
     select 1 from public.posts p where p.id=(p_post->>'reply_to_id')::uuid
       and p.couple_id=member.couple_id and p.channel='chat' and p.unsent_at is null
       and (p.keep or p.expires_at>now())
   ) then raise exception 'REPLY_UNAVAILABLE'; end if;
 end if;
 if p_post->>'place_id' is not null then
   select * into pin from public.places where id=(p_post->>'place_id')::uuid and couple_id=member.couple_id;
   if not found then raise exception 'INVALID_POST_PLACE'; end if;
 end if;
 insert into public.posts(id,couple_id,author_id,channel,kind,body,media_path,thumb_path,media_duration_s,media_width,media_height,waveform,ttl_hours,lat,lng,note_style,reply_to_id)
 values(post_id,member.couple_id,auth.uid(),p_post->>'channel',p_post->>'kind',nullif(btrim(p_post->>'body'),''),p_post->>'media_path',p_post->>'thumb_path',
   (p_post->>'duration')::real,(p_post->>'width')::int,(p_post->>'height')::int,
   case when jsonb_typeof(p_post->'waveform')='array' then array(select jsonb_array_elements_text(p_post->'waveform'))::real[] else null end,
   (p_post->>'ttl_hours')::int,pin.lat,pin.lng,coalesce(p_post->>'note_style','ink'),(p_post->>'reply_to_id')::uuid) returning * into item;
 if coalesce((p_post->>'keep')::boolean,false) then
   update public.posts set keep=true where id=post_id returning * into item;
 end if;
 return item;
end $$;

create or replace function public.edit_chat_post(p_id uuid,p_body text,p_expected_version int) returns public.posts
language plpgsql security definer set search_path='' as $$
declare item public.posts; value text:=btrim(p_body);
begin
 if auth.uid() is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 if value is null or char_length(value) not between 1 and 2000 or p_expected_version is null or p_expected_version<0 then raise exception 'INVALID_EDIT'; end if;
 select * into item from public.posts where id=p_id and couple_id=orbit_private.my_couple_id() for update;
 if not found or item.author_id<>auth.uid() or item.channel<>'chat' or item.kind<>'text'
   or item.unsent_at is not null or not (item.keep or item.expires_at>now()) then raise exception 'EDIT_UNAVAILABLE'; end if;
 -- A retry after an ambiguous successful response is safe and cannot advance the version twice.
 if item.edit_version=p_expected_version+1 and item.body=value then return item; end if;
 if item.created_at<now()-interval '15 minutes' then raise exception 'EDIT_WINDOW_CLOSED'; end if;
 if item.edit_version<>p_expected_version then raise exception 'EDIT_CONFLICT'; end if;
 if item.body=value then return item; end if;
 update public.posts set body=value,edited_at=now(),edit_version=edit_version+1 where id=p_id returning * into item;
 return item;
end $$;
revoke all on function public.edit_chat_post(uuid,text,int) from public,anon;
grant execute on function public.edit_chat_post(uuid,text,int) to authenticated;
select pg_notify('pgrst','reload schema');
