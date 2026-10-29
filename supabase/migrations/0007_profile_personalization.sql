-- Preferences belong to the authenticated member; shared details stay on couples.
alter table public.members add column if not exists partner_nickname text
  check (partner_nickname is null or char_length(partner_nickname) <= 40);
alter table public.members add column if not exists theme_mode text not null default 'system'
  check (theme_mode in ('system','dark','light'));
alter table public.members add column if not exists theme_accent text not null default '#FF6B8A'
  check (theme_accent ~ '^#[0-9A-Fa-f]{6}$');
do $$ begin
  if not exists(select 1 from pg_constraint where conname='member_profile_bounds') then
    alter table public.members add constraint member_profile_bounds check (
      char_length(trim(display_name)) between 1 and 60
      and (nickname is null or char_length(nickname) <= 40)
      and color ~ '^#[0-9A-Fa-f]{6}$'
      and (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$')
    );
  end if;
end $$;
grant update(partner_nickname,theme_mode,theme_accent) on public.members to authenticated;
