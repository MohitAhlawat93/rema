# Search Growth OS — initial implementation and rollout gates
Updated 2026-10-14. Implementation tracker, not a claim of Google indexing or SEO ranking.

## Current verified architecture
- Existing owner dashboard and custom HTML website in this repository.
- Middleware reads approved Supabase public content and renders live public HTML.
- A protected setup checker already exists in lib/setup-automation.js; keep its authenticated status UI intact.
- A separate live-readiness auditor now checks actual HTTP SEO output in scripts/audit-live-search.mjs.
- SEO_SITE_ORIGIN remains a temporary-domain value until the client-owned domain is active.
- GSC Wizard currently does not list a Witness Lema-owned Search Console property.
- The Contact form's prepare/copy behavior is not proof of an enquiry being sent.
- No paid SERP checks or automatic content publishing before launch verification.

## Release 1: zero-cost readiness (current work)
Commands:
- npm test
- npm run build && npm run validate:seo
- npm run audit:search -- --origin=https://rema-ruby.vercel.app  (read only)

After the client's domain is active and its canonical origin is configured:
- npm run audit:search -- --origin=https://CLIENT-OWNED-DOMAIN --expect-indexable
Expected: all six search pages have consistent titles, descriptions, canonical URLs,
sitemap entries and indexability; admin and privacy have noindex.
The auditor deliberately labels Search Console verification as false and Google indexing
as unknown. It never attempts to infer rankings or customer enquiries.

## Release 2: domain and search verification
1. Client controls registrar account, recovery address, payments, DNS and verified domain.
2. Configure production site origin and SSL; redirect old public host to new canonical.
3. Inspect live HTML, sitemap, image sitemap, robots rules and owner-published SEO.
4. Client owns Search Console property; developer receives delegated access.
5. Submit sitemap through verified Search Console; record status and data freshness.
Do not promise indexing or ranks; wait for Google's evidence.

## Release 3: passive search intelligence
Store imported reporting intervals with source, property, date range and data freshness.
Implement rules for declining clicks, nonindexable pages and useful query opportunities.
No visitor IP or private chatbot conversation should be necessary.
No source data => show Not connected rather than a fabricated chart.

## Release 4: limited geographic SERP pilot
Only for truthful, approved service areas and eligible search contexts.
Start with 5 approved query groups, 9 public geographic sample points, weekly organic checks.
Persist query, search type, device, coordinates or coarse cell, date, depth, observed rank,
not-found-within-depth, and provider status. Distinguish provider failure from absent rank.
Compare only identical query/device/location/depth setups; keep spending capped.
Do not fake address listings or use prohibited advertising or Maps surfaces.

## Release 5: conversion and AI growth controller
Record anonymous/consented click events separately from actual confirmed messages or enquiries.
Rules select potential issues; AI drafts a change with evidence and uncertainty.
Admin approval gates significant content, service and pricing changes.
Store immutable publication revision; test rendered HTML; keep recovery path.
Run change experiments with comparable before/after windows and insufficient-sample flags.

## Release 6: multi-client handover
Keep owner site, registrar, Google identity and databases client-controlled.
Managed growth-service account accesses only authorized client analytics data.
Tenant isolation, row-level access tests, export and offboarding are release gates.

## Known blockers and safety
- New domain application is pending; never guess the domain or claim it is active.
- Do not modify production DNS, hosting ownership, secrets or production database in code-only release.
- Non-main branch changes have Vercel Git deployment disabled to save quota.
- Live HTTP auditing depends on public reachability. If blocked, preserve not verified.
- Do not create pages or modify business content without owner approval.
