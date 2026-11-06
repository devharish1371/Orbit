-- Contributions stay inside one root Keep/expiry/unsend unit; old clients retain its front.
alter table public.posts add column memory_sides jsonb not null default '[]'::jsonb;
alter table public.posts add column memory_bytes int not null default 0 check(memory_bytes>=0);
create table orbit_private.memory_side_requests (
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.members(user_id) on delete cascade,
 request_id uuid not null, digest text not null, kept_at timestamptz not null,
 primary key(post_id,user_id)
);
revoke all on orbit_private.memory_side_requests from public,anon,authenticated;
create function public.write_memory_side(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_kept_at timestamptz,p_version int,p_request uuid,p_side jsonb default null)
returns public.posts language plpgsql security definer set search_path='' as $$
declare root public.posts; own jsonb; other jsonb; result jsonb; prior orbit_private.memory_side_requests; fingerprint text; id uuid; kind text; body text; path text; thumb text; bytes bigint:=0; small bigint:=0; w int; h int; duration real; mime text; total bigint; used bigint; quota bigint; prefix text;
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
  id:=(p_side->>'id')::uuid; kind:=p_side->>'kind'; body:=btrim(coalesce(p_side->>'body','')); path:=p_side->>'path'; thumb:=p_side->>'thumb_path';
  if id is null or kind is null or kind not in ('text','photo','voice') or length(body)>1000 or (kind='text' and length(body)=0)
   or id=root.id or exists(select 1 from jsonb_array_elements(root.photo_items) where value->>'id'=id::text)
   or exists(select 1 from jsonb_array_elements(other) where value->>'id'=id::text) then raise exception 'INVALID_SIDE'; end if;
  prefix:=root.couple_id::text||'/'||auth.uid()::text||'/'||root.id::text||'_side_'||id::text;
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
  result:=other||jsonb_build_array(jsonb_build_object('id',id,'author_id',auth.uid(),'kind',kind,'body',body,'path',path,'thumb_path',thumb,'bytes',bytes,'thumb_bytes',small,'width',w,'height',h,'duration',duration,'mime',coalesce(mime,''),'version',coalesce((own->>'version')::int,0)+1,'created_at',now()));
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
revoke all on function public.write_memory_side(uuid,uuid,uuid,timestamptz,int,uuid,jsonb) from public,anon;
grant execute on function public.write_memory_side(uuid,uuid,uuid,timestamptz,int,uuid,jsonb) to authenticated;
create or replace function orbit_private.keepsake_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if new.keep is distinct from old.keep or new.unsent_at is distinct from old.unsent_at or new.media_path is distinct from old.media_path or new.body is distinct from old.body or new.photo_items is distinct from old.photo_items or new.memory_sides is distinct from old.memory_sides then new.archive_revision:=old.archive_revision+1;
 else new.archive_revision:=old.archive_revision; end if; return new;
end $$;
-- Existing receipt table can hold either an extra photo or a side. Zero-byte text is valid.
alter table public.keepsake_asset_receipts drop constraint keepsake_asset_receipts_bytes_check;
alter table public.keepsake_asset_receipts add constraint keepsake_asset_receipts_bytes_check check(bytes between 0 and 16777216);
create or replace function public.ack_keepsake_asset(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_post uuid,p_asset uuid,p_revision int,p_bytes int,p_sha256 text)
returns void language plpgsql security definer set search_path='' as $$
declare item public.posts; device public.keepsake_devices; asset jsonb;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for share;
 if not found or not item.keep or item.unsent_at is not null or p_revision is distinct from item.archive_revision then raise exception 'KEEPSAKE_CHANGED'; end if;
 select value into asset from (select value from jsonb_array_elements(item.photo_items) with ordinality where ordinality>1 union all select value from jsonb_array_elements(item.memory_sides)) a where value->>'id'=p_asset::text;
 if asset is null or p_bytes is distinct from (asset->>'bytes')::int or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_COPY'; end if;
 select * into device from public.keepsake_devices where user_id=auth.uid() for share;
 if not found or not device.enabled or p_device is distinct from device.device_id then raise exception 'DEVICE_CHANGED'; end if;
 insert into public.keepsake_asset_receipts(post_id,asset_id,user_id,couple_id,device_id,revision,bytes,sha256) values(p_post,p_asset,auth.uid(),p_expected_couple,p_device,p_revision,p_bytes,p_sha256)
 on conflict(post_id,user_id,asset_id) do update set device_id=excluded.device_id,revision=excluded.revision,bytes=excluded.bytes,sha256=excluded.sha256,verified_at=now();
end $$;

