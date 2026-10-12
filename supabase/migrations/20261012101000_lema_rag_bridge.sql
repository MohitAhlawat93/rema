-- Only for witness-lema migration from the historical FAQ/admin data.
insert into public.rag_tenants(tenant_id) values('witness-lema') on conflict do nothing;
create or replace function public.rag_tenant_authorized(p_tenant text,p_hash text)
returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.rag_tenants t where t.tenant_id=p_tenant and t.enabled
 and ((t.auth_hash is not null and t.auth_hash=p_hash)
   or (t.tenant_id='witness-lema' and public.witness_lema_admin_auth(p_hash))));
$$;
revoke all on function public.rag_tenant_authorized(text,text) from public,anon,authenticated;
grant execute on function public.rag_tenant_authorized(text,text) to service_role;
create or replace function public.rag_sync_legacy_lema()
returns trigger language plpgsql security definer set search_path='' as $$
declare q text; a text; k text[]; l text; dkey text;
begin
 if tg_op='DELETE' then
  delete from public.rag_chunks where tenant_id='witness-lema'
   and doc_key='faq-'||md5(lower(trim(old.question)));
  return old;
 end if;
 q:=trim(new.question);a:=trim(new.answer);k:=new.keywords;l:=new.href;
 dkey:='faq-'||md5(lower(q));
 if q<>'' and a<>'' then
  insert into public.rag_chunks(tenant_id,doc_key,ordinal,title,content,keywords,href,source_type,published,content_hash)
  values('witness-lema',dkey,0,left(q,300),left(a,3500),k,l,'faq',new.published,
   md5(q||'|'||a||'|'||coalesce(array_to_string(k,','),'')))
  on conflict(tenant_id,doc_key,ordinal) do update
   set title=excluded.title,content=excluded.content,keywords=excluded.keywords,href=excluded.href,
    published=excluded.published,
    embedding=case when public.rag_chunks.content_hash=excluded.content_hash then public.rag_chunks.embedding else null end,
    embedding_model=case when public.rag_chunks.content_hash=excluded.content_hash then public.rag_chunks.embedding_model else null end,
    content_hash=excluded.content_hash,updated_at=now();
 end if;
 return new;
end;
$$;
drop trigger if exists rag_sync_legacy_lema_trigger on public.witness_lema_knowledge;
create trigger rag_sync_legacy_lema_trigger after insert or update or delete
 on public.witness_lema_knowledge for each row execute function public.rag_sync_legacy_lema();
insert into public.rag_chunks(tenant_id,doc_key,ordinal,title,content,keywords,href,source_type,published,content_hash)
select 'witness-lema','faq-'||md5(lower(trim(question))),0,question,answer,keywords,href,'faq',published,
 md5(trim(question)||'|'||trim(answer)||'|'||coalesce(array_to_string(keywords,','),''))
from public.witness_lema_knowledge on conflict(tenant_id,doc_key,ordinal) do nothing;