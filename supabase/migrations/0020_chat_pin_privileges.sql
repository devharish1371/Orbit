-- Override hosted-schema default privileges: all pin writes go through the scoped RPC.
revoke all on public.chat_pins from public,anon,authenticated;
grant select on public.chat_pins to authenticated;
