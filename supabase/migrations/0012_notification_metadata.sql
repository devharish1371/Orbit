-- Keep delivery retries free of copied message bodies, media paths and coordinates.
create or replace function orbit_private.call_notify() returns trigger
language plpgsql security definer set search_path='' as $$
declare s text; u text; job uuid; source jsonb; metadata jsonb;
begin
  source:=to_jsonb(new);
  select jsonb_object_agg(key,value) into metadata from jsonb_each(source)
    where key in ('id','couple_id','user_id','author_id','post_id','channel','type','place_id','expires_at');
  insert into orbit_private.notification_jobs(source_table,record) values(tg_table_name,metadata) returning id into job;
  select decrypted_secret into s from vault.decrypted_secrets where name='orbit_fn_secret';
  select decrypted_secret into u from vault.decrypted_secrets where name='orbit_fn_base_url';
  if s is not null and u is not null then
    begin
      perform net.http_post(url:=u||'/notify',headers:=jsonb_build_object('Content-Type','application/json','x-orbit-secret',s),body:=jsonb_build_object('job_id',job),timeout_milliseconds:=10000);
    exception when others then null; end;
  end if;
  return new;
end $$;
update orbit_private.notification_jobs j set record=(
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(j.record)
 where key in ('id','couple_id','user_id','author_id','post_id','channel','type','place_id','expires_at')
);
