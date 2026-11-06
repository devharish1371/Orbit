-- No archive may remove an avatar or a file shared with another post. Serialize new
-- references against archive state under the couple lock, without inverted path locks.
create function orbit_private.archive_exclusive(item public.posts) returns boolean language plpgsql stable security definer set search_path='' as $$
declare files jsonb;
begin
 files:=orbit_private.memory_file_manifest(item);
 return not exists(select 1 from public.members m where m.avatar_path is not null and files @> jsonb_build_array(jsonb_build_object('path',m.avatar_path)))
 and not exists(select 1 from public.posts p cross join lateral jsonb_array_elements(orbit_private.memory_file_manifest(p)) f where p.id<>item.id and files @> jsonb_build_array(jsonb_build_object('path',f->>'path')));
end $$;
revoke all on function orbit_private.archive_exclusive(public.posts) from public,anon,authenticated;
create function orbit_private.guard_archive_references() returns trigger language plpgsql security definer set search_path='' as $$
declare file jsonb;
begin
 if current_setting('orbit.archive_write',true)='on' then return null; end if;
 perform 1 from public.couples where id=new.couple_id for update;
 for file in select value from jsonb_array_elements(orbit_private.memory_file_manifest(new)) loop
  if orbit_private.archive_file_protected(file->>'path') then raise exception 'ARCHIVE_REFERENCE_LOCKED'; end if;
 end loop;
 return null;
end $$;
create trigger trg_archive_reference_insert after insert on public.posts for each row execute function orbit_private.guard_archive_references();
create trigger trg_archive_reference_update after update of media_path,thumb_path,photo_items,memory_sides on public.posts for each row execute function orbit_private.guard_archive_references();
create function orbit_private.guard_archive_avatar() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.avatar_path is not null then
  perform 1 from public.couples where id=new.couple_id for update;
  if orbit_private.archive_file_protected(new.avatar_path) then raise exception 'ARCHIVE_REFERENCE_LOCKED'; end if;
 end if;
 return null;
end $$;
create trigger trg_archive_avatar after insert or update of avatar_path on public.members for each row execute function orbit_private.guard_archive_avatar();
revoke all on function orbit_private.guard_archive_references(),orbit_private.guard_archive_avatar() from public,anon,authenticated;


create or replace function public.prepare_memory_archive(p_expected_user uuid,p_expected_couple uuid,p_post uuid) returns public.memory_archives language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; identity uuid; snapshot text; files jsonb;
begin
 if auth.uid() is distinct from p_expected_user or orbit_private.my_couple_id() is distinct from p_expected_couple or p_expected_couple is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if not found or item.cloud_state<>'online' or not item.keep or item.unsent_at is not null then raise exception 'ARCHIVE_UNAVAILABLE'; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 if not orbit_private.archive_exclusive(item) then raise exception 'MEDIA_USED_ELSEWHERE'; end if;
 if not orbit_private.archive_pair(item) then raise exception 'FRESH_PHONE_COPIES_REQUIRED'; end if;
 select * into a from public.memory_archives where post_id=p_post for update;
 if found and a.state='proposed' and a.revision=item.archive_revision and a.kept_at=item.kept_at then return a; end if;
 identity:=pg_catalog.gen_random_uuid();files:=orbit_private.memory_file_manifest(item);
 select coalesce(jsonb_agg(value||jsonb_build_object('mime',(select metadata->>'mimetype' from storage.objects where bucket_id='media' and name=value->>'path')) order by value->>'path'),'[]') into files from jsonb_array_elements(files);
 if exists(select 1 from jsonb_array_elements(files) where value->>'mime' is null) then raise exception 'CLOUD_MEDIA_UNAVAILABLE'; end if;
 if jsonb_array_length(files)=0 or jsonb_array_length(files)>20 then raise exception 'NO_CLOUD_FILES'; end if;
 snapshot:=jsonb_build_object('format','orbit-archive-v1','archive_id',identity,'post',to_jsonb(item)-'deletion_token'-'deleting_at','files',files)::text;
 insert into public.memory_archives(post_id,couple_id,archive_id,revision,kept_at,snapshot,snapshot_sha,files,state)
 values(item.id,item.couple_id,identity,item.archive_revision,item.kept_at,snapshot,encode(extensions.digest(convert_to(snapshot,'UTF8'),'sha256'),'hex'),files,'proposed')
 on conflict(post_id) do update set archive_id=excluded.archive_id,revision=excluded.revision,kept_at=excluded.kept_at,snapshot=excluded.snapshot,snapshot_sha=excluded.snapshot_sha,files=excluded.files,state='proposed',restore_id=null,restore_targets=null,updated_at=now() returning * into a;
 delete from public.memory_archive_proofs where post_id=p_post;
 delete from orbit_private.memory_archive_jobs where post_id=p_post;
 return a;
end $$;

