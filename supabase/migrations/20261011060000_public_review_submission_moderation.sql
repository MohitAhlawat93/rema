-- Visitor reviews are kept private until an authenticated owner publishes them
-- through the existing draft/publish flow. Anonymous visitors cannot access
-- the queue or change publication status.
create table if not exists witness_lema_private.review_submissions (
  id bigint generated always as identity primary key,
  author text not null check (char_length(author) between 2 and 90),
  review_text text not null check (char_length(review_text) between 20 and 1400),
  language text not null check (language in ('en','hi')),
  consent boolean not null check (consent = true),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table witness_lema_private.review_submissions enable row level security;
revoke all on table witness_lema_private.review_submissions from public, anon, authenticated;
grant select, insert, update, delete on witness_lema_private.review_submissions to service_role;
create index if not exists witness_lema_review_submissions_queue_idx
  on witness_lema_private.review_submissions (created_at desc) where status='pending';

-- Publicly callable only in the PostgREST sense; all actions require the exact
-- 256-bit-equivalent secret hash already registered for the trusted admin
-- backend. Browsers never receive the secret or its hash. The private queue
-- remains entirely inaccessible to anon/authenticated SQL roles.
create or replace function public.witness_lema_review_inbox(
  p_secret_sha256 text, p_action text, p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  result jsonb;
  review_id bigint;
  display_name text;
  body_text text;
  lang text;
  decision text;
begin
  if p_secret_sha256 is null or length(p_secret_sha256)<>64 or
     not exists(select 1 from witness_lema_private.admin_credentials c
                where c.id='main' and c.secret_sha256=p_secret_sha256) then
    raise exception 'Unauthorized' using errcode='28000';
  end if;
  if p_action='submit' then
    display_name=trim(coalesce(p_payload->>'author',''));
    body_text=trim(coalesce(p_payload->>'text',''));
    lang=coalesce(p_payload->>'language','');
    if length(display_name)<2 or length(display_name)>90
      or length(body_text)<20 or length(body_text)>1400
      or lang not in ('en','hi') or p_payload->>'consent'<>'true' then
      raise exception 'Invalid review';
    end if;
    insert into witness_lema_private.review_submissions(author,review_text,language,consent)
    values(display_name,body_text,lang,true) returning id into review_id;
    return jsonb_build_object('ok',true);
  elsif p_action='list' then
    select coalesce(jsonb_agg(jsonb_build_object(
       'id',t.id,'author',t.author,'text',t.review_text,'language',t.language,'createdAt',t.created_at
    ) order by t.created_at desc),'[]'::jsonb)
      into result
    from (select id,author,review_text,language,created_at
          from witness_lema_private.review_submissions
          where status='pending' order by created_at desc limit 100) t;
    return jsonb_build_object('items',result);
  elsif p_action='resolve' then
    if coalesce(p_payload->>'id','') !~ '^[0-9]{1,15}$' then
      raise exception 'Invalid review ID';
    end if;
    review_id=(p_payload->>'id')::bigint;
    decision=p_payload->>'status';
    if decision not in ('approved','rejected') then raise exception 'Invalid review decision'; end if;
    update witness_lema_private.review_submissions
       set status=decision,reviewed_at=now()
     where id=review_id and status='pending';
    if not found then return jsonb_build_object('ok',false); end if;
    return jsonb_build_object('ok',true);
  end if;
  raise exception 'Unsupported action';
end
$$;
revoke all on function public.witness_lema_review_inbox(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.witness_lema_review_inbox(text,text,jsonb) to anon, authenticated, service_role;
