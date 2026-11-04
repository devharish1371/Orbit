-- Shared organization of existing keepsakes. No media duplication or automatic Keep.
create table public.memory_collections (
 id uuid primary key, couple_id uuid not null references public.couples(id) on delete cascade,
 created_by uuid not null references public.members(user_id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 64),
 tone text not null check(tone in ('iris','rose','tide','moss')),
 archived boolean not null default false, version int not null default 1 check(version>0),
 created_at timestamptz not null default now()
);
create unique index collection_active_name on public.memory_collections(couple_id,lower(btrim(name))) where not archived;
create table public.collection_posts (
 collection_id uuid not null references public.memory_collections(id) on delete cascade,
 post_id uuid not null references public.posts(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 added_by uuid not null references public.members(user_id) on delete cascade,
 kept_at timestamptz not null, added_at timestamptz not null default now(),
 primary key(collection_id,post_id)
);
create index collection_posts_post on public.collection_posts(post_id);
alter table public.memory_collections enable row level security;
alter table public.collection_posts enable row level security;
create policy collections_read on public.memory_collections for select to authenticated using(couple_id=orbit_private.my_couple_id());
create policy collection_posts_read on public.collection_posts for select to authenticated using(
 couple_id=orbit_private.my_couple_id() and exists(select 1 from public.posts p where p.id=post_id and p.keep and p.unsent_at is null and p.kept_at=collection_posts.kept_at)
 and exists(select 1 from public.memory_collections c where c.id=collection_id and c.couple_id=orbit_private.my_couple_id())
);
revoke all on public.memory_collections,public.collection_posts from public,anon,authenticated;
grant select on public.memory_collections,public.collection_posts to authenticated;
grant all on public.memory_collections,public.collection_posts to service_role;

create function public.save_memory_collection(p_expected_user uuid,p_expected_couple uuid,p_id uuid,p_version int,p_name text,p_tone text,p_archived boolean)
returns public.memory_collections language plpgsql security definer set search_path='' as $$
declare item public.memory_collections;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 if p_id is null or p_name is null or length(btrim(p_name)) not between 1 and 64 or p_tone is null or p_tone not in ('iris','rose','tide','moss') or p_archived is null then raise exception 'INVALID_COLLECTION'; end if;
 -- Serialize this collection before taking any row locks. Link operations use the same gate.
 perform pg_advisory_xact_lock(hashtextextended('collection:'||p_id::text,0));
 perform 1 from public.couples where id=p_expected_couple for update;
 select * into item from public.memory_collections where id=p_id for update;
 if found then
  if item.couple_id<>p_expected_couple or item.created_by<>auth.uid() then raise exception 'COLLECTION_OWNER_REQUIRED'; end if;
  if (p_version is null or p_version+1=item.version) and item.name=btrim(p_name) and item.tone=p_tone and item.archived=p_archived then return item; end if;
  if p_version is null or p_version<>item.version then raise exception 'COLLECTION_CHANGED'; end if;
  if item.archived and not p_archived and (select count(*) from public.memory_collections where couple_id=p_expected_couple and not archived)>=32 then raise exception 'COLLECTION_LIMIT'; end if;
  update public.memory_collections set name=btrim(p_name),tone=p_tone,archived=p_archived,version=version+1 where id=p_id returning * into item;
 else
  if p_version is not null then raise exception 'COLLECTION_UNAVAILABLE'; end if;
  if p_archived or (select count(*) from public.memory_collections where couple_id=p_expected_couple)>=128 or (select count(*) from public.memory_collections where couple_id=p_expected_couple and not archived)>=32 then raise exception 'COLLECTION_LIMIT'; end if;
  insert into public.memory_collections(id,couple_id,created_by,name,tone) values(p_id,p_expected_couple,auth.uid(),btrim(p_name),p_tone) returning * into item;
 end if;
 update public.couples set social_revision=social_revision+1 where id=p_expected_couple;
 return item;
end $$;

create function public.set_collection_post(p_expected_user uuid,p_expected_couple uuid,p_collection uuid,p_version int,p_post uuid,p_add boolean)
returns void language plpgsql security definer set search_path='' as $$
declare shelf public.memory_collections; item public.posts;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id() or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 if p_collection is null or p_post is null or p_version is null or p_add is null then raise exception 'INVALID_COLLECTION'; end if;
 perform pg_advisory_xact_lock(hashtextextended('collection:'||p_collection::text,0));
 -- Post-before-couple follows existing Keep/retention writes. It also serializes FK cleanup.
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for share;
 if not found then raise exception 'KEEPSAKE_UNAVAILABLE'; end if;
 perform 1 from public.couples where id=p_expected_couple for update;
 select * into shelf from public.memory_collections where id=p_collection and couple_id=p_expected_couple for share;
 if not found then raise exception 'COLLECTION_UNAVAILABLE'; end if;
 if p_version is distinct from shelf.version then raise exception 'COLLECTION_CHANGED'; end if;
 if shelf.archived then raise exception 'COLLECTION_ARCHIVED'; end if;
 if p_add then
  if not item.keep or item.unsent_at is not null or item.kept_at is null then raise exception 'KEEPSAKE_UNAVAILABLE'; end if;
  if not exists(select 1 from public.collection_posts where collection_id=p_collection and post_id=p_post) and (select count(*) from public.collection_posts where collection_id=p_collection)>=2000 then raise exception 'COLLECTION_ITEM_LIMIT'; end if;
  insert into public.collection_posts(collection_id,post_id,couple_id,added_by,kept_at)
  values(p_collection,p_post,p_expected_couple,auth.uid(),item.kept_at)
  on conflict(collection_id,post_id) do update set kept_at=excluded.kept_at,added_by=excluded.added_by,added_at=now()
  where public.collection_posts.kept_at is distinct from excluded.kept_at;
 else delete from public.collection_posts where collection_id=p_collection and post_id=p_post;
 end if;
 if found then update public.couples set social_revision=social_revision+1 where id=p_expected_couple; end if;
end $$;

create function public.memory_collections_index() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]'::jsonb) from (
  select c.*, (select count(*) from public.collection_posts cp where cp.collection_id=c.id) as kept_count
  from public.memory_collections c where c.couple_id=orbit_private.my_couple_id()
 ) q;
