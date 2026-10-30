alter table public.posts add column if not exists unsent_at timestamptz;
alter table public.posts add column if not exists media_width int;
alter table public.posts add column if not exists media_height int;
alter table public.posts add column if not exists waveform real[];
alter table public.posts drop constraint if exists post_media_shape;
alter table public.posts add constraint post_media_shape check (
 (media_width is null or media_width between 1 and 1600) and
 (media_height is null or media_height between 1 and 1600) and
 (media_duration_s is null or media_duration_s between 0.1 and 120) and
 (waveform is null or (coalesce(array_length(waveform,1),0)<=80 and
   array_position(waveform,null) is null and 0<=all(waveform) and 1>=all(waveform)))
);

-- Expired/unsent content disappears immediately; physical cleanup still uses Storage API.
alter policy po_select on public.posts using (
 couple_id=orbit_private.my_couple_id() and unsent_at is null and (keep or expires_at>now())
);
alter policy po_update_keep on public.posts using (
 couple_id=orbit_private.my_couple_id() and unsent_at is null
) with check (couple_id=orbit_private.my_couple_id() and unsent_at is null);
revoke delete on public.posts from authenticated;
alter policy co_select on public.comments using (
 couple_id=orbit_private.my_couple_id() and exists(select 1 from public.posts p where p.id=post_id)
);
alter policy co_insert on public.comments with check (
 author_id=auth.uid() and couple_id=orbit_private.my_couple_id() and
 exists(select 1 from public.posts p where p.id=post_id and p.channel='moment')
);
alter policy re_select on public.reactions using (
 couple_id=orbit_private.my_couple_id() and exists(select 1 from public.posts p where p.id=post_id)
);
alter policy re_insert on public.reactions with check (
 user_id=auth.uid() and couple_id=orbit_private.my_couple_id() and
 exists(select 1 from public.posts p where p.id=post_id)
);
drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select to authenticated using (
 bucket_id='media' and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and
 (exists(select 1 from public.posts p where p.media_path=storage.objects.name or p.thumb_path=storage.objects.name)
  or exists(select 1 from public.members m where m.avatar_path=storage.objects.name))
);
-- A failed/ambiguous client request must not remove a file already attached to a post/avatar.
drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated using (
 bucket_id='media' and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and
 (storage.foldername(name))[2]=auth.uid()::text and
 not exists(select 1 from public.posts p where p.media_path=storage.objects.name or p.thumb_path=storage.objects.name) and
 not exists(select 1 from public.members m where m.avatar_path=storage.objects.name)
);

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
 if p_post->>'kind' in ('text','mood') and length(btrim(coalesce(p_post->>'body','')))=0 then raise exception 'EMPTY_POST'; end if;
 if p_post->>'kind'='voice' and (p_post->>'duration' is null or (p_post->>'duration')::real not between 0.1 and 120) then raise exception 'INVALID_VOICE_DURATION'; end if;
 if p_post->>'place_id' is not null then
   select * into pin from public.places where id=(p_post->>'place_id')::uuid and couple_id=member.couple_id;
   if not found then raise exception 'INVALID_POST_PLACE'; end if;
 end if;
 insert into public.posts(id,couple_id,author_id,channel,kind,body,media_path,thumb_path,media_duration_s,media_width,media_height,waveform,ttl_hours,lat,lng)
 values(post_id,member.couple_id,auth.uid(),p_post->>'channel',p_post->>'kind',nullif(btrim(p_post->>'body'),''),p_post->>'media_path',p_post->>'thumb_path',
   (p_post->>'duration')::real,(p_post->>'width')::int,(p_post->>'height')::int,
   case when jsonb_typeof(p_post->'waveform')='array' then array(select jsonb_array_elements_text(p_post->'waveform'))::real[] else null end,
   (p_post->>'ttl_hours')::int,pin.lat,pin.lng) returning * into item;
 if coalesce((p_post->>'keep')::boolean,false) then
   update public.posts set keep=true where id=post_id returning * into item;
 end if;
 return item;
end $$;

create or replace function public.request_unsend(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare item public.posts; s text; u text;
begin
 if auth.uid() is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 select * into item from public.posts where id=p_id and couple_id=orbit_private.my_couple_id() for update;
 if not found then return false; end if;
 if item.author_id<>auth.uid() then raise exception 'UNSEND_AUTHOR_REQUIRED'; end if;
 if item.unsent_at is not null then return true; end if;
 if item.keep then update public.posts set keep=false where id=p_id; end if;
 update public.posts set unsent_at=now(),expires_at=now()-interval '1 second' where id=p_id;
 select decrypted_secret into s from vault.decrypted_secrets where name='orbit_fn_secret';
 select decrypted_secret into u from vault.decrypted_secrets where name='orbit_fn_base_url';
 if s is not null and u is not null then
   begin perform net.http_post(url:=u||'/retention',headers:=jsonb_build_object('Content-Type','application/json','x-orbit-secret',s),body:='{}'::jsonb,timeout_milliseconds:=10000);
   exception when others then null; end;
 end if;
 return true;
end $$;

create or replace function public.set_post_reaction(p_id uuid,p_emoji text default null) returns void
language plpgsql security definer set search_path='' as $$
declare item public.posts;
begin
 select * into item from public.posts where id=p_id and couple_id=orbit_private.my_couple_id()
   and unsent_at is null and (keep or expires_at>now()) for update;
 if not found or auth.uid() is null then raise exception 'POST_UNAVAILABLE'; end if;
 if p_emoji is not null and (char_length(p_emoji) not between 1 and 16) then raise exception 'INVALID_REACTION'; end if;
 delete from public.reactions where post_id=p_id and user_id=auth.uid();
 if p_emoji is not null then insert into public.reactions(post_id,couple_id,user_id,emoji) values(p_id,item.couple_id,auth.uid(),p_emoji); end if;
end $$;

create or replace function public.storage_summary() returns jsonb
language plpgsql security definer set search_path='' as $$
declare couple uuid; used bigint; kept bigint; quota bigint; files bigint; expiring bigint;
begin
 couple:=orbit_private.my_couple_id(); if couple is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 select coalesce(sum((metadata->>'size')::bigint),0),count(*) into used,files from storage.objects where bucket_id='media' and (storage.foldername(name))[1]=couple::text;
 select coalesce(sum(media_bytes::bigint+thumb_bytes::bigint) filter(where keep and unsent_at is null),0),
 count(*) filter(where not keep and unsent_at is null and expires_at>now() and expires_at<now()+interval '24 hours') into kept,expiring from public.posts where couple_id=couple;
 select keepsake_quota_mb::bigint*1024*1024 into quota from public.couples where id=couple;
 return jsonb_build_object('total_bytes',used,'files',files,'kept_bytes',kept,'quota_bytes',quota,'expiring_soon',expiring);
end $$;
revoke all on function public.create_shared_post(jsonb),public.request_unsend(uuid),public.set_post_reaction(uuid,text),public.storage_summary() from public,anon;
grant execute on function public.create_shared_post(jsonb),public.request_unsend(uuid),public.set_post_reaction(uuid,text),public.storage_summary() to authenticated;

drop policy if exists orbit_chat_read on realtime.messages;
create policy orbit_chat_read on realtime.messages for select to authenticated using (
 extension='presence' and (select realtime.topic())='chat:'||(select orbit_private.my_couple_id())::text
);
drop policy if exists orbit_chat_write on realtime.messages;
create policy orbit_chat_write on realtime.messages for insert to authenticated with check (
 extension='presence' and (select realtime.topic())='chat:'||(select orbit_private.my_couple_id())::text
);
