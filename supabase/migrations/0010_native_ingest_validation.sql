-- Validate nullable JSON/RPC arguments before entering the atomic ingestion implementation.
alter function public.submit_locations(bigint,jsonb,jsonb,boolean) set schema orbit_private;
revoke all on function orbit_private.submit_locations(bigint,jsonb,jsonb,boolean) from public,anon,authenticated;
create function public.submit_locations(p_epoch bigint,p_fixes jsonb,p_transitions jsonb default '[]',p_low_battery boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f jsonb;
begin
  if p_epoch is null or p_epoch<0 or p_fixes is null or p_transitions is null
    or jsonb_typeof(p_fixes)<>'array' or jsonb_typeof(p_transitions)<>'array'
    or jsonb_array_length(p_fixes)>100 or jsonb_array_length(p_transitions)>100 then raise exception 'INVALID_BATCH'; end if;
  for f in select value from jsonb_array_elements(p_fixes) loop
    if jsonb_typeof(f)<>'object' or f->>'lat' is null or f->>'lng' is null or f->>'recorded_at' is null
      or f->>'client_id' is null or (f->>'accuracy_m')::float8<0 or (f->>'accuracy_m')::float8>2000
      or (f->>'speed_mps')::float8>70 then raise exception 'INVALID_FIX'; end if;
    perform (f->>'client_id')::uuid;
  end loop;
  for f in select value from jsonb_array_elements(p_transitions) loop
    if jsonb_typeof(f)<>'object' or f->>'id' is null or f->>'place_id' is null or f->>'inside' is null or f->>'recorded_at' is null then raise exception 'INVALID_TRANSITION'; end if;
  end loop;
  return orbit_private.submit_locations(p_epoch,p_fixes,p_transitions,p_low_battery);
end $$;
revoke all on function public.submit_locations(bigint,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.submit_locations(bigint,jsonb,jsonb,boolean) to authenticated;