$$;
create function public.collection_keepsakes(p_collection uuid,p_before_created timestamptz default null,p_before_id uuid default null,p_photos boolean default false)
returns setof public.posts language plpgsql stable security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.memory_collections c where c.id=p_collection and not c.archived and c.couple_id=orbit_private.my_couple_id()) then raise exception 'COLLECTION_UNAVAILABLE'; end if;
 if (p_before_created is null)<>(p_before_id is null) or (p_before_created is not null and not isfinite(p_before_created)) or p_photos is null then raise exception 'INVALID_COLLECTION_CURSOR'; end if;
 return query select p.* from public.posts p join public.collection_posts cp on cp.post_id=p.id
 where cp.collection_id=p_collection and p.keep and p.unsent_at is null and p.kept_at=cp.kept_at
 and (not p_photos or p.kind='photo') and (p_before_id is null or (p.created_at,p.id)<(p_before_created,p_before_id))
 order by p.created_at desc,p.id desc limit 30;
end $$;
revoke all on function public.save_memory_collection(uuid,uuid,uuid,int,text,text,boolean),public.set_collection_post(uuid,uuid,uuid,int,uuid,boolean),public.memory_collections_index(),public.collection_keepsakes(uuid,timestamptz,uuid,boolean) from public,anon;
grant execute on function public.save_memory_collection(uuid,uuid,uuid,int,text,text,boolean),public.set_collection_post(uuid,uuid,uuid,int,uuid,boolean),public.memory_collections_index(),public.collection_keepsakes(uuid,timestamptz,uuid,boolean) to authenticated;
