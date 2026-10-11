-- Optional, explicit visitor question submissions for owner-approved learning.
-- No full transcripts, IP addresses, cookies or visitor identifiers are stored.
create table if not exists public.witness_lema_learning_queue (
  id bigint generated always as identity primary key,
  question text not null check (char_length(question) between 12 and 300),
  language text not null default 'auto' check (language in ('en','hi','auto')),
  status text not null default 'pending' check (status in ('pending','approved','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.witness_lema_learning_queue enable row level security;
revoke all on public.witness_lema_learning_queue from public, anon, authenticated;
grant select, insert, update, delete on public.witness_lema_learning_queue to service_role;
grant usage, select on sequence public.witness_lema_learning_queue_id_seq to service_role;
create policy "learning queue service role only"
on public.witness_lema_learning_queue for all to service_role
using (true) with check (true);
create index if not exists witness_lema_learning_pending_idx on public.witness_lema_learning_queue (created_at desc) where status='pending';

-- Admin approval is atomic: only the trusted backend can promote a question
-- into live knowledge, and a visitor submission never becomes public on its own.
create or replace function public.witness_lema_review_learning(
  p_id bigint, p_action text, p_answer text default '', p_href text default '/contact/'
) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare learned_question text;
begin
  if p_action not in ('approve','dismiss') then raise exception 'Invalid action'; end if;
  select question into learned_question from public.witness_lema_learning_queue
  where id=p_id and status='pending' for update;
  if not found then return jsonb_build_object('ok',false); end if;
  if p_action='approve' then
    if char_length(trim(p_answer))<20 or char_length(p_answer)>3000 or p_href not in ('','/about/','/services/','/contact/','/gallery/') then raise exception 'Invalid approved answer'; end if;
    insert into public.witness_lema_knowledge(question,answer,keywords,href,published,sort_order)
    values(learned_question,trim(p_answer),array[]::text[],p_href,true,0);
  end if;
  update public.witness_lema_learning_queue set status=case when p_action='approve' then 'approved' else 'dismissed' end where id=p_id;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.witness_lema_review_learning(bigint,text,text,text) from public, anon, authenticated;
grant execute on function public.witness_lema_review_learning(bigint,text,text,text) to service_role;
