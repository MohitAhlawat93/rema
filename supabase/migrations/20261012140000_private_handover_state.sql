-- Private owner handover progress, strictly separate from the published website payload.
-- Service role access only. This does not transfer provider ownership or store credentials.
create table if not exists witness_lema_private.handover_state (
  id text primary key check (id='main'),
  sale_model text not null default 'undecided'
    check (sale_model in ('undecided','managed','client_owned','full_source')),
  progress jsonb not null default '{}'::jsonb check (jsonb_typeof(progress)='object'),
  version bigint not null default 1 check (version>0),
  updated_at timestamptz not null default now()
);
alter table witness_lema_private.handover_state enable row level security;
revoke all on witness_lema_private.handover_state from public, anon, authenticated;
grant select,insert,update on witness_lema_private.handover_state to service_role;
insert into witness_lema_private.handover_state(id) values('main') on conflict(id) do nothing;

create or replace function public.witness_lema_handover_state(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare row_now witness_lema_private.handover_state%rowtype;
        p_progress jsonb; p_mode text;
begin
  select * into row_now from witness_lema_private.handover_state where id='main' for update;
  if not found then raise exception 'Handover setup missing'; end if;
  if p_action='save' then
    if jsonb_typeof(p_payload)<>'object' or length(p_payload::text)>3500 then raise exception 'Invalid handover request'; end if;
    if jsonb_typeof(p_payload->'expectedVersion')<>'number' or
       (p_payload->>'expectedVersion')::bigint<>row_now.version
       then raise exception 'Handover version conflict' using errcode='40001'; end if;
    p_mode=p_payload->>'saleModel';p_progress=p_payload->'progress';
    if p_mode not in ('undecided','managed','client_owned','full_source') or
       p_mode is null or jsonb_typeof(p_progress)<>'object' then
       raise exception 'Invalid handover model or progress';
    end if;
    if exists (select 1 from jsonb_each_text(p_progress) x
      where x.key not in ('business-approval','source-agreement','email-domain','hosting-ownership',
          'isolated-database','client-api-keys','google-search','backups-restore','live-qa','final-acceptance')
         or x.value not in ('todo','in_progress','submitted')) then
       raise exception 'Invalid handover milestone';
    end if;
    update witness_lema_private.handover_state
      set progress=p_progress,sale_model=p_mode,version=version+1,updated_at=now()
      where id='main' returning * into row_now;
  elsif p_action<>'read' then
    raise exception 'Invalid handover operation';
  end if;
  return jsonb_build_object('version',row_now.version,'saleModel',row_now.sale_model,
    'progress',row_now.progress,'updatedAt',row_now.updated_at);
end $$;
revoke all on function public.witness_lema_handover_state(text,jsonb) from public, anon, authenticated;
grant execute on function public.witness_lema_handover_state(text,jsonb) to service_role;
