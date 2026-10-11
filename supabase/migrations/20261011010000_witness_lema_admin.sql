-- Admin credentials are seeded separately as deployment secrets and are never committed.
create schema if not exists witness_lema_private;
revoke all on schema witness_lema_private from public, anon, authenticated;
grant usage on schema witness_lema_private to service_role;
create table if not exists witness_lema_private.admin_credentials (
  id text primary key check (id = 'main'),
  secret_sha256 text not null check (length(secret_sha256) = 64),
  updated_at timestamptz not null default now()
);
alter table witness_lema_private.admin_credentials enable row level security;
revoke all on table witness_lema_private.admin_credentials from public, anon, authenticated;
grant select, insert, update on table witness_lema_private.admin_credentials to service_role;
create policy "service role only" on witness_lema_private.admin_credentials for all to service_role using (true) with check (true);
create table if not exists witness_lema_private.site_state (
  id text primary key check (id = 'main'),
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  version bigint not null default 1 check (version >= 1),
  published_version bigint not null default 1 check (published_version >= 1),
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);
alter table witness_lema_private.site_state enable row level security;
revoke all on table witness_lema_private.site_state from public, anon, authenticated;
grant select, insert, update on table witness_lema_private.site_state to service_role;
create policy "service role only" on witness_lema_private.site_state for all to service_role using (true) with check (true);
create table if not exists public.witness_lema_published_site (
  id text primary key check (id = 'main'),
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1 check (version >= 1),
  updated_at timestamptz not null default now()
);
alter table public.witness_lema_published_site enable row level security;
revoke all on table public.witness_lema_published_site from anon, authenticated;
grant select on table public.witness_lema_published_site to anon, authenticated;
create policy "published site is readable" on public.witness_lema_published_site for select to anon, authenticated using (id = 'main');
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('witness-lema-gallery','witness-lema-gallery',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
create policy "public can view witness lema gallery" on storage.objects for select to anon, authenticated using (bucket_id = 'witness-lema-gallery');
create or replace function public.witness_lema_admin_auth(candidate_sha256 text)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from witness_lema_private.admin_credentials where id='main' and secret_sha256=candidate_sha256); $$;
revoke all on function public.witness_lema_admin_auth(text) from public, anon, authenticated;
grant execute on function public.witness_lema_admin_auth(text) to service_role;
create or replace function public.replace_witness_lema_knowledge(items jsonb)
returns integer language plpgsql security definer set search_path=''
as $$
declare inserted integer;
begin
  if jsonb_typeof(items)<>'array' or jsonb_array_length(items)>250 then raise exception 'Invalid knowledge collection'; end if;
  delete from public.witness_lema_knowledge;
  insert into public.witness_lema_knowledge(question,answer,keywords,href,published,sort_order)
  select left(trim(x.question),300),left(trim(x.answer),3000),coalesce(x.keywords,'{}'::text[]),left(coalesce(x.href,''),300),coalesce(x.published,true),x.ordinality::integer-1
  from jsonb_to_recordset(items) with ordinality as x(question text,answer text,keywords text[],href text,published boolean,ordinality bigint)
  where trim(coalesce(x.question,''))<>'' and trim(coalesce(x.answer,''))<>'';
  get diagnostics inserted=row_count; return inserted;
end; $$;
revoke all on function public.replace_witness_lema_knowledge(jsonb) from public, anon, authenticated;
grant execute on function public.replace_witness_lema_knowledge(jsonb) to service_role;
create or replace function public.witness_lema_admin_state(action text,body jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare current_row witness_lema_private.site_state%rowtype;target_version bigint;target_payload jsonb;new_history jsonb;inserted integer;
begin
  select * into current_row from witness_lema_private.site_state where id='main' for update;
  if not found then raise exception 'Admin state is not initialized'; end if;
  if action='read' then null;
  elsif action='save' then
    if jsonb_typeof(body)<>'object' or length(body::text)>500000 then raise exception 'Invalid site draft'; end if;
    update witness_lema_private.site_state set draft=body,version=version+1,updated_at=now() where id='main' returning * into current_row;
  elsif action='publish' then
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
revoke all on function public.witness_lema_admin_state(text,jsonb) from public, anon, authenticated;
grant execute on function public.witness_lema_admin_state(text,jsonb) to service_role;
