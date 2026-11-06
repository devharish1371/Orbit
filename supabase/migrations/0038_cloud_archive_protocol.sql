-- Archive removal is explicit, both-member and source-bound. No existing row is queued.
alter table public.posts add column cloud_state text not null default 'online' check(cloud_state in ('online','queued','removing','archived','restoring'));
alter table public.keepsake_devices add column protocol int not null default 1;
alter table public.keepsake_devices add column checked_at timestamptz;
create table public.memory_archives (
 post_id uuid primary key references public.posts(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 archive_id uuid not null unique, revision int not null, kept_at timestamptz not null,
 snapshot text not null, snapshot_sha text not null, files jsonb not null,
 state text not null check(state in ('proposed','queued','removing','archived','restoring','restore_cancelling','restored','cancelled')),
 restore_id uuid, restore_targets jsonb, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.memory_archive_proofs (
 post_id uuid not null references public.memory_archives(post_id) on delete cascade,
 user_id uuid not null references public.members(user_id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 archive_id uuid not null, device_id uuid not null, snapshot_sha text not null,
 zip_sha text not null, zip_bytes int not null check(zip_bytes between 1 and 16777216),
 files jsonb not null, approved boolean not null, verified_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
create table orbit_private.memory_archive_jobs (
 post_id uuid primary key references public.memory_archives(post_id) on delete cascade,
 archive_id uuid not null, token uuid, lease_until timestamptz,
 restore_owner uuid, restored_files jsonb not null default '{}'
);
revoke all on orbit_private.memory_archive_jobs from public,anon,authenticated;
alter table public.memory_archives enable row level security;
alter table public.memory_archive_proofs enable row level security;
create policy ma_read on public.memory_archives for select to authenticated using(couple_id=orbit_private.my_couple_id());
create policy map_read on public.memory_archive_proofs for select to authenticated using(couple_id=orbit_private.my_couple_id());
revoke all on public.memory_archives,public.memory_archive_proofs from public,anon,authenticated;
grant select on public.memory_archives,public.memory_archive_proofs to authenticated;
grant all on public.memory_archives,public.memory_archive_proofs to service_role;

create function orbit_private.memory_file_manifest(item public.posts) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('path',path,'bytes',bytes,'copy_id',copy_id) order by path),'[]') from (
 select distinct on(path) path,bytes,copy_id from (
  select item.media_path path,item.media_bytes bytes,item.id::text copy_id
  union all select item.thumb_path,item.thumb_bytes,null
  union all select value->>'path',(value->>'bytes')::int,case when ordinality=1 then item.id::text else item.id::text||':'||(value->>'id') end from jsonb_array_elements(item.photo_items) with ordinality
  union all select value->>'thumb_path',(value->>'thumb_bytes')::int,null from jsonb_array_elements(item.photo_items)
  union all select value->>'path',(value->>'bytes')::int,item.id::text||':'||(value->>'id') from jsonb_array_elements(item.memory_sides)
  union all select value->>'thumb_path',(value->>'thumb_bytes')::int,null from jsonb_array_elements(item.memory_sides)
 ) a where path is not null order by path,copy_id nulls last) b
$$;
revoke all on function orbit_private.memory_file_manifest(public.posts) from public,anon,authenticated;
create function public.confirm_copy_protocol(p_expected_user uuid,p_expected_couple uuid,p_device uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 update public.keepsake_devices set protocol=2,checked_at=now() where user_id=auth.uid() and couple_id=p_expected_couple and device_id=p_device and enabled;
 if not found then raise exception 'DEVICE_CHANGED'; end if;
end $$;
create function public.phone_copy_manifest(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_after uuid default null) returns setof public.posts language plpgsql security definer set search_path='' as $$
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 if not exists(select 1 from public.keepsake_devices where user_id=auth.uid() and device_id=p_device and enabled) then raise exception 'DEVICE_CHANGED'; end if;
 return query select p.* from public.posts p where p.couple_id=p_expected_couple and p.keep and p.unsent_at is null and (p_after is null or p.id>p_after) order by p.id limit 500;
end $$;
create function orbit_private.archive_pair(item public.posts) returns boolean language plpgsql security definer set search_path='' as $$
declare member record; source record; first_hash text; hash text; d public.keepsake_devices; n int:=0;
begin
 if not item.keep or item.unsent_at is not null then return false; end if;
 for member in select user_id from public.members where couple_id=item.couple_id order by user_id loop
  n:=n+1;select * into d from public.keepsake_devices where user_id=member.user_id for share;
  if not found or not d.enabled or d.protocol<>2 or d.checked_at is null or d.checked_at<now()-interval '15 minutes' or d.checked_at>now()+interval '1 minute' then return false; end if;
 end loop;
 if n<>2 then return false; end if;
 -- Every original, including zero-byte text sides, must have matching fresh receipts.
 for source in select item.id::text copy_id,item.media_bytes bytes
  union all select item.id::text||':'||(value->>'id'),(value->>'bytes')::int from jsonb_array_elements(item.photo_items) with ordinality where ordinality>1
  union all select item.id::text||':'||(value->>'id'),(value->>'bytes')::int from jsonb_array_elements(item.memory_sides) loop
  first_hash:=null;n:=0;
  for member in select user_id from public.members where couple_id=item.couple_id order by user_id loop
   select * into d from public.keepsake_devices where user_id=member.user_id;
   if source.copy_id=item.id::text then
    select r.sha256 into hash from public.keepsake_receipts r where r.post_id=item.id and r.user_id=member.user_id and r.device_id=d.device_id and r.revision=item.archive_revision and r.bytes=source.bytes and r.verified_at>=now()-interval '15 minutes' and r.verified_at<=now()+interval '1 minute';
   else
    select r.sha256 into hash from public.keepsake_asset_receipts r where r.post_id=item.id and r.asset_id=split_part(source.copy_id,':',2)::uuid and r.user_id=member.user_id and r.device_id=d.device_id and r.revision=item.archive_revision and r.bytes=source.bytes and r.verified_at>=now()-interval '15 minutes' and r.verified_at<=now()+interval '1 minute';
   end if;
   if hash is null or (first_hash is not null and hash<>first_hash) then return false; end if;
   first_hash:=hash;n:=n+1;
  end loop;
  if n<>2 then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function orbit_private.archive_pair(public.posts) from public,anon,authenticated;

create function public.prepare_memory_archive(p_expected_user uuid,p_expected_couple uuid,p_post uuid) returns public.memory_archives language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; identity uuid; snapshot text; files jsonb;
begin
 if auth.uid() is distinct from p_expected_user or orbit_private.my_couple_id() is distinct from p_expected_couple or p_expected_couple is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if not found or item.cloud_state<>'online' or not item.keep or item.unsent_at is not null then raise exception 'ARCHIVE_UNAVAILABLE'; end if;
 perform 1 from public.couples where id=item.couple_id for update;
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

create function public.approve_memory_archive(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_archive uuid,p_device uuid,p_snapshot_sha text,p_zip_sha text,p_zip_bytes int,p_files jsonb,p_independent_backup boolean)
returns public.memory_archive_proofs language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; file jsonb; proof jsonb; d public.keepsake_devices; result public.memory_archive_proofs; expected_hash text;
begin
 if auth.uid() is distinct from p_expected_user or orbit_private.my_couple_id() is distinct from p_expected_couple or p_expected_couple is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if not found or item.cloud_state<>'online' or not item.keep or item.unsent_at is not null then raise exception 'ARCHIVE_UNAVAILABLE'; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 select * into a from public.memory_archives where post_id=p_post for update;
 if not found or a.state<>'proposed' or a.archive_id is distinct from p_archive or a.snapshot_sha is distinct from p_snapshot_sha or a.revision<>item.archive_revision or a.kept_at<>item.kept_at then raise exception 'ARCHIVE_CHANGED'; end if;
 if p_independent_backup is distinct from true or p_zip_sha is null or p_zip_sha !~ '^[0-9a-f]{64}$' or p_zip_bytes is null or p_zip_bytes not between 1 and 16777216 or p_zip_bytes <= octet_length(a.snapshot)+(select coalesce(sum((value->>'bytes')::bigint),0) from jsonb_array_elements(a.files)) or not orbit_private.archive_pair(item) then raise exception 'BACKUP_REQUIRED'; end if;
 select * into d from public.keepsake_devices where user_id=auth.uid() and device_id=p_device and enabled and protocol=2 for share;
 if not found then raise exception 'DEVICE_CHANGED'; end if;
 if jsonb_typeof(p_files) is distinct from 'array' or jsonb_array_length(p_files)<>jsonb_array_length(a.files) then raise exception 'BACKUP_INCOMPLETE'; end if;
 for file in select value from jsonb_array_elements(a.files) loop
  if (select count(*) from jsonb_array_elements(p_files) where value->>'path'=file->>'path')<>1 then raise exception 'BACKUP_INCOMPLETE'; end if;
  select value into proof from jsonb_array_elements(p_files) where value->>'path'=file->>'path';
  if (proof->>'bytes')::int is distinct from (file->>'bytes')::int or proof->>'sha256' is null or proof->>'sha256' !~ '^[0-9a-f]{64}$' then raise exception 'BACKUP_INCOMPLETE'; end if;
  if file->>'copy_id' is not null then
   if file->>'copy_id'=item.id::text then select sha256 into expected_hash from public.keepsake_receipts where post_id=item.id and user_id=auth.uid();
   else select sha256 into expected_hash from public.keepsake_asset_receipts where post_id=item.id and user_id=auth.uid() and asset_id=split_part(file->>'copy_id',':',2)::uuid; end if;
   if expected_hash is distinct from proof->>'sha256' then raise exception 'BACKUP_HASH_MISMATCH'; end if;
  end if;
 end loop;
 insert into public.memory_archive_proofs values(item.id,auth.uid(),item.couple_id,a.archive_id,p_device,a.snapshot_sha,p_zip_sha,p_zip_bytes,p_files,true,now())
 on conflict(post_id,user_id) do update set archive_id=excluded.archive_id,device_id=excluded.device_id,snapshot_sha=excluded.snapshot_sha,zip_sha=excluded.zip_sha,zip_bytes=excluded.zip_bytes,files=excluded.files,approved=true,verified_at=now() returning * into result;
 return result;
end $$;

create function orbit_private.archive_backups_ready(a public.memory_archives) returns boolean language plpgsql security definer set search_path='' as $$
declare m record; proof public.memory_archive_proofs; d public.keepsake_devices; first_files jsonb; normalized jsonb; n int:=0;
begin
 for m in select user_id from public.members where couple_id=a.couple_id order by user_id loop
  select * into d from public.keepsake_devices where user_id=m.user_id and enabled and protocol=2;
  select * into proof from public.memory_archive_proofs where post_id=a.post_id and user_id=m.user_id;
  if proof.post_id is null or not proof.approved or proof.archive_id<>a.archive_id or proof.snapshot_sha<>a.snapshot_sha or proof.device_id is distinct from d.device_id or proof.verified_at<now()-interval '15 minutes' or proof.verified_at>now()+interval '1 minute' then return false; end if;
  select jsonb_agg(jsonb_build_object('path',value->>'path','bytes',(value->>'bytes')::int,'sha256',value->>'sha256') order by value->>'path') into normalized from jsonb_array_elements(proof.files);
  if first_files is not null and normalized<>first_files then return false; end if;
  first_files:=normalized;n:=n+1;
 end loop;
 return n=2;
end $$;
revoke all on function orbit_private.archive_backups_ready(public.memory_archives) from public,anon,authenticated;
create function public.archive_requirements(p_expected_user uuid,p_expected_couple uuid,p_post uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; pair boolean; backups boolean;
begin
 if auth.uid() is distinct from p_expected_user or orbit_private.my_couple_id() is distinct from p_expected_couple or p_expected_couple is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple;
 if not found then raise exception 'ARCHIVE_UNAVAILABLE'; end if;
 select * into a from public.memory_archives where post_id=p_post;
 pair:=orbit_private.archive_pair(item);backups:=a.post_id is not null and orbit_private.archive_backups_ready(a);
 return jsonb_build_object('phones',pair,'backups',backups,'current',coalesce(a.revision=item.archive_revision and a.kept_at=item.kept_at,false),'can_queue',coalesce(pair and backups and a.state='proposed' and a.revision=item.archive_revision and a.kept_at=item.kept_at and item.cloud_state='online' and item.author_id=auth.uid(),false),'owner',item.author_id=auth.uid());
end $$;
create function public.queue_memory_archive(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_archive uuid,p_snapshot_sha text) returns public.memory_archives language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives;
begin
 if auth.uid() is distinct from p_expected_user or orbit_private.my_couple_id() is distinct from p_expected_couple or p_expected_couple is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if not found or item.author_id<>auth.uid() then raise exception 'ARCHIVE_OWNER_REQUIRED'; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 select * into a from public.memory_archives where post_id=p_post for update;
 if not found or a.archive_id is distinct from p_archive or a.snapshot_sha is distinct from p_snapshot_sha or a.revision<>item.archive_revision or a.kept_at is distinct from item.kept_at then raise exception 'ARCHIVE_CHANGED'; end if;
 if a.state in ('queued','removing','archived') then return a; end if;
 if a.state<>'proposed' or item.cloud_state<>'online' or not orbit_private.archive_pair(item) or not orbit_private.archive_backups_ready(a) then raise exception 'ARCHIVE_NOT_READY'; end if;
 perform set_config('orbit.archive_write','on',true);
 update public.posts set cloud_state='queued' where id=item.id;
 update public.memory_archives set state='queued',updated_at=now() where post_id=item.id returning * into a;
 insert into orbit_private.memory_archive_jobs(post_id,archive_id) values(item.id,a.archive_id) on conflict(post_id) do update set archive_id=excluded.archive_id,token=null,lease_until=null,restore_owner=null,restored_files='{}';
 return a;
end $$;
create function public.cancel_memory_archive(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_archive uuid) returns void language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives;
begin
 if auth.uid() is distinct from p_expected_user or orbit_private.my_couple_id() is distinct from p_expected_couple or p_expected_couple is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if not found then raise exception 'ARCHIVE_UNAVAILABLE'; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 select * into a from public.memory_archives where post_id=p_post for update;
 if not found or a.archive_id is distinct from p_archive then raise exception 'ARCHIVE_CHANGED'; end if;
 if a.state='cancelled' then return; end if;
 if a.state not in ('proposed','queued') then raise exception 'REMOVAL_ALREADY_STARTED'; end if;
 perform set_config('orbit.archive_write','on',true);
 update public.posts set cloud_state='online' where id=item.id;
 update public.memory_archives set state='cancelled',updated_at=now() where post_id=item.id;
 delete from orbit_private.memory_archive_jobs where post_id=item.id;
 delete from public.memory_archive_proofs where post_id=item.id;
end $$;

create function public.claim_memory_archives(p_post uuid default null,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if a.state='queued' and (a.revision<>item.archive_revision or a.kept_at is distinct from item.kept_at or not orbit_private.archive_pair(item) or not orbit_private.archive_backups_ready(a)) then
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
create function public.finish_memory_archive(p_post uuid,p_archive uuid,p_token uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; job orbit_private.memory_archive_jobs;
begin
 select * into item from public.posts where id=p_post for update;
 if not found then return false; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 select * into a from public.memory_archives where post_id=p_post for update;
 select * into job from orbit_private.memory_archive_jobs where post_id=p_post for update;
 if a.state is distinct from 'removing' or a.archive_id is distinct from p_archive or job.token is distinct from p_token or p_token is null or job.lease_until<now() or item.archive_revision<>a.revision then return false; end if;
 if exists(select 1 from storage.objects o where o.bucket_id='media' and a.files @> jsonb_build_array(jsonb_build_object('path',o.name))) then return false; end if;
 perform set_config('orbit.archive_write','on',true);
 update public.posts set cloud_state='archived' where id=p_post;
 update public.memory_archives set state='archived',updated_at=now() where post_id=p_post;
 update orbit_private.memory_archive_jobs set token=null,lease_until=null where post_id=p_post;
 return true;
end $$;

-- A restore receives new paths. Late old-generation deletes can never erase restored media.
create function public.begin_memory_restore(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_archive uuid,p_snapshot_sha text) returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; job orbit_private.memory_archive_jobs; generation uuid; file jsonb; targets jsonb:='[]'; hash text; idx int:=0; target text; quota bigint; used bigint;
begin
 if auth.uid() is distinct from p_expected_user or orbit_private.my_couple_id() is distinct from p_expected_couple or p_expected_couple is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for update;
 if not found then raise exception 'ARCHIVE_UNAVAILABLE'; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 select * into a from public.memory_archives where post_id=p_post for update;
 select * into job from orbit_private.memory_archive_jobs where post_id=p_post for update;
 if not found or a.archive_id is distinct from p_archive or a.snapshot_sha is distinct from p_snapshot_sha then raise exception 'WRONG_BACKUP'; end if;
 if a.state='restoring' then
  if job.restore_owner is distinct from auth.uid() then raise exception 'RESTORE_BUSY'; end if;
  return jsonb_build_object('restore_id',a.restore_id,'targets',a.restore_targets);
 end if;
 if a.state<>'archived' then raise exception 'ARCHIVE_UNAVAILABLE'; end if;
 select keepsake_quota_mb::bigint*1048576 into quota from public.couples where id=item.couple_id;
 select coalesce(sum(media_bytes::bigint+thumb_bytes+extra_media_bytes+extra_thumb_bytes+memory_bytes),0) into used from public.posts where couple_id=item.couple_id and keep and cloud_state in ('online','restoring');
 if used+item.media_bytes::bigint+item.thumb_bytes+item.extra_media_bytes+item.extra_thumb_bytes+item.memory_bytes>quota then raise exception 'KEEPSAKE_QUOTA_EXCEEDED'; end if;
 generation:=pg_catalog.gen_random_uuid();
 for file in select value from jsonb_array_elements(a.files) loop
  select f->>'sha256' into hash from public.memory_archive_proofs p cross join lateral jsonb_array_elements(p.files) f where p.post_id=item.id and p.archive_id=a.archive_id and f->>'path'=file->>'path' order by p.user_id limit 1;
  if hash is null then raise exception 'BACKUP_PROOF_MISSING'; end if;
  target:=item.couple_id::text||'/'||split_part(file->>'path','/',2)||'/'||item.id::text||'_restore_'||generation::text||'_'||idx::text||'.'||substring(file->>'path' from '\.([a-z0-9]+)$');
  if target is null or target !~ '^[a-z0-9/_.-]+$' then raise exception 'INVALID_RESTORE_PATH'; end if;
  targets:=targets||jsonb_build_array(jsonb_build_object('source',file->>'path','path',target,'bytes',(file->>'bytes')::int,'sha256',hash));idx:=idx+1;
 end loop;
 perform set_config('orbit.archive_write','on',true);
 update public.posts set cloud_state='restoring' where id=item.id;
 update public.memory_archives set state='restoring',restore_id=generation,restore_targets=targets,updated_at=now() where post_id=item.id;
 update orbit_private.memory_archive_jobs set restore_owner=auth.uid(),restored_files='{}' where post_id=item.id;
 return jsonb_build_object('restore_id',generation,'targets',targets);
end $$;
create function public.memory_restore_asset(p_actor uuid,p_post uuid,p_restore uuid,p_source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.memory_archives; target jsonb; job orbit_private.memory_archive_jobs;
begin
 select * into a from public.memory_archives where post_id=p_post and restore_id=p_restore and state='restoring';
 if not found or not exists(select 1 from public.members where user_id=p_actor and couple_id=a.couple_id) then raise exception 'RESTORE_UNAVAILABLE'; end if;
 select * into job from orbit_private.memory_archive_jobs where post_id=p_post;
 if job.restore_owner is distinct from p_actor then raise exception 'RESTORE_UNAVAILABLE'; end if;
 select value into target from jsonb_array_elements(a.restore_targets) where value->>'source'=p_source;
 if target is null then raise exception 'RESTORE_UNAVAILABLE'; end if;
 return target;
end $$;
create function public.ack_memory_restore_asset(p_actor uuid,p_post uuid,p_restore uuid,p_source text,p_sha256 text) returns void language plpgsql security definer set search_path='' as $$
declare target jsonb;
begin
 target:=public.memory_restore_asset(p_actor,p_post,p_restore,p_source);
 if target->>'sha256' is distinct from p_sha256 then raise exception 'RESTORE_HASH_MISMATCH'; end if;
 update orbit_private.memory_archive_jobs set restored_files=restored_files||jsonb_build_object(p_source,p_sha256) where post_id=p_post;
end $$;

create function orbit_private.restore_path(targets jsonb,source text) returns text language plpgsql immutable set search_path='' as $$
declare result text;
begin
 if source is null then return null; end if;
 select value->>'path' into result from jsonb_array_elements(targets) where value->>'source'=source;
 if result is null then raise exception 'RESTORE_INCOMPLETE'; end if;
 return result;
end $$;
revoke all on function orbit_private.restore_path(jsonb,text) from public,anon,authenticated;
create function public.finish_memory_restore(p_actor uuid,p_post uuid,p_restore uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; job orbit_private.memory_archive_jobs; target jsonb; photos jsonb; sides jsonb;
begin
 select * into item from public.posts where id=p_post for update;
 if not found or not exists(select 1 from public.members where user_id=p_actor and couple_id=item.couple_id) then return false; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 select * into a from public.memory_archives where post_id=p_post for update;
 select * into job from orbit_private.memory_archive_jobs where post_id=p_post for update;
 if a.state is distinct from 'restoring' or a.restore_id is distinct from p_restore or job.restore_owner is distinct from p_actor then return false; end if;
 for target in select value from jsonb_array_elements(a.restore_targets) loop
  if job.restored_files->>(target->>'source') is distinct from target->>'sha256' or not exists(select 1 from storage.objects where bucket_id='media' and name=target->>'path' and (metadata->>'size')::int=(target->>'bytes')::int) then return false; end if;
 end loop;
 select coalesce(jsonb_agg(value||jsonb_build_object('path',orbit_private.restore_path(a.restore_targets,value->>'path'),'thumb_path',orbit_private.restore_path(a.restore_targets,value->>'thumb_path')) order by ordinality),'[]') into photos from jsonb_array_elements(item.photo_items) with ordinality;
 select coalesce(jsonb_agg(value||jsonb_build_object('path',orbit_private.restore_path(a.restore_targets,value->>'path'),'thumb_path',orbit_private.restore_path(a.restore_targets,value->>'thumb_path')) order by ordinality),'[]') into sides from jsonb_array_elements(item.memory_sides) with ordinality;
 perform set_config('orbit.archive_write','on',true);
 update public.posts set media_path=orbit_private.restore_path(a.restore_targets,item.media_path),thumb_path=orbit_private.restore_path(a.restore_targets,item.thumb_path),photo_items=photos,memory_sides=sides,cloud_state='online' where id=item.id;
 update public.memory_archives set state='restored',updated_at=now() where post_id=item.id;
 update orbit_private.memory_archive_jobs set restore_owner=null,restored_files='{}' where post_id=item.id;
 return true;
end $$;
create function public.cancel_memory_restore(p_actor uuid,p_post uuid,p_restore uuid,p_finish boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.posts; a public.memory_archives; job orbit_private.memory_archive_jobs;
begin
 select * into item from public.posts where id=p_post for update;
 if not found or not exists(select 1 from public.members where user_id=p_actor and couple_id=item.couple_id) then raise exception 'RESTORE_UNAVAILABLE'; end if;
 perform 1 from public.couples where id=item.couple_id for update;
 select * into a from public.memory_archives where post_id=p_post for update;
 select * into job from orbit_private.memory_archive_jobs where post_id=p_post for update;
 if a.state not in ('restoring','restore_cancelling') or a.restore_id is distinct from p_restore or job.restore_owner is distinct from p_actor then raise exception 'RESTORE_UNAVAILABLE'; end if;
 if not p_finish then
  update public.memory_archives set state='restore_cancelling',updated_at=now() where post_id=p_post;
  return a.restore_targets;
 end if;
 if a.state<>'restore_cancelling' or exists(select 1 from storage.objects o where o.bucket_id='media' and a.restore_targets @> jsonb_build_array(jsonb_build_object('path',o.name))) then raise exception 'RESTORE_CLEANUP_PENDING'; end if;
 perform set_config('orbit.archive_write','on',true);
 update public.posts set cloud_state='archived' where id=p_post;
 update public.memory_archives set state='archived',restore_id=null,restore_targets=null,updated_at=now() where post_id=p_post;
 update orbit_private.memory_archive_jobs set restore_owner=null,restored_files='{}' where post_id=p_post;
 return '[]'::jsonb;
end $$;

create function orbit_private.guard_archive_post() returns trigger language plpgsql set search_path='' as $$
begin
 if old.cloud_state<>'online' and current_setting('orbit.archive_write',true) is distinct from 'on' then raise exception 'RESTORE_BEFORE_EDITING'; end if;
 return new;
end $$;
create trigger trg_archive_guard before update on public.posts for each row execute function orbit_private.guard_archive_post();
revoke all on function orbit_private.guard_archive_post() from public,anon,authenticated;
create function orbit_private.archive_file_protected(p_path text) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is not null and split_part(p_path,'/',1) is distinct from orbit_private.my_couple_id()::text then return false; end if;
 return exists(select 1 from public.memory_archives a where a.state in ('queued','removing','archived','restoring','restore_cancelling') and (
 a.files @> jsonb_build_array(jsonb_build_object('path',p_path)) or a.restore_targets @> jsonb_build_array(jsonb_build_object('path',p_path))));
end $$;
revoke all on function orbit_private.archive_file_protected(text) from public,anon;
grant execute on function orbit_private.archive_file_protected(text) to authenticated;
alter policy media_insert on storage.objects with check (
 bucket_id='media' and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and (storage.foldername(name))[2]=auth.uid()::text and not orbit_private.archive_file_protected(name)
);
alter policy po_select on public.posts using(couple_id=orbit_private.my_couple_id() and unsent_at is null and (keep or expires_at>now()) and cloud_state='online');
alter policy po_update_keep on public.posts using(couple_id=orbit_private.my_couple_id() and unsent_at is null and cloud_state='online') with check(couple_id=orbit_private.my_couple_id() and unsent_at is null and cloud_state='online');
create trigger trg_archive_social after insert or update or delete on public.memory_archives for each row execute function orbit_private.bump_social_revision();
create trigger trg_archive_proof_social after insert or update or delete on public.memory_archive_proofs for each row execute function orbit_private.bump_social_revision();

revoke all on function public.confirm_copy_protocol(uuid,uuid,uuid),public.phone_copy_manifest(uuid,uuid,uuid,uuid),public.prepare_memory_archive(uuid,uuid,uuid),public.approve_memory_archive(uuid,uuid,uuid,uuid,uuid,text,text,int,jsonb,boolean),public.archive_requirements(uuid,uuid,uuid),public.queue_memory_archive(uuid,uuid,uuid,uuid,text),public.cancel_memory_archive(uuid,uuid,uuid,uuid),public.begin_memory_restore(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.confirm_copy_protocol(uuid,uuid,uuid),public.phone_copy_manifest(uuid,uuid,uuid,uuid),public.prepare_memory_archive(uuid,uuid,uuid),public.approve_memory_archive(uuid,uuid,uuid,uuid,uuid,text,text,int,jsonb,boolean),public.archive_requirements(uuid,uuid,uuid),public.queue_memory_archive(uuid,uuid,uuid,uuid,text),public.cancel_memory_archive(uuid,uuid,uuid,uuid),public.begin_memory_restore(uuid,uuid,uuid,uuid,text) to authenticated;
revoke all on function public.claim_memory_archives(uuid,uuid),public.finish_memory_archive(uuid,uuid,uuid),public.memory_restore_asset(uuid,uuid,uuid,text),public.ack_memory_restore_asset(uuid,uuid,uuid,text,text),public.finish_memory_restore(uuid,uuid,uuid),public.cancel_memory_restore(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_memory_archives(uuid,uuid),public.finish_memory_archive(uuid,uuid,uuid),public.memory_restore_asset(uuid,uuid,uuid,text),public.ack_memory_restore_asset(uuid,uuid,uuid,text,text),public.finish_memory_restore(uuid,uuid,uuid),public.cancel_memory_restore(uuid,uuid,uuid,boolean) to service_role;


create or replace function orbit_private.posts_keep_change() returns trigger language plpgsql security definer set search_path='' as $$
declare used bigint; q int; d int;
begin
 select keepsake_quota_mb,retention_days into q,d from public.couples where id=new.couple_id for update;
 if old.deleting_at is not null then raise exception 'POST_CLEANUP_IN_PROGRESS'; end if;
 if new.keep then
  select coalesce(sum(media_bytes::bigint+thumb_bytes::bigint+extra_media_bytes::bigint+extra_thumb_bytes::bigint+memory_bytes::bigint),0) into used from public.posts where couple_id=new.couple_id and keep and cloud_state in ('online','restoring') and id<>new.id;
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
 select coalesce(sum(media_bytes::bigint+thumb_bytes::bigint+extra_media_bytes::bigint+extra_thumb_bytes::bigint+memory_bytes::bigint) filter(where keep and unsent_at is null and cloud_state in ('online','restoring')),0),count(*) filter(where not keep and unsent_at is null and expires_at>now() and expires_at<now()+interval '24 hours') into kept,expiring from public.posts where couple_id=couple;
 select keepsake_quota_mb::bigint*1048576 into quota from public.couples where id=couple;
 return jsonb_build_object('total_bytes',used,'files',files,'kept_bytes',kept,'quota_bytes',quota,'expiring_soon',expiring);
end $$;

create or replace function public.claim_orphan_media(p_paths text[]) returns setof text language plpgsql security definer set search_path='' as $$
declare p text;
begin
 for p in select distinct unnest(p_paths) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended(p,0));
  if not orbit_private.archive_file_protected(p) and exists(select 1 from storage.objects where bucket_id='media' and name=p and created_at<now()-interval '24 hours')
  and not exists(select 1 from public.posts where media_path=p or thumb_path=p or (photo_items @> jsonb_build_array(jsonb_build_object('path',p)) or memory_sides @> jsonb_build_array(jsonb_build_object('path',p))) or (photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',p)) or memory_sides @> jsonb_build_array(jsonb_build_object('thumb_path',p))))
  and not exists(select 1 from public.members where avatar_path=p)
  and not exists(select 1 from public.media_gc where path=p and claimed_at>now()-interval '10 minutes') then
   insert into public.media_gc(path) values(p) on conflict(path) do update set claimed_at=now(); return next p;
  end if;
 end loop;
end $$;

alter policy media_delete on storage.objects using (
 bucket_id='media' and not orbit_private.archive_file_protected(name) and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and (storage.foldername(name))[2]=auth.uid()::text
 and not exists(select 1 from public.posts p where p.media_path=storage.objects.name or p.thumb_path=storage.objects.name or (p.photo_items @> jsonb_build_array(jsonb_build_object('path',storage.objects.name)) or p.memory_sides @> jsonb_build_array(jsonb_build_object('path',storage.objects.name))) or (p.photo_items @> jsonb_build_array(jsonb_build_object('thumb_path',storage.objects.name)) or p.memory_sides @> jsonb_build_array(jsonb_build_object('thumb_path',storage.objects.name))))
 and not exists(select 1 from public.members m where m.avatar_path=storage.objects.name)
);

create or replace function public.write_memory_side(p_expected_user uuid,p_expected_couple uuid,p_post uuid,p_kept_at timestamptz,p_version int,p_request uuid,p_side jsonb default null)
returns public.posts language plpgsql security definer set search_path='' as $$
declare root public.posts; own jsonb; other jsonb; result jsonb; prior orbit_private.memory_side_requests; fingerprint text; side_id uuid; kind text; body text; path text; thumb text; bytes bigint:=0; small bigint:=0; w int; h int; duration real; mime text; total bigint; used bigint; quota bigint; prefix text;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
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

create or replace function public.set_keepsake_device(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_enabled boolean)
returns public.keepsake_devices language plpgsql security definer set search_path='' as $$
declare result public.keepsake_devices;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id()
 or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 if p_device is null or p_enabled is null then raise exception 'INVALID_DEVICE'; end if;
 insert into public.keepsake_devices(user_id,couple_id,device_id,enabled)
 values(auth.uid(),p_expected_couple,p_device,p_enabled)
 on conflict(user_id) do update set device_id=excluded.device_id,enabled=excluded.enabled,updated_at=now(),protocol=1,checked_at=null
 returning * into result;
 delete from public.keepsake_receipts where user_id=auth.uid() and (device_id<>p_device or not p_enabled);
 return result;
end $$;

create or replace function public.ack_keepsake_copy(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_post uuid,p_revision int,p_bytes int,p_sha256 text)
returns public.keepsake_receipts language plpgsql security definer set search_path='' as $$
declare item public.posts; device public.keepsake_devices; result public.keepsake_receipts;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id()
 or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for share;
 if not found or not item.keep or item.unsent_at is not null or p_revision is distinct from item.archive_revision then raise exception 'KEEPSAKE_CHANGED'; end if;
 update public.keepsake_devices set protocol=1,checked_at=null where user_id=auth.uid();
 select * into device from public.keepsake_devices where user_id=auth.uid() for share;
 if not found or not device.enabled or p_device is distinct from device.device_id then raise exception 'DEVICE_CHANGED'; end if;
 if p_bytes is distinct from item.media_bytes or p_bytes>16777216 or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_COPY'; end if;
 insert into public.keepsake_receipts(post_id,user_id,couple_id,device_id,revision,bytes,sha256)
 values(p_post,auth.uid(),p_expected_couple,p_device,p_revision,p_bytes,p_sha256)
 on conflict(post_id,user_id) do update set device_id=excluded.device_id,revision=excluded.revision,bytes=excluded.bytes,sha256=excluded.sha256,verified_at=now()
 returning * into result;
 return result;
end $$;

create or replace function public.ack_keepsake_asset(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_post uuid,p_asset uuid,p_revision int,p_bytes int,p_sha256 text)
returns void language plpgsql security definer set search_path='' as $$
declare item public.posts; device public.keepsake_devices; asset jsonb;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for share;
 if not found or not item.keep or item.unsent_at is not null or p_revision is distinct from item.archive_revision then raise exception 'KEEPSAKE_CHANGED'; end if;
 select value into asset from (select value from jsonb_array_elements(item.photo_items) with ordinality where ordinality>1 union all select value from jsonb_array_elements(item.memory_sides)) a where value->>'id'=p_asset::text;
 if asset is null or p_bytes is distinct from (asset->>'bytes')::int or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_COPY'; end if;
 update public.keepsake_devices set protocol=1,checked_at=null where user_id=auth.uid();
 select * into device from public.keepsake_devices where user_id=auth.uid() for share;
 if not found or not device.enabled or p_device is distinct from device.device_id then raise exception 'DEVICE_CHANGED'; end if;
 insert into public.keepsake_asset_receipts(post_id,asset_id,user_id,couple_id,device_id,revision,bytes,sha256) values(p_post,p_asset,auth.uid(),p_expected_couple,p_device,p_revision,p_bytes,p_sha256)
 on conflict(post_id,user_id,asset_id) do update set device_id=excluded.device_id,revision=excluded.revision,bytes=excluded.bytes,sha256=excluded.sha256,verified_at=now();
end $$;
select pg_notify('pgrst','reload schema');
