-- Lock down anon completely
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

do $$ declare t text; begin
  foreach t in array array['couples','members','live_location','location_history','daily_summary',
    'places','place_presence','events','posts','comments','reactions','capsules',
    'question_answers','device_tokens','retention_runs','_migrations'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop; end $$;

-- helper: drop-and-create keeps this migration re-runnable
create or replace procedure public._policy(tbl text, pname text, ddl text)
language plpgsql as $$ begin
  execute format('drop policy if exists %I on public.%I', pname, tbl);
  execute ddl; end $$;

-- Explicit privileges: RLS does not protect TRUNCATE or schema-level privileges.
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;
alter default privileges in schema public revoke all on tables from authenticated;
grant select on public.couples, public.members, public.live_location, public.location_history, public.daily_summary, public.places, public.place_presence, public.events, public.posts, public.comments, public.reactions, public.capsules, public.question_answers, public.device_tokens, public.retention_runs to authenticated;
grant insert on public.live_location, public.location_history, public.places, public.place_presence, public.events, public.posts, public.comments, public.reactions, public.capsules, public.question_answers, public.device_tokens to authenticated;
grant update on public.live_location, public.places, public.place_presence, public.device_tokens to authenticated;
grant delete on public.places, public.place_presence, public.posts, public.comments, public.reactions, public.capsules, public.device_tokens to authenticated;
grant update (name, anniversary, timezone, retention_days, keepsake_quota_mb) on public.couples to authenticated;
grant usage on sequence public.location_history_id_seq to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- couples
call public._policy('couples','couples_select', $$create policy couples_select on public.couples for select to authenticated using (id = orbit_private.my_couple_id())$$);
call public._policy('couples','couples_update', $$create policy couples_update on public.couples for update to authenticated using (id = orbit_private.my_couple_id()) with check (id = orbit_private.my_couple_id())$$);

-- members (insert/delete only by service role)
call public._policy('members','members_select', $$create policy members_select on public.members for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);
call public._policy('members','members_update_self', $$create policy members_update_self on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);
-- users may only change these columns on themselves:
revoke update on public.members from authenticated;
grant update (display_name, nickname, phone, color, avatar_path, share_mode, share_mode_until,
              notify_prefs, quiet_start, quiet_end) on public.members to authenticated;

-- live_location
call public._policy('live_location','ll_select', $$create policy ll_select on public.live_location for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);
call public._policy('live_location','ll_insert', $$create policy ll_insert on public.live_location for insert to authenticated with check (user_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);
call public._policy('live_location','ll_update', $$create policy ll_update on public.live_location for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);

-- location_history (append-only for users)
call public._policy('location_history','lh_select', $$create policy lh_select on public.location_history for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);
call public._policy('location_history','lh_insert', $$create policy lh_insert on public.location_history for insert to authenticated with check (user_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);

-- daily_summary (read-only to users; written by SQL function)
call public._policy('daily_summary','ds_select', $$create policy ds_select on public.daily_summary for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);

-- places (either partner manages)
call public._policy('places','pl_all', $$create policy pl_all on public.places for all to authenticated using (couple_id = orbit_private.my_couple_id()) with check (couple_id = orbit_private.my_couple_id())$$);

-- place_presence
call public._policy('place_presence','pp_select', $$create policy pp_select on public.place_presence for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);
call public._policy('place_presence','pp_write', $$create policy pp_write on public.place_presence for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);

-- events
call public._policy('events','ev_select', $$create policy ev_select on public.events for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);
call public._policy('events','ev_insert', $$create policy ev_insert on public.events for insert to authenticated with check (user_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);

-- posts: author inserts/deletes; EITHER partner can flip `keep` (column-level grant)
call public._policy('posts','po_select', $$create policy po_select on public.posts for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);
call public._policy('posts','po_insert', $$create policy po_insert on public.posts for insert to authenticated with check (author_id = auth.uid() and couple_id = orbit_private.my_couple_id() and keep = false)$$);
call public._policy('posts','po_delete', $$create policy po_delete on public.posts for delete to authenticated using (author_id = auth.uid())$$);
call public._policy('posts','po_update_keep', $$create policy po_update_keep on public.posts for update to authenticated using (couple_id = orbit_private.my_couple_id()) with check (couple_id = orbit_private.my_couple_id())$$);
revoke update on public.posts from authenticated;
grant update (keep) on public.posts to authenticated;

-- comments / reactions
call public._policy('comments','co_select', $$create policy co_select on public.comments for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);
call public._policy('comments','co_insert', $$create policy co_insert on public.comments for insert to authenticated with check (author_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);
call public._policy('comments','co_delete', $$create policy co_delete on public.comments for delete to authenticated using (author_id = auth.uid())$$);
call public._policy('reactions','re_select', $$create policy re_select on public.reactions for select to authenticated using (couple_id = orbit_private.my_couple_id())$$);
call public._policy('reactions','re_insert', $$create policy re_insert on public.reactions for insert to authenticated with check (user_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);
call public._policy('reactions','re_delete', $$create policy re_delete on public.reactions for delete to authenticated using (user_id = auth.uid())$$);

-- capsules: author always; partner only after unlock
call public._policy('capsules','ca_select', $$create policy ca_select on public.capsules for select to authenticated using (couple_id = orbit_private.my_couple_id() and (author_id = auth.uid() or unlock_at <= now()))$$);
call public._policy('capsules','ca_insert', $$create policy ca_insert on public.capsules for insert to authenticated with check (author_id = auth.uid() and couple_id = orbit_private.my_couple_id() and unlock_at > now())$$);
call public._policy('capsules','ca_delete', $$create policy ca_delete on public.capsules for delete to authenticated using (author_id = auth.uid() and unlock_at > now())$$);
-- recipient marks opened:
call public._policy('capsules','ca_open', $$create policy ca_open on public.capsules for update to authenticated using (couple_id = orbit_private.my_couple_id() and author_id <> auth.uid() and unlock_at <= now()) with check (couple_id = orbit_private.my_couple_id())$$);
revoke update on public.capsules from authenticated;
grant update (opened_at) on public.capsules to authenticated;

-- question_answers: partner's answer visible only after you answered that day
create or replace function orbit_private.has_answered(p_day date) returns boolean
language sql stable security definer set search_path = '' as
$$ select exists(select 1 from public.question_answers where user_id = auth.uid() and day = p_day) $$;
revoke all on function orbit_private.has_answered(date) from public, anon;
grant execute on function orbit_private.has_answered(date) to authenticated;
call public._policy('question_answers','qa_select', $$create policy qa_select on public.question_answers for select to authenticated using (couple_id = orbit_private.my_couple_id() and (user_id = auth.uid() or orbit_private.has_answered(day)))$$);
call public._policy('question_answers','qa_insert', $$create policy qa_insert on public.question_answers for insert to authenticated with check (user_id = auth.uid() and couple_id = orbit_private.my_couple_id())$$);

-- device_tokens: own only
call public._policy('device_tokens','dt_own', $$create policy dt_own on public.device_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())$$);

-- retention_runs: read-only status for members
call public._policy('retention_runs','rr_select', $$create policy rr_select on public.retention_runs for select to authenticated using (orbit_private.my_couple_id() is not null)$$);

-- remove the helper so it can never be invoked by clients (it is re-created at the top on re-run)
drop procedure if exists public._policy(text, text, text);

-- realtime
do $$ begin
  begin alter publication supabase_realtime add table public.live_location; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.posts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reactions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.comments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.places; exception when duplicate_object then null; end;
end $$;

revoke all on public.media_gc from public, anon, authenticated;
grant all on public.media_gc to service_role;
-- Never trust server-derived fields on client inserts.
revoke insert on public.posts from authenticated;
grant insert (id,couple_id,author_id,channel,kind,body,media_path,thumb_path,media_duration_s,lat,lng,ttl_hours) on public.posts to authenticated;
revoke insert on public.events from authenticated;
grant insert (id,couple_id,user_id,type,place_id,payload) on public.events to authenticated;
revoke insert on public.location_history from authenticated;
grant insert (user_id,couple_id,lat,lng,accuracy_m,speed_mps,battery_pct,recorded_at) on public.location_history to authenticated;
revoke update on public.live_location from authenticated;
grant update (lat,lng,accuracy_m,speed_mps,heading,battery_pct,charging,is_moving,fuzzed,recorded_at) on public.live_location to authenticated;
-- Recreate event insert policy with server-only alert types excluded.
drop policy if exists ev_insert on public.events;
create policy ev_insert on public.events for insert to authenticated with check (
 user_id = auth.uid() and couple_id = orbit_private.my_couple_id()
 and type in ('arrive','leave','low_battery','nudge','call_request','sos')
);
-- Stale / rollup / trigger functions are not public RPCs.
revoke all on all functions in schema orbit_private from public, anon, authenticated;
grant execute on function orbit_private.my_couple_id(), orbit_private.partner_id(), orbit_private.has_answered(date) to authenticated;
revoke insert on public.capsules from authenticated;
grant insert(id,couple_id,author_id,title,body,unlock_at) on public.capsules to authenticated;
-- PostgREST upserts include conflict identity columns in their UPDATE set; RLS
-- still requires both the authenticated user and that user's immutable couple.
grant update(user_id,couple_id) on public.live_location to authenticated;
