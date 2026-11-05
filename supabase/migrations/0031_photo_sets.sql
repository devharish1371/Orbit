-- One post/Keep/expiry decision; legacy clients retain the first-photo fields.
alter table public.posts add column photo_items jsonb not null default '[]'::jsonb;
alter table public.posts add column extra_media_bytes int not null default 0 check(extra_media_bytes>=0);
alter table public.posts add column extra_thumb_bytes int not null default 0 check(extra_thumb_bytes>=0);
create function orbit_private.prepare_photo_set() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; result jsonb:='[]'; ids uuid[]:='{}'; asset uuid; prefix text; path text; thumb text; n int:=0; size bigint; small bigint; caption text; w int; h int;
begin
 new.extra_media_bytes:=0; new.extra_thumb_bytes:=0;
 if jsonb_typeof(new.photo_items) is distinct from 'array' then raise exception 'INVALID_PHOTO_SET'; end if;
 if jsonb_array_length(new.photo_items)=0 then return new; end if;
 if new.kind<>'photo' or jsonb_array_length(new.photo_items) not between 2 and 6 then raise exception 'INVALID_PHOTO_SET'; end if;
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
-- Locks the full set before the legacy first-file preparation acquires subset locks.
create trigger trg_post_photo_set before insert on public.posts for each row execute function orbit_private.prepare_photo_set();
revoke all on function orbit_private.prepare_photo_set() from public,anon,authenticated;

create function public.create_photo_post(p_post jsonb) returns public.posts language plpgsql security definer set search_path='' as $$
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
 if p_post->>'channel' is null or p_post->>'channel' not in ('moment','chat') or jsonb_typeof(p_post->'photos') is distinct from 'array' or jsonb_array_length(p_post->'photos') not between 2 and 6 then raise exception 'INVALID_PHOTO_SET'; end if;
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
revoke all on function public.create_photo_post(jsonb) from public,anon;
grant execute on function public.create_photo_post(jsonb) to authenticated;

create or replace function orbit_private.posts_keep_change() returns trigger language plpgsql security definer set search_path='' as $$
declare used bigint; q int; d int;
begin
 select keepsake_quota_mb,retention_days into q,d from public.couples where id=new.couple_id for update;
 if old.deleting_at is not null then raise exception 'POST_CLEANUP_IN_PROGRESS'; end if;
 if new.keep then
  select coalesce(sum(media_bytes::bigint+thumb_bytes::bigint+extra_media_bytes::bigint+extra_thumb_bytes::bigint),0) into used from public.posts where couple_id=new.couple_id and keep and id<>new.id;
  if used+new.media_bytes::bigint+new.thumb_bytes::bigint+new.extra_media_bytes::bigint+new.extra_thumb_bytes::bigint>q::bigint*1048576 then raise exception 'KEEPSAKE_QUOTA_EXCEEDED'; end if;
  new.expires_at:=null; new.kept_by:=auth.uid(); new.kept_at:=now();
 else new.expires_at:=now()+make_interval(days=>d); new.kept_by:=null; new.kept_at:=null; end if;
 return new;
end $$;
create or replace function public.storage_summary() returns jsonb language plpgsql security definer set search_path='' as $$
declare couple uuid; used bigint; kept bigint; quota bigint; files bigint; expiring bigint;
begin
 couple:=orbit_private.my_couple_id(); if couple is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 select coalesce(sum((metadata->>'size')::bigint),0),count(*) into used,files from storage.objects where bucket_id='media' and (storage.foldername(name))[1]=couple::text;
 select coalesce(sum(media_bytes::bigint+thumb_bytes::bigint+extra_media_bytes::bigint+extra_thumb_bytes::bigint) filter(where keep and unsent_at is null),0),count(*) filter(where not keep and unsent_at is null and expires_at>now() and expires_at<now()+interval '24 hours') into kept,expiring from public.posts where couple_id=couple;
 select keepsake_quota_mb::bigint*1048576 into quota from public.couples where id=couple;
 return jsonb_build_object('total_bytes',used,'files',files,'kept_bytes',kept,'quota_bytes',quota,'expiring_soon',expiring);
