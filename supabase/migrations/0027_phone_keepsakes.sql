-- Receipts describe verified private phone copies, never permission to remove cloud media.
alter table public.posts add column archive_revision int not null default 1 check(archive_revision>0);
create table public.keepsake_devices (
 user_id uuid primary key references public.members(user_id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 device_id uuid not null, enabled boolean not null, updated_at timestamptz not null default now()
);
create table public.keepsake_receipts (
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.members(user_id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 device_id uuid not null, revision int not null, bytes int not null check(bytes between 0 and 16777216),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), verified_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
alter table public.keepsake_devices enable row level security;
alter table public.keepsake_receipts enable row level security;
create policy kd_read on public.keepsake_devices for select to authenticated using(couple_id=orbit_private.my_couple_id());
create policy kr_read on public.keepsake_receipts for select to authenticated using(couple_id=orbit_private.my_couple_id());
revoke all on public.keepsake_devices,public.keepsake_receipts from public,anon,authenticated;
grant select on public.keepsake_devices,public.keepsake_receipts to authenticated;
grant all on public.keepsake_devices,public.keepsake_receipts to service_role;

create function public.set_keepsake_device(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_enabled boolean)
returns public.keepsake_devices language plpgsql security definer set search_path='' as $$
declare result public.keepsake_devices;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id()
 or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 if p_device is null or p_enabled is null then raise exception 'INVALID_DEVICE'; end if;
 insert into public.keepsake_devices(user_id,couple_id,device_id,enabled)
 values(auth.uid(),p_expected_couple,p_device,p_enabled)
 on conflict(user_id) do update set device_id=excluded.device_id,enabled=excluded.enabled,updated_at=now()
 returning * into result;
 delete from public.keepsake_receipts where user_id=auth.uid() and (device_id<>p_device or not p_enabled);
 return result;
end $$;
create function public.ack_keepsake_copy(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_post uuid,p_revision int,p_bytes int,p_sha256 text)
returns public.keepsake_receipts language plpgsql security definer set search_path='' as $$
declare item public.posts; device public.keepsake_devices; result public.keepsake_receipts;
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id()
 or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 select * into item from public.posts where id=p_post and couple_id=p_expected_couple for share;
 if not found or not item.keep or item.unsent_at is not null or p_revision is distinct from item.archive_revision then raise exception 'KEEPSAKE_CHANGED'; end if;
 select * into device from public.keepsake_devices where user_id=auth.uid() for share;
 if not found or not device.enabled or p_device is distinct from device.device_id then raise exception 'DEVICE_CHANGED'; end if;
 if p_bytes is distinct from item.media_bytes or p_bytes>16777216 or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_COPY'; end if;
 insert into public.keepsake_receipts(post_id,user_id,couple_id,device_id,revision,bytes,sha256)
 values(p_post,auth.uid(),p_expected_couple,p_device,p_revision,p_bytes,p_sha256)
 on conflict(post_id,user_id) do update set device_id=excluded.device_id,revision=excluded.revision,bytes=excluded.bytes,sha256=excluded.sha256,verified_at=now()
 returning * into result;
 return result;
end $$;
create function public.forget_keepsake_copy(p_expected_user uuid,p_expected_couple uuid,p_device uuid,p_post uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_expected_user is distinct from auth.uid() or p_expected_couple is distinct from orbit_private.my_couple_id()
 or orbit_private.my_couple_id() is null then raise exception 'ACCOUNT_CHANGED'; end if;
 delete from public.keepsake_receipts where user_id=auth.uid() and device_id=p_device and post_id=p_post;
end $$;
create function orbit_private.keepsake_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if new.keep is distinct from old.keep or new.unsent_at is distinct from old.unsent_at
 or new.media_path is distinct from old.media_path or new.body is distinct from old.body then
  new.archive_revision:=old.archive_revision+1;
 else new.archive_revision:=old.archive_revision;
 end if;
 return new;
end $$;
create function orbit_private.invalidate_keepsake_copies() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.keepsake_receipts where post_id=new.id;
 return null;
end $$;
create trigger trg_keepsake_revision before update on public.posts for each row execute function orbit_private.keepsake_revision();
create trigger trg_keepsake_invalidate after update on public.posts for each row when(old.archive_revision<>new.archive_revision) execute function orbit_private.invalidate_keepsake_copies();
revoke all on function public.set_keepsake_device(uuid,uuid,uuid,boolean),public.ack_keepsake_copy(uuid,uuid,uuid,uuid,int,int,text),public.forget_keepsake_copy(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.set_keepsake_device(uuid,uuid,uuid,boolean),public.ack_keepsake_copy(uuid,uuid,uuid,uuid,int,int,text),public.forget_keepsake_copy(uuid,uuid,uuid,uuid) to authenticated;
