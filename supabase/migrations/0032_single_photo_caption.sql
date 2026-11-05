-- Preserve captions when a draft set is reduced to one image.
create or replace function orbit_private.prepare_photo_set() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; result jsonb:='[]'; ids uuid[]:='{}'; asset uuid; prefix text; path text; thumb text; n int:=0; size bigint; small bigint; caption text; w int; h int;
begin
 new.extra_media_bytes:=0; new.extra_thumb_bytes:=0;
 if jsonb_typeof(new.photo_items) is distinct from 'array' then raise exception 'INVALID_PHOTO_SET'; end if;
 if jsonb_array_length(new.photo_items)=0 then return new; end if;
 if new.kind<>'photo' or jsonb_array_length(new.photo_items) not between 1 and 6 then raise exception 'INVALID_PHOTO_SET'; end if;
 prefix:=new.couple_id::text||'/'||new.author_id::text||'/'||new.id::text;
 -- Lock every referenced upload in sorted order, matching orphan claims.
 for path in select value from (
  select value->>'path' as value from jsonb_array_elements(new.photo_items)
  union select value->>'thumb_path' from jsonb_array_elements(new.photo_items)
 ) paths where value is not null order by value loop
  perform pg_advisory_xact_lock(hashtextextended(path,0));
 end loop;
 for item in select value from jsonb_array_elements(new.photo_items) loop
  if jsonb_typeof(item)<>'object' then raise exception 'INVALID_PHOTO_SET'; end if;
  asset:=(item->>'id')::uuid; w:=(item->>'width')::int; h:=(item->>'height')::int;
  caption:=coalesce(item->>'caption',''); path:=item->>'path'; thumb:=item->>'thumb_path';
  if asset is null or asset=any(ids) or w is null or h is null or w not between 1 and 1600 or h not between 1 and 1600 or length(caption)>400 then raise exception 'INVALID_PHOTO_SET'; end if;
  ids:=array_append(ids,asset);
  if n=0 then
   if asset<>new.id or path is distinct from prefix||'.webp' or thumb is distinct from prefix||'_t.webp' or path is distinct from new.media_path or thumb is distinct from new.thumb_path then raise exception 'INVALID_PHOTO_PATH'; end if;
   new.media_width:=w; new.media_height:=h;
  elsif path is distinct from prefix||'_'||asset::text||'.webp' or thumb is distinct from prefix||'_'||asset::text||'_t.webp' then raise exception 'INVALID_PHOTO_PATH'; end if;
  size:=orbit_private.verify_media_reference(path,new.couple_id::text||'/'||new.author_id::text||'/');
  small:=orbit_private.verify_media_reference(thumb,new.couple_id::text||'/'||new.author_id::text||'/');
  if size not between 1 and 1048576 or small not between 1 and 65536 then raise exception 'PHOTO_SIZE_LIMIT'; end if;
  if n>0 then new.extra_media_bytes:=new.extra_media_bytes+size; new.extra_thumb_bytes:=new.extra_thumb_bytes+small; end if;
  result:=result||jsonb_build_array(jsonb_build_object('id',asset,'path',path,'thumb_path',thumb,'width',w,'height',h,'caption',caption,'bytes',size,'thumb_bytes',small));
  n:=n+1;
 end loop;
 new.photo_items:=result;
 return new;
end $$;

create or replace function public.create_photo_post(p_post jsonb) returns public.posts language plpgsql security definer set search_path='' as $$
declare member public.members; item public.posts; pin public.places; identity uuid; first_photo jsonb;
begin
 select * into member from public.members where user_id=auth.uid();
 if not found then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 if (p_post->>'expected_author_id')::uuid is distinct from auth.uid() or (p_post->>'expected_couple_id')::uuid is distinct from member.couple_id then raise exception 'DRAFT_ACCOUNT_CHANGED'; end if;
 identity:=(p_post->>'id')::uuid; if identity is null then raise exception 'POST_ID_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(identity::text,0));
 select * into item from public.posts where id=identity;
 if found then
  if item.author_id<>auth.uid() or item.couple_id<>member.couple_id or item.unsent_at is not null then raise exception 'POST_ID_UNAVAILABLE'; end if;
  return item;
 end if;
 if p_post->>'channel' is null or p_post->>'channel' not in ('moment','chat') or jsonb_typeof(p_post->'photos') is distinct from 'array' or jsonb_array_length(p_post->'photos') not between 1 and 6 then raise exception 'INVALID_PHOTO_SET'; end if;
 if p_post->>'reply_to_id' is not null and (p_post->>'channel'<>'chat' or not exists(select 1 from public.posts where id=(p_post->>'reply_to_id')::uuid and couple_id=member.couple_id and channel='chat' and unsent_at is null and (keep or expires_at>now()))) then raise exception 'REPLY_UNAVAILABLE'; end if;
 if p_post->>'place_id' is not null then
  select * into pin from public.places where id=(p_post->>'place_id')::uuid and couple_id=member.couple_id;
  if not found then raise exception 'INVALID_POST_PLACE'; end if;
 end if;
 first_photo:=p_post->'photos'->0;
 insert into public.posts(id,couple_id,author_id,channel,kind,body,media_path,thumb_path,ttl_hours,lat,lng,reply_to_id,photo_items)
 values(identity,member.couple_id,auth.uid(),p_post->>'channel','photo',nullif(btrim(p_post->>'body'),''),first_photo->>'path',first_photo->>'thumb_path',(p_post->>'ttl_hours')::int,pin.lat,pin.lng,(p_post->>'reply_to_id')::uuid,p_post->'photos') returning * into item;
 if coalesce((p_post->>'keep')::boolean,false) then update public.posts set keep=true where id=identity returning * into item; end if;
 return item;
end $$;
select pg_notify('pgrst','reload schema');
