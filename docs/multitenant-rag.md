# Reusable vector-only RAG for customer websites

Each sold website must have its **own tenant**, owner login, server-side secret and production deployment. The template's frontend never receives a tenant secret.

## Components

- Supabase pgvector stores approved published chunks and 384-dimensional gte-small embeddings.
- The vector SQL RPC ranks cosine similarity only and filters all results by tenant and published status.
- The Supabase Edge Function generates embeddings and handles server-authenticated search, reindex, document upload and deletion.
- Vercel calls the Edge Function with a server-only credential and rejects untrusted client-provided tenant selectors.
- A short-lived fallback keeps responses working if semantic search temporarily fails.

## Setting up a new customer

1. Apply the generic tenant_vector_rag SQL migration. Apply the Lema-specific bridge only to the existing Lema website.
2. Generate a fresh unpredictable secret of at least 32 random bytes. Store only its SHA-256 lowercase hex hash in rag_tenants.auth_hash and record a unique tenant_id (do not re-use credentials between customers).
3. Set RAG_TENANT_ID, RAG_TENANT_SECRET and SUPABASE_URL in that customer's server environment; provide their own AI provider and owner-login configuration.
4. Publish approved FAQs through the owner dashboard or server-authorized upsert-documents batches. The Edge Function requires x-rag-secret; never expose it in JavaScript sent to the browser.
5. Rebuild the search index in the admin Assistant section if old or newly imported documents have missing embeddings. Published FAQ edits invalidate affected embeddings automatically.
6. Use the authenticated delete-document operation to remove owner documents.

## Security boundaries

- Public/anonymous roles cannot read the underlying tenant data or execute tenant match RPCs.
- User questions and all retrieved text are untrusted data. They cannot override instructions, reveal secrets or change tenant identity.
- Client-supplied assistant history is ignored, and external response links are restricted to approved internal routes.
- Document ingestion validates size, origin and internal links, and excludes unpublished drafts.
- The chatbot cannot visit arbitrary URLs or execute tools on behalf of untrusted content.
- The owner must review factual claims, policies, contact details and consent before publishing.

## Limits

Supabase built-in gte-small primarily supports English and truncates long inputs; the vector search will be weaker for Hindi and Hinglish until a multilingual embedding model is installed. For high-quality multilingual semantic retrieval across global clients, integrate a multilingual embedding model and reindex vectors with the same model for both documents and queries. This implementation does not promise absolute immunity to every prompt injection and does not autonomously learn from visitors. Use regression tests and provider monitoring.

## Verification

See tests/rag-security.test.js, tests/assistant-retrieval.test.js, scripts/browser-qa.mjs and scripts/live-chat-qa.mjs. For each new client, verify production deployment, owned documents, tenant isolation, mobile keyboard behavior and multi-turn replies before handover.
