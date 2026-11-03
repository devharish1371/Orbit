-- One shared, temporary pointer. Pinning never changes Keep or message expiry.
create table public.chat_pins (
 couple_id uuid primary key references public.couples(id) on delete cascade,
 post_id uuid not null,
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 foreign key(post_id,couple_id) references public.posts(id,couple_id) on delete cascade
);
alter table public.chat_pins enable row level security;
grant select on public.chat_pins to authenticated;
create policy chat_pin_read on public.chat_pins for select to authenticated using (
 couple_id=orbit_private.my_couple_id() and expires_at>now()
 and exists(select 1 from public.posts p where p.id=post_id and p.channel='chat')
);
create trigger trg_social_chat_pins after insert or update or delete on public.chat_pins
 for each row execute function orbit_private.bump_social_revision();

create or replace function public.set_chat_pin(p_post_id uuid,p_remove boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare couple uuid:=orbit_private.my_couple_id(); item public.posts;
begin
 if auth.uid() is null or couple is null then raise exception 'MEMBERSHIP_REQUIRED'; end if;
 if p_remove then
   -- A stale close action cannot remove a different pin installed by the partner.
   delete from public.chat_pins where couple_id=couple and post_id=p_post_id;
   return;
 end if;
 select * into item from public.posts where id=p_post_id and couple_id=couple and channel='chat'
   and unsent_at is null and (keep or expires_at>now()) for update;
 if not found then raise exception 'PIN_UNAVAILABLE'; end if;
 insert into public.chat_pins(couple_id,post_id,created_by,created_at,expires_at)
 values(couple,item.id,auth.uid(),now(),least(now()+interval '24 hours',coalesce(item.expires_at,now()+interval '24 hours')))
 on conflict(couple_id) do update set post_id=excluded.post_id,created_by=excluded.created_by,
 created_at=excluded.created_at,expires_at=excluded.expires_at;
end $$;
revoke all on function public.set_chat_pin(uuid,boolean) from public,anon;
grant execute on function public.set_chat_pin(uuid,boolean) to authenticated;
select pg_notify('pgrst','reload schema');
