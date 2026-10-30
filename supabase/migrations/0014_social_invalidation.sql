-- Uploaders can inspect their pending files; partners can read only referenced live media.
alter policy media_read on storage.objects using (
 bucket_id='media' and (storage.foldername(name))[1]=orbit_private.my_couple_id()::text and
 ((storage.foldername(name))[2]=auth.uid()::text or
  exists(select 1 from public.posts p where p.media_path=storage.objects.name or p.thumb_path=storage.objects.name) or
  exists(select 1 from public.members m where m.avatar_path=storage.objects.name))
);

-- RLS intentionally hides tombstones. Publish only a revision so partner clients can
-- invalidate an unsent/expired row without exposing that row in Realtime payloads.
alter table public.couples add column if not exists social_revision bigint not null default 0;
create or replace function orbit_private.bump_social_revision() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.couples set social_revision=social_revision+1 where id=case when tg_op='DELETE' then old.couple_id else new.couple_id end;
 return null;
end $$;
revoke all on function orbit_private.bump_social_revision() from public,anon,authenticated;
drop trigger if exists trg_social_posts on public.posts;
create trigger trg_social_posts after insert or update or delete on public.posts for each row execute function orbit_private.bump_social_revision();
drop trigger if exists trg_social_comments on public.comments;
create trigger trg_social_comments after insert or delete on public.comments for each row execute function orbit_private.bump_social_revision();
drop trigger if exists trg_social_reactions on public.reactions;
create trigger trg_social_reactions after insert or delete on public.reactions for each row execute function orbit_private.bump_social_revision();
