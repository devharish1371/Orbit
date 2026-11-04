-- A stale picker cannot organize a later Keep of the same post.
drop function public.set_collection_post(uuid,uuid,uuid,int,uuid,boolean);
create function public.set_collection_post(p_expected_user uuid,p_expected_couple uuid,p_collection uuid,p_version int,p_post uuid,p_kept_at timestamptz,p_add boolean)
returns void language plpgsql security definer set search_path='' as $$
declare shelf public.memory_collections; item public.posts;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 if p_collection is null or p_post is null or p_version is null or p_add is null or p_kept_at is null then raise exception 'INVALID_COLLECTION'; end if;
 perform pg_advisory_xact_lock(hashtextextended('collection:'||p_collection::text,0));
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for share;
 if not found then raise exception 'KEEPSAKE_UNAVAILABLE'; end if;
 if item.kept_at is distinct from p_kept_at then raise exception 'KEEPSAKE_CHANGED'; end if;
 perform 1 from public.couples where id=p_expected_couple for update;
 select * into shelf from public.memory_collections where id=p_collection and couple_id=p_expected_couple for share;
 if not found then raise exception 'COLLECTION_UNAVAILABLE'; end if;
 if p_version is distinct from shelf.version then raise exception 'COLLECTION_CHANGED'; end if;
 if shelf.archived then raise exception 'COLLECTION_ARCHIVED'; end if;
 if p_add then
  if not item.keep or item.unsent_at is not null then raise exception 'KEEPSAKE_UNAVAILABLE'; end if;
  if not exists(select 1 from public.collection_posts where collection_id=p_collection and post_id=p_post) and (select count(*) from public.collection_posts where collection_id=p_collection)>=2000 then raise exception 'COLLECTION_ITEM_LIMIT'; end if;
  insert into public.collection_posts(collection_id,post_id,couple_id,added_by,kept_at)
  values(p_collection,p_post,p_expected_couple,auth.uid(),item.kept_at)
  on conflict(collection_id,post_id) do update set kept_at=excluded.kept_at,added_by=excluded.added_by,added_at=now()
  where public.collection_posts.kept_at is distinct from excluded.kept_at;
 else delete from public.collection_posts where collection_id=p_collection and post_id=p_post;
 end if;
 if found then update public.couples set social_revision=social_revision+1 where id=p_expected_couple; end if;
end $$;
revoke all on function public.set_collection_post(uuid,uuid,uuid,int,uuid,timestamptz,boolean) from public,anon;
grant execute on function public.set_collection_post(uuid,uuid,uuid,int,uuid,timestamptz,boolean) to authenticated;
