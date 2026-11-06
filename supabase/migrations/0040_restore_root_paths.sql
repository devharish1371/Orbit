-- Root references preserve their author and ID, with an isolated restore generation.
alter table public.posts drop constraint media_uuid_path;
alter table public.posts drop constraint thumb_uuid_path;
alter table public.posts add constraint media_uuid_path check(media_path is null or media_path ~ ('^'||couple_id||'/'||author_id||'/'||id||'(_restore_[0-9a-f-]{36}_[0-9]{1,2})?\.(webp|jpg|jpeg|png|webm|ogg|m4a|mp4|mp3|aac)$'));
alter table public.posts add constraint thumb_uuid_path check(thumb_path is null or thumb_path=couple_id||'/'||author_id||'/'||id||'_t.webp' or thumb_path ~ ('^'||couple_id||'/'||author_id||'/'||id||'_restore_[0-9a-f-]{36}_[0-9]{1,2}\.webp$'));
-- Service uploads need the exact original MIME, never a caller supplied value.
create or replace function public.memory_restore_asset(p_actor uuid,p_post uuid,p_restore uuid,p_source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.memory_archives; target jsonb; job orbit_private.memory_archive_jobs; mime text;
begin
 select * into a from public.memory_archives where post_id=p_post and restore_id=p_restore and state='restoring';
 if not found or not exists(select 1 from public.members where user_id=p_actor and couple_id=a.couple_id) then raise exception 'RESTORE_UNAVAILABLE'; end if;
 select * into job from orbit_private.memory_archive_jobs where post_id=p_post;
 if job.restore_owner is distinct from p_actor then raise exception 'RESTORE_UNAVAILABLE'; end if;
 select value into target from jsonb_array_elements(a.restore_targets) where value->>'source'=p_source;
 select value->>'mime' into mime from jsonb_array_elements(a.files) where value->>'path'=p_source;
 if target is null or mime is null then raise exception 'RESTORE_UNAVAILABLE'; end if;
 return target||jsonb_build_object('mime',mime);
end $$;
select pg_notify('pgrst','reload schema');