create or replace function public.queue_memory_archive(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_archive uuid,p_snapshot_sha text) returns public.memory_archives language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives;
begin
 if auth.uid() is distinct from p_expected_user or orbit_private.my_couple_id() is distinct from p_expected_couple or p_expected_couple is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if not found or item.author_id<>auth.uid() then raise exception 'ARCHIVE_OWNER_REQUIRED'; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 select * into a from public.memory_archives where post_id=p_post for update;
 if not found or a.archive_id is distinct from p_archive or a.snapshot_sha is distinct from p_snapshot_sha or a.revision<>item.archive_revision or a.kept_at is distinct from item.kept_at then raise exception 'ARCHIVE_CHANGED'; end if;
 if a.state in ('queued','removing','archived') then return a; end if;
 if not orbit_private.archive_exclusive(item) then raise exception 'MEDIA_USED_ELSEWHERE'; end if;
 if a.state<>'proposed' or item.cloud_state<>'online' or not orbit_private.archive_pair(item) or not orbit_private.archive_backups_ready(a) then raise exception 'ARCHIVE_NOT_READY'; end if;
 perform set_config('orbit.archive_write','on',true);
 update public.posts set cloud_state='queued' where id=item.id;
 update public.memory_archives set state='queued',updated_at=now() where post_id=item.id returning * into a;
 insert into orbit_private.memory_archive_jobs(post_id,archive_id) values(item.id,a.archive_id) on conflict(post_id) do update set archive_id=excluded.archive_id,token=null,lease_until=null,restore_owner=null,restored_files='{}';
 return a;
end $$;

create or replace function public.claim_memory_archives(p_post uuid default null,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; job orbit_private.memory_archive_jobs; result jsonb:='[]'; candidate record;
begin
 for candidate in select ar.post_id from public.memory_archives ar where ar.state in ('queued','removing') and (p_post is null or ar.post_id=p_post) order by ar.post_id limit 20 loop
  select * into item from public.posts where id=candidate.post_id for update skip locked;
  if not found then continue; end if;
  if p_actor is not null and not exists(select 1 from public.members where user_id=p_actor and couple_id=item.couple_id) then continue; end if;
  perform 1 from public.couples where id=item.couple_id for update;
  select * into a from public.memory_archives where post_id=item.id for update;
  select * into job from orbit_private.memory_archive_jobs where post_id=item.id for update;
  if job.post_id is null or a.state not in ('queued','removing') or (job.lease_until is not null and job.lease_until>now()) then continue; end if;
  perform set_config('orbit.archive_write','on',true);
  if a.state='queued' and (not orbit_private.archive_exclusive(item) or a.revision<>item.archive_revision or a.kept_at is distinct from item.kept_at or not orbit_private.archive_pair(item) or not orbit_private.archive_backups_ready(a)) then
   update public.posts set cloud_state='online' where id=item.id;
   update public.memory_archives set state='proposed',updated_at=now() where post_id=item.id;
   delete from orbit_private.memory_archive_jobs where post_id=item.id;
   continue;
  end if;
  update orbit_private.memory_archive_jobs set token=pg_catalog.gen_random_uuid(),lease_until=now()+interval '5 minutes' where post_id=item.id returning * into job;
  update public.memory_archives set state='removing',updated_at=now() where post_id=item.id;
  update public.posts set cloud_state='removing' where id=item.id;
  result:=result||jsonb_build_array(jsonb_build_object('post_id',item.id,'archive_id',a.archive_id,'token',job.token,'files',a.files));
 end loop;
 return result;
end $$;

create or replace function public.write_memory_side(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_kept_at timestamptz,p_version int,p_request uuid,p_side jsonb default null)
returns public.posts language plpgsql security definer set search_path='' as $$
declare root public.posts; own jsonb; other jsonb; result jsonb; prior orbit_private.memory_side_requests; fingerprint text; side_id uuid; kind text; body text; path text; thumb text; bytes bigint:=0; small bigint:=0; w int; h int; duration real; mime text; total bigint; used bigint; quota bigint; prefix text; lock_path text;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 if p_side is not null then
  for lock_path in select value from unnest(array[p_side->>'path',p_side->>'thumb_path']) value where value is not null order by value loop
   if not starts_with(lock_path,p_expected_couple::text||'/'||auth.uid()::text||'/') then raise exception 'INVALID_SIDE_PATH'; end if;
   perform pg_advisory_xact_lock(hashtextextended(lock_path,0));
  end loop;
 end if;
 select * into root from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if found and root.cloud_state<>'online' then raise exception 'RESTORE_BEFORE_EDITING'; end if;
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
   if not (own is not null and own->>'id'=side_id::text and own->>'kind'=kind and own->>'path'=path and (own->>'thumb_path') is not distinct from thumb) and (path is null or (kind='photo' and (path<>prefix||'.webp' or thumb is distinct from prefix||'_t.webp')) or (kind='voice' and (path not in (prefix||'.webm',prefix||'.ogg',prefix||'.m4a') or thumb is not null)) ) then raise exception 'INVALID_SIDE_PATH'; end if;
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
 select coalesce(sum(media_bytes::bigint+thumb_bytes+extra_media_bytes+extra_thumb_bytes+memory_bytes),0) into used from public.posts where couple_id=root.couple_id and keep and cloud_state in ('online','restoring') and id<>root.id;
 if used+root.media_bytes::bigint+root.thumb_bytes+root.extra_media_bytes+root.extra_thumb_bytes+total>quota then raise exception 'KEEPSAKE_QUOTA_EXCEEDED'; end if;
 update public.posts set memory_sides=result,memory_bytes=total where id=root.id returning * into root;
 insert into orbit_private.memory_side_requests values(root.id,auth.uid(),p_request,fingerprint,root.kept_at) on conflict(post_id,user_id) do update set request_id=excluded.request_id,digest=excluded.digest,kept_at=excluded.kept_at;
 return root;
end $$;
select pg_notify('pgrst','reload schema');
