insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media','media', false, 5242880,
  array['image/webp','image/jpeg','image/png','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types, public = false;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = orbit_private.my_couple_id()::text);

drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media'
    and (storage.foldername(name))[1] = orbit_private.my_couple_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media'
    and (storage.foldername(name))[1] = orbit_private.my_couple_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text);
-- no update policy: files are immutable
