-- A trigger-only helper must not be directly callable through the public Data API.
-- Trigger execution is unaffected by revoking direct RPC EXECUTE access.
revoke all on function public.rag_sync_legacy_lema() from public, anon, authenticated;
