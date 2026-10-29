-- Keep the shared meeting URL behind RLS rather than in a public web bundle.
alter table public.couples add column if not exists meet_url text
  check (meet_url is null or meet_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$');
grant update(meet_url) on public.couples to authenticated;
