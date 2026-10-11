-- Deploy the updated witness-lema-admin Edge Function and Vercel backend
-- before applying this migration. Only the Edge service role may call the
-- privileged review inbox; browsers and public publishable keys may not.
revoke execute on function public.witness_lema_review_inbox(text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.witness_lema_review_inbox(text,text,jsonb)
  to service_role;
