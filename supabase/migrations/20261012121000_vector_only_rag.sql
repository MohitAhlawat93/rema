-- Vector-only tenant-scoped retrieval. No keyword/full-text ranking is used.
create or replace function public.rag_vector_match(p_tenant text,p_embedding extensions.vector,p_limit integer default 5,p_min_similarity double precision default 0.72)
returns table(question text,answer text,href text,keywords text[],score double precision,similarity double precision,source_type text)
language sql stable security invoker set search_path='' as $$
select c.title,c.content,c.href,c.keywords,
 greatest(0,1-(c.embedding OPERATOR(extensions.<=>) p_embedding))::double precision,
 greatest(0,1-(c.embedding OPERATOR(extensions.<=>) p_embedding))::double precision,c.source_type
from public.rag_chunks c
where c.tenant_id=p_tenant and c.published and c.embedding is not null and c.embedding_model='gte-small-v1'
and p_embedding is not null and (1-(c.embedding OPERATOR(extensions.<=>) p_embedding))>=greatest(0.0,least(1.0,p_min_similarity))
order by c.embedding OPERATOR(extensions.<=>) p_embedding asc
limit least(greatest(p_limit,1),8);
$$;
revoke all on function public.rag_vector_match(text,extensions.vector,integer,double precision) from public,anon,authenticated;
grant execute on function public.rag_vector_match(text,extensions.vector,integer,double precision) to service_role;