create or replace function orbit_private.posts_keep_change() returns trigger language plpgsql security definer set search_path='' as $$
declare used bigint; q int; d int;
begin
 select keepsake_quota_mb,retention_days into q,d from public.couples where id=new.couple_id for update;
 if old.deleting_at is not null then raise exception 'POST_CLEANUP_IN_PROGRESS'; end if;
 if new.keep then
  select coalesce(sum(media_bytes::bigint+thumb_bytes::bigint+extra_media_bytes::bigint+extra_thumb_bytes::bigint+memory_bytes::bigint),0) into used from public.posts where couple_id=new.couple_id and keep and id<>new.id;
  if used+new.media_bytes::bigint+new.thumb_bytes::bigint+new.extra_media_bytes::bigint+new.extra_thumb_bytes::bigint+new.memory_bytes::bigint>q::bigint*1048576 then raise exception 'KEEPSAKE_QUOTA_EXCEEDED'; end if;
  new.expires_at:=null; new.kept_by:=auth.uid(); new.kept_at:=now();
 else new.expires_at:=now()+make_interval(days=>d); new.kept_by:=null; new.kept_at:=null; end if;
 return new;
end $$;

create or replace function public.storage_summary() returns jsonb language plpgsql security definer set search_path='' as $$
declare couple uuid; used bigint; kept bigint; quota bigint; files bigint; expiring bigint;
begin
 couple:=orbit_private.my_couple_id(); if couple is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 select coalesce(sum((metadata->>'size')::bigint),0),count(*) into used,files from storage.objects where bucket_id='media' and (storage.foldername(name))[1]=couple::text;
 select coalesce(sum(media_bytes::bigint+thumb_bytes::bigint+extra_media_bytes::bigint+extra_thumb_bytes::bigint+memory_bytes::bigint) filter(where keep and unsent_at is null),0),count(*) filter(where not keep and unsent_at is null and expires_at>now() and expires_at<now()+interval '24 hours') into kept,expiring from public.posts where couple_id=couple;
 select keepsake_quota_mb::bigint*1048576 into quota from public.couples where id=couple;
 return jsonb_build_object('total_bytes',used,'files',files,'kept_bytes',kept,'quota_bytes',quota,'expiring_soon',expiring);
end $$;

create or replace function public.claim_orphan_media(p_paths text[]) returns setof text language plpgsql security definer set search_path='' as $$
declare p text;
begin
 for p in select distinct unnest(p_paths) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended(p,0));
  if exists(select 1 from storage.objects where bucket_id='media' and name=p and created_at<now()-interval '24 hours')
  and not exists(select 1 from public.posts where media_path=p or thumb_path=p or (photo_items @> jsonb_build_array(jsonb_build_object('path',p)) or memory_sides @> jsonb_build_array(jsonb_build_object('path',p))) or (photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',p)) or memory_sides @> jsonb_build_array(jsonb_build_object('thumb_path',p))))
  and not exists(select 1 from public.members where avatar_path=p)
  and not exists(select 1 from public.media_gc where path=p and claimed_at>now()-interval '10 minutes') then
   insert into public.media_gc(path) values(p) on conflict(path) do update set claimed_at=now(); return next p;
  end if;
 end loop;
end $$;

create or replace function public.finish_expired_post(p_id uuid,p_token uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare n int;
begin
 -- An old worker may know only the cover. Never drop the remaining file references.
 delete from public.posts p where p.id=p_id and p.deletion_token=p_token and not p.keep and p.expires_at<now()
 and not exists(select 1 from storage.objects o where o.bucket_id='media' and (o.name=p.media_path or o.name=p.thumb_path or (p.photo_items @> jsonb_build_array(jsonb_build_object('path',o.name)) or p.memory_sides @> jsonb_build_array(jsonb_build_object('path',o.name))) or (p.photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',o.name)) or p.memory_sides @> jsonb_build_array(jsonb_build_object('thumb_path',o.name)))));
 get diagnostics n=row_count; return n=1;
end $$;

alter policy media_read on storage.objects using (
 bucket_id='media' and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and (
 (storage.foldername(name))[2]=auth.uid()::text or exists(select 1 from public.posts p where p.media_path=storage.objects.name or p.thumb_path=storage.objects.name or (p.photo_items @> jsonb_build_array(jsonb_build_object('path',storage.objects.name)) or p.memory_sides @> jsonb_build_array(jsonb_build_object('path',storage.objects.name))) or (p.photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',storage.objects.name)) or p.memory_sides @> jsonb_build_array(jsonb_build_object('thumb_path',storage.objects.name)))) or exists(select 1 from public.members m where m.avatar_path=storage.objects.name))
);
alter policy media_delete on storage.objects using (
 bucket_id='media' and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and (storage.foldername(name))[2]=auth.uid()::text
 and not exists(select 1 from public.posts p where p.media_path=storage.objects.name or p.thumb_path=storage.objects.name or (p.photo_items @> jsonb_build_array(jsonb_build_object('path',storage.objects.name)) or p.memory_sides @> jsonb_build_array(jsonb_build_object('path',storage.objects.name))) or (p.photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',storage.objects.name)) or p.memory_sides @> jsonb_build_array(jsonb_build_object('thumb_path',storage.objects.name))))
 and not exists(select 1 from public.members m where m.avatar_path=storage.objects.name)
);

select pg_notify('pgrst','reload schema');
