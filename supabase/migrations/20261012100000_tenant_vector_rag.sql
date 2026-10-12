-- Generic reusable pgvector and tenant isolation schema
create extension if not exists vector with schema extensions;
create table if not exists public.rag_tenants(
 tenant_id text primary key,enabled boolean not null default true,
 auth_hash text,created_at timestamptz not null default now());
create table if not exists public.rag_chunks(
 id bigint generated always as identity primary key,
 tenant_id text not null references public.rag_tenants(tenant_id) on delete cascade,
 doc_key text not null,ordinal integer not null default 0,
 title text not null,content text not null,keywords text[] not null default '{}',
 href text not null default '',published boolean not null default true,
 source_type text not null default 'faq',
 embedding extensions.vector(384),embedding_model text,content_hash text not null,
 updated_at timestamptz not null default now(),
 search_document tsvector generated always as
  (to_tsvector('simple',coalesce(title,'')||' '||coalesce(content,''))) stored,
 unique(tenant_id,doc_key,ordinal));
create index if not exists rag_chunks_tenant_idx on public.rag_chunks(tenant_id,published);
create index if not exists rag_chunks_fts_idx on public.rag_chunks using gin(search_document);
create index if not exists rag_chunks_embedding_idx on public.rag_chunks
 using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
alter table public.rag_tenants enable row level security;
alter table public.rag_chunks enable row level security;
revoke all on public.rag_tenants from public,anon,authenticated;
revoke all on public.rag_chunks from public,anon,authenticated;
revoke all on sequence public.rag_chunks_id_seq from public,anon,authenticated;
create or replace function public.rag_tenant_authorized(p_tenant text,p_hash text)
returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.rag_tenants t where
 t.tenant_id=p_tenant and t.enabled and t.auth_hash is not null and t.auth_hash=p_hash);
$$;
revoke all on function public.rag_tenant_authorized(text,text) from public,anon,authenticated;
grant execute on function public.rag_tenant_authorized(text,text) to service_role;
create or replace function public.rag_hybrid_match(
 p_tenant text,p_query text,p_embedding extensions.vector default null,p_limit integer default 6)
returns table(question text,answer text,href text,keywords text[],score double precision,
 similarity double precision,source_type text)
language sql stable security invoker set search_path='' as $$
with candidates as (
 select c.title,c.content,c.href,c.keywords,c.source_type,
 case when c.embedding is not null and p_embedding is not null and c.embedding_model='gte-small-v1'
 then greatest(0,1-(c.embedding OPERATOR(extensions.<=>) p_embedding)) else 0 end as sim,
 ts_rank_cd(c.search_document,websearch_to_tsquery('simple',left(p_query,300))) as lexical
 from public.rag_chunks c where c.tenant_id=p_tenant and c.published
)
select title,content,href,keywords,sim*.76+least(1,lexical*4)*.24,sim,source_type
from candidates where sim>=.52 or lexical>0 order by 5 desc
limit least(greatest(p_limit,1),10);
$$;
revoke all on function public.rag_hybrid_match(text,text,extensions.vector,integer) from public,anon,authenticated;
grant execute on function public.rag_hybrid_match(text,text,extensions.vector,integer) to service_role;