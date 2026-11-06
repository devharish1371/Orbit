-- Qualify the contribution identity separately from SQL row IDs.
create or replace function public.write_memory_side(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_kept_at timestamptz,p_version int,p_request uuid,p_side jsonb default null)
returns public.posts language plpgsql security definer set search_path='' as $$
declare root public.posts; own jsonb; other jsonb; result jsonb; prior orbit_private.memory_side_requests; fingerprint text; side_id uuid; kind text; body text; path text; thumb text; bytes bigint:=0; small bigint:=0; w int; h int; duration real; mime text; total bigint; used bigint; quota bigint; prefix text;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into root from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if not found or root.kind<>'photo' or not root.keep or root.unsent_at is not null or root.deleting_at is not null or p_kept_at is distinct from root.kept_at then raise exception 'MEMORY_CHANGED'; end if;
 perform 1 from public.couples where id=root.couple_id for update;
 if p_request is null then raise exception 'INVALID_SIDE'; end if;
 fingerprint:=encode(extensions.digest(convert_to(jsonb_build_array(p_version,p_side)::text,'UTF8'),'sha256'),'hex');
 select * into prior from orbit_private.memory_side_requests where post_id=p_post and user_id=auth.uid();
 if found and prior.request_id=p_request then
  if prior.digest<>fingerprint or prior.kept_at<>root.kept_at then raise exception 'SIDE_CHANGED'; end if;
  return root;
 end if;
 select value into own from jsonb_array_elements(root.memory_sides) where value->>'author_id'=auth.uid()::text;
 if (own is null and p_version is not null) or (own is not null and p_version is distinct from (own->>'version')::int) then raise exception 'SIDE_CHANGED'; end if;
 select coalesce(jsonb_agg(value order by value->>'author_id'),'[]') into other from jsonb_array_elements(root.memory_sides) where value->>'author_id'<>auth.uid()::text;
 result:=other;
 if p_side is not null then
  if jsonb_typeof(p_side)<>'object' then raise exception 'INVALID_SIDE'; end if;
  side_id:=(p_side->>'id')::uuid; kind:=p_side->>'kind'; body:=btrim(coalesce(p_side->>'body','')); path:=p_side->>'path'; thumb:=p_side->>'thumb_path';
  if side_id is null or kind is null or kind not in ('text','photo','voice') or length(body)>1000 or (kind='text' and length(body)=0)
   or side_id=root.id or exists(select 1 from jsonb_array_elements(root.photo_items) where value->>'id'=side_id::text)
   or exists(select 1 from jsonb_array_elements(other) where value->>'id'=side_id::text) then raise exception 'INVALID_SIDE'; end if;
  prefix:=root.couple_id::text||'/'||auth.uid()::text||'/'||root.id::text||'_side_'||side_id::text;
  if kind='text' then
   if path is not null or thumb is not null then raise exception 'INVALID_SIDE'; end if;
  else
   if path is null or (kind='photo' and (path<>prefix||'.webp' or thumb is distinct from prefix||'_t.webp')) or (kind='voice' and (path not in (prefix||'.webm',prefix||'.ogg',prefix||'.m4a') or thumb is not null)) then raise exception 'INVALID_SIDE_PATH'; end if;
   -- Sorted media locks match orphan claims before checking authoritative metadata.
   perform pg_advisory_xact_lock(hashtextextended(path,0));
   if thumb is not null then perform pg_advisory_xact_lock(hashtextextended(thumb,0)); end if;
   bytes:=orbit_private.verify_media_reference(path,root.couple_id::text||'/'||auth.uid()::text||'/');
   select metadata->>'mimetype' into mime from storage.objects where bucket_id='media' and name=path;
   if kind='photo' then
    w:=(p_side->>'width')::int; h:=(p_side->>'height')::int;
    small:=orbit_private.verify_media_reference(thumb,root.couple_id::text||'/'||auth.uid()::text||'/');
    if bytes not between 1 and 1048576 or small not between 1 and 65536 or w is null or h is null or w not between 1 and 1600 or h not between 1 and 1600 or mime is distinct from 'image/webp' then raise exception 'INVALID_SIDE_MEDIA'; end if;
   else
    duration:=(p_side->>'duration')::real;
    if bytes not between 1 and 2097152 or duration is null or duration not between 0.1 and 120 or mime is null or mime not in ('audio/webm','audio/ogg','audio/mp4') then raise exception 'INVALID_SIDE_MEDIA'; end if;
   end if;
  end if;
  result:=other||jsonb_build_array(jsonb_build_object('id',side_id,'author_id',auth.uid(),'kind',kind,'body',body,'path',path,'thumb_path',thumb,'bytes',bytes,'thumb_bytes',small,'width',w,'height',h,'duration',duration,'mime',coalesce(mime,''),'version',coalesce((own->>'version')::int,0)+1,'created_at',now()));
 end if;
 if jsonb_array_length(result)>2 then raise exception 'SIDE_LIMIT'; end if;
 select coalesce(sum((value->>'bytes')::bigint+(value->>'thumb_bytes')::bigint),0) into total from jsonb_array_elements(result);
 select keepsake_quota_mb::bigint*1048576 into quota from public.couples where id=root.couple_id;
 select coalesce(sum(media_bytes::bigint+thumb_bytes+extra_media_bytes+extra_thumb_bytes+memory_bytes),0) into used from public.posts where couple_id=root.couple_id and keep and id<>root.id;
 if used+root.media_bytes::bigint+root.thumb_bytes+root.extra_media_bytes+root.extra_thumb_bytes+total>quota then raise exception 'KEEPSAKE_QUOTA_EXCEEDED'; end if;
 update public.posts set memory_sides=result,memory_bytes=total where id=root.id returning * into root;
 insert into orbit_private.memory_side_requests values(root.id,auth.uid(),p_request,fingerprint,root.kept_at) on conflict(post_id,user_id) do update set request_id=excluded.request_id,digest=excluded.digest,kept_at=excluded.kept_at;
 return root;
end $$;
select pg_notify('pgrst','reload schema');
