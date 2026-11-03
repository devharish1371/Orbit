-- Text presentation is chosen at creation; old clients keep the ink default.
alter table public.posts add column note_style text not null default 'ink' check(note_style in ('ink','glow','paper'));

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
 if p_post->>'place_id' is not null then
   select * into pin from public.places where id=(p_post->>'place_id')::uuid and couple_id=member.couple_id;
   if not found then raise exception 'INVALID_POST_PLACE'; end if;
 end if;
 insert into public.posts(id,couple_id,author_id,channel,kind,body,media_path,thumb_path,media_duration_s,media_width,media_height,waveform,ttl_hours,lat,lng,note_style)
 values(post_id,member.couple_id,auth.uid(),p_post->>'channel',p_post->>'kind',nullif(btrim(p_post->>'body'),''),p_post->>'media_path',p_post->>'thumb_path',
   (p_post->>'duration')::real,(p_post->>'width')::int,(p_post->>'height')::int,
   case when jsonb_typeof(p_post->'waveform')='array' then array(select jsonb_array_elements_text(p_post->'waveform'))::real[] else null end,
   (p_post->>'ttl_hours')::int,pin.lat,pin.lng,coalesce(p_post->>'note_style','ink')) returning * into item;
 if coalesce((p_post->>'keep')::boolean,false) then
   update public.posts set keep=true where id=post_id returning * into item;
 end if;
 return item;
end $$;

select pg_notify('pgrst','reload schema');
