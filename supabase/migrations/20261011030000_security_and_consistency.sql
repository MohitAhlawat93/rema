-- Witness Lema security hardening. Isolated from Rebecca tables.
create table if not exists witness_lema_private.rate_limit_buckets (
  scope text not null check (scope in ('login','assistant')),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  primary key (scope, subject_hash)
);
alter table witness_lema_private.rate_limit_buckets enable row level security;
revoke all on witness_lema_private.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on witness_lema_private.rate_limit_buckets to service_role;
drop policy if exists "service role rate buckets" on witness_lema_private.rate_limit_buckets;
create policy "service role rate buckets" on witness_lema_private.rate_limit_buckets for all to service_role using (true) with check (true);

-- Atomic across Edge and Vercel instances. The caller sends only a keyed hash of the IP.
create or replace function public.witness_lema_consume_rate_limit(
 p_scope text, p_subject_hash text, p_max_attempts integer, p_window_seconds integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_attempts integer; v_started timestamptz; v_allowed boolean; v_wait integer;
begin
 if p_scope not in ('login','assistant') or p_subject_hash !~ '^[0-9a-f]{64}$'
    or p_max_attempts not between 1 and 100 or p_window_seconds not between 30 and 3600 then
   raise exception 'Invalid rate-limit parameters';
 end if;
 insert into witness_lema_private.rate_limit_buckets as b (scope,subject_hash,started_at,attempts)
 values (p_scope,p_subject_hash,now(),1)
 on conflict (scope,subject_hash) do update
 set attempts=case when b.started_at <= now()-make_interval(secs=>p_window_seconds)
                    then 1 else b.attempts+1 end,
     started_at=case when b.started_at <= now()-make_interval(secs=>p_window_seconds)
                     then now() else b.started_at end
 returning attempts,started_at into v_attempts,v_started;
 v_allowed := v_attempts <= p_max_attempts;
 v_wait := case when v_allowed then 0
    else greatest(1,ceil(extract(epoch from (v_started + make_interval(secs=>p_window_seconds) - now())))::integer) end;
 return jsonb_build_object('allowed',v_allowed,'retryAfterSeconds',v_wait);
end; $$;
revoke all on function public.witness_lema_consume_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.witness_lema_consume_rate_limit(text,text,integer,integer) to service_role;

-- Require the version last observed by updated admin clients; older clients
-- continue to work during the single production cutover.
create or replace function public.witness_lema_admin_state(action text,body jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare current_row witness_lema_private.site_state%rowtype;target_version bigint;target_payload jsonb;new_history jsonb;inserted integer;
begin
  select * into current_row from witness_lema_private.site_state where id='main' for update;
  if not found then raise exception 'Admin state is not initialized'; end if;
  if action='read' then null;
  elsif action='save' then
    -- Legacy payloads remain accepted while the previous Vercel deployment drains.
    if body ? 'expectedVersion' then
      if jsonb_typeof(body->'expectedVersion') <> 'number' or (body->>'expectedVersion')::bigint <> current_row.version then
        raise exception 'Draft version conflict' using errcode='40001';
      end if;
      target_payload := body->'draft';
    else
      target_payload := body;
    end if;
    if jsonb_typeof(target_payload)<>'object' or length(target_payload::text)>500000 then raise exception 'Invalid site draft'; end if;
    update witness_lema_private.site_state set draft=target_payload,version=version+1,updated_at=now() where id='main' returning * into current_row;
  elsif action='publish' then
    if body ? 'expectedVersion' and (jsonb_typeof(body->'expectedVersion') <> 'number' or (body->>'expectedVersion')::bigint <> current_row.version) then
      raise exception 'Draft version conflict' using errcode='40001';
    end if;
    new_history=current_row.history||jsonb_build_array(jsonb_build_object('version',current_row.published_version,'payload',current_row.published,'publishedAt',current_row.published_at));
    if jsonb_array_length(new_history)>10 then select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into new_history from jsonb_array_elements(new_history) with ordinality where ordinality>jsonb_array_length(new_history)-10; end if;
    update witness_lema_private.site_state set published=draft,published_version=published_version+1,history=new_history,published_at=now(),updated_at=now() where id='main' returning * into current_row;
    insert into public.witness_lema_published_site(id,payload,version,updated_at) values('main',current_row.published,current_row.published_version,now()) on conflict(id) do update set payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at;
  elsif action='restore' then
    target_version=(body->>'version')::bigint;
    select value->'payload' into target_payload from jsonb_array_elements(current_row.history) where (value->>'version')::bigint=target_version limit 1;
    if target_payload is null then raise exception 'Recovery version not found'; end if;
    update witness_lema_private.site_state set draft=target_payload,version=version+1,updated_at=now() where id='main' returning * into current_row;
  elsif action='knowledge-read' then
    return jsonb_build_object('items',(select coalesce(jsonb_agg(jsonb_build_object('question',question,'answer',answer,'keywords',keywords,'href',href,'published',published) order by sort_order,id),'[]'::jsonb) from public.witness_lema_knowledge));
  elsif action='knowledge-save' then
    select public.replace_witness_lema_knowledge(body) into inserted; return jsonb_build_object('saved',inserted);
  else raise exception 'Unknown admin action'; end if;
  return jsonb_build_object('draft',current_row.draft,'published',current_row.published,'version',current_row.version,'publishedVersion',current_row.published_version,'history',current_row.history,'updatedAt',current_row.updated_at,'publishedAt',current_row.published_at);
end; $$;

