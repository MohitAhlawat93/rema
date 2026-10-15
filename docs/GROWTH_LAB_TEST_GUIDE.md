# Witness Lema — Search Growth Lab: hands-on test guide

Status: deployed to Cloudflare test infrastructure, verified 2026-10-15.
This page is a **safe launch rehearsal**, not a public SEO campaign.

## Open the system

- Website: https://test.witnesslema.com/
- Growth Lab: https://test.witnesslema.com/growth-lab/
- Automated health dashboard: https://lema-growth-trial-health.amohit920.workers.dev/dashboard
- Detailed machine-readable health: https://lema-growth-trial-health.amohit920.workers.dev/status

## How to test without technical knowledge

1. Open the Growth Lab and click **Run live readiness check**.
   All three checks should pass: test-domain indexing protection,
   trial database connection, and published trial-site content.
2. Under **Explore search opportunities**, click **Load fictional sample**.
   This is explicitly an invented illustration, not Google rankings.
3. If you have an authentic GSC Query/Page export, optionally upload a CSV.
   Nothing is transmitted: it is analyzed entirely within the browser.
   A user-provided file is not independently verified as Google data.
4. Under **Try an SEO experiment**, choose any scenario.
   Click **Create recommendation**, **Approve demo change**, and
   **Undo demo change**. Approval and undo stay in that browser's
   local storage. They do **not** edit the live site's pages.
5. Under **Rehearse the launch gate**, tick/check prerequisites, then reset.
   Checklist selections are a practice exercise, not proof of completion.
6. Open the health dashboard to see the live daily Cloudflare checks
   on 11 fixed routes. It records factual technical findings and
   suggestions, not Google rankings.

## The actual technical separation

| Surface | Cloudflare Pages project | Supabase |
|---|---|---|
| https://test.witnesslema.com | lema-growth-test | lema_transfer_trial (separate existing trial project) |
| https://witnesslema.com | lema-website-staging | lema_staging (not launched) |
| https://www.witnesslema.com | lema-website-staging | lema_staging (not launched) |
| https://lema-website-production.pages.dev | lema-website-production | no production DB configured |

The test custom domain and HTTPS certificate are active.
The main and www DNS records have not been changed. Test SEO indexing is
disabled. A brand-new chargeable database has **not** been created;
the existing separate trial database is being reused for the rehearsal.

## What the interface does and does not do

**Live:** reading a published record from the isolated trial database,
test SEO safety configuration, testing website HTTP and API availability,
Cloudflare Worker technical checks, trial-domain routing, CI build/tests.

**Browser-only simulation:** SEO recommendations, changes/approval/undo
on the demo cards, launch-prerequisite checkmarks, fictional CSV sample.

**CSV analysis:** user-supplied file analyzed only in the browser.
It does not prove that GSC has verified the property and does not make
calls to Search Console.

**Not enabled:** live Google Search Console queries/ranking data for
Witness Lema, paid geo-grid API checks, owner admin writes on the new
test backend (owner authentication secrets deliberately not copied),
real-domain production deployment/database cutover, real Google indexing.

The GSC Wizard connection currently exposes another existing property
but no verified Witness Lema property. To get real search data, the
Google account owning the property must verify it and delegate access.
The final production domain should remain noindex until the production
site is ready and the client approves launch. Indexing cannot be
guaranteed after submission.

## Security/cost guardrails

- No staging secrets, password hashes or session keys transferred to trial.
- No test form should send real client enquiries or process private data.
- No client private addresses or visitor conversations included in reports.
- No third-party paid SERP queries, no extra Supabase database purchased.
- Trial Pages uses its own publishable-only access to Supabase; owner and
  privileged review-write functions remain unavailable until isolated
  credentials are deliberately provisioned.
- Cloudflare Workers Cron for test health runs at 06:15 UTC daily.
- A failed API returns an error, never synthetic healthy data.
- Do not switch witnesslema.com or enable SEO_INDEXING_ENABLED to true
  as part of a rehearsal.

## Next stage after this testing

Provision the actual client-owned production Supabase project (subject to
verified ownership, desired organization, and cost confirmation).
Configure fresh production auth/internal secrets, R2 and RAG access;
verify authenticated writes. Release the reviewed candidate to the
production Pages project, then migrate the apex/www domains and verify
Search Console property and sitemap.

Real GSC and paid geographic ranking providers cannot be inferred from
sample data, website uptime or DNS verification.