end $$;
alter policy media_read on storage.objects using (
 bucket_id='media' and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and (
 (storage.foldername(name))[2]=auth.uid()::text or exists(select 1 from public.posts p where p.media_path=storage.objects.name or p.thumb_path=storage.objects.name or p.photo_items @> jsonb_build_array(jsonb_build_object('path',storage.objects.name)) or p.photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',storage.objects.name))) or exists(select 1 from public.members m where m.avatar_path=storage.objects.name))
);
alter policy media_delete on storage.objects using (
 bucket_id='media' and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and (storage.foldername(name))[2]=auth.uid()::text
 and not exists(select 1 from public.posts p where p.media_path=storage.objects.name or p.thumb_path=storage.objects.name or p.photo_items @> jsonb_build_array(jsonb_build_object('path',storage.objects.name)) or p.photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',storage.objects.name)))
 and not exists(select 1 from public.members m where m.avatar_path=storage.objects.name)
);
create or replace function public.claim_orphan_media(p_paths text[]) returns setof text language plpgsql security definer set search_path='' as $$
declare p text;
begin
 for p in select distinct unnest(p_paths) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended(p,0));
  if exists(select 1 from storage.objects where bucket_id='media' and name=p and created_at<now()-interval '24 hours')
  and not exists(select 1 from public.posts where media_path=p or thumb_path=p or photo_items @> jsonb_build_array(jsonb_build_object('path',p)) or photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',p)))
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
 and not exists(select 1 from storage.objects o where o.bucket_id='media' and (o.name=p.media_path or o.name=p.thumb_path or p.photo_items @> jsonb_build_array(jsonb_build_object('path',o.name)) or p.photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',o.name))));
 get diagnostics n=row_count; return n=1;
end $$;

create table public.keepsake_asset_receipts (
 post_id uuid not null references public.posts(id) on delete cascade,
 asset_id uuid not null, user_id uuid not null references public.members(user_id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade, device_id uuid not null,
 revision int not null, bytes int not null check(bytes between 1 and 1048576),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),verified_at timestamptz not null default now(),
 primary key(post_id,user_id,asset_id)
);
alter table public.keepsake_asset_receipts enable row level security;
create policy kar_read on public.keepsake_asset_receipts for select to authenticated using(couple_id=orbit_private.my_couple_id());
revoke all on public.keepsake_asset_receipts from public,anon,authenticated;
grant select on public.keepsake_asset_receipts to authenticated;
grant all on public.keepsake_asset_receipts to service_role;
create function public.ack_keepsake_asset(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_post uuid,p_asset uuid,p_revision int,p_bytes int,p_sha256 text)
returns void language plpgsql security definer set search_path='' as $$
declare item public.posts; device public.keepsake_devices; photo jsonb;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for share;
 if not found or not item.keep or item.unsent_at is not null or p_revision is distinct from item.archive_revision then raise exception 'KEEPSAKE_CHANGED'; end if;
 select value into photo from jsonb_array_elements(item.photo_items) with ordinality where ordinality>1 and (value->>'id')::uuid=p_asset;
 if photo is null or p_bytes is distinct from (photo->>'bytes')::int or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_COPY'; end if;
 select * into device from public.keepsake_devices where user_id=auth.uid() for share;
 if not found or not device.enabled or p_device is distinct from device.device_id then raise exception 'DEVICE_CHANGED'; end if;
 insert into public.keepsake_asset_receipts(post_id,asset_id,user_id,couple_id,device_id,revision,bytes,sha256) values(p_post,p_asset,auth.uid(),p_expected_couple,p_device,p_revision,p_bytes,p_sha256)
 on conflict(post_id,user_id,asset_id) do update set device_id=excluded.device_id,revision=excluded.revision,bytes=excluded.bytes,sha256=excluded.sha256,verified_at=now();
end $$;
create function public.forget_keepsake_asset(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_post uuid,p_asset uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 delete from public.keepsake_asset_receipts where post_id=p_post and asset_id=p_asset and user_id=auth.uid() and device_id=p_device;
end $$;
create or replace function orbit_private.invalidate_keepsake_copies() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.keepsake_receipts where post_id=new.id; delete from public.keepsake_asset_receipts where post_id=new.id; return null; end $$;
create or replace function orbit_private.keepsake_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if new.keep is distinct from old.keep or new.unsent_at is distinct from old.unsent_at or new.media_path is distinct from old.media_path or new.body is distinct from old.body or new.photo_items is distinct from old.photo_items then new.archive_revision:=old.archive_revision+1;
 else new.archive_revision:=old.archive_revision; end if; return new;
end $$;
create function orbit_private.invalidate_asset_device() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.keepsake_asset_receipts where user_id=new.user_id and (not new.enabled or device_id<>new.device_id); return null;
end $$;
create trigger trg_keepsake_asset_device after update on public.keepsake_devices for each row execute function orbit_private.invalidate_asset_device();
revoke all on function orbit_private.invalidate_asset_device() from public,anon,authenticated;
revoke all on function public.ack_keepsake_asset(uuid,uuid,uuid,uuid,uuid,int,int,text),public.forget_keepsake_asset(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.ack_keepsake_asset(uuid,uuid,uuid,uuid,uuid,int,int,text),public.forget_keepsake_asset(uuid,uuid,uuid,uuid,uuid) to authenticated;
select pg_notify('pgrst','reload schema');
