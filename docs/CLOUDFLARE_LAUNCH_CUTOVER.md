# Witness Lema — Cloudflare launch and ownership cutover

Verified on 2026-10-15. This is a **launch runbook**, not a declaration that the
website is ready for public Google indexing.

## Current verified infrastructure

| Purpose | Host | Cloudflare Pages project | Database |
|---|---|---|---|
| Main pre-launch address | https://witnesslema.com | lema-website-staging | lema_staging |
| WWW pre-launch address | https://www.witnesslema.com | lema-website-staging | lema_staging |
| Test | https://test.witnesslema.com | lema-website-staging | lema_staging |
| New production candidate | https://lema-website-production.pages.dev | lema-website-production | **NONE configured** |
| Earlier isolated dummy handover trial | lema-transfer-trial.pages.dev | lema-transfer-trial (other Cloudflare account) | lema_transfer_trial |

Current main and test addresses are not yet isolated. All public web addresses
were verified on 2026-10-15 to return HTTP 200 and noindex. The Pages domain
associations and certificate verification report active on Cloudflare.

The production-candidate Pages project is a distinct resource, deployed and
read-only-verified, but **must not serve real visitors yet**. Its content and
reviews APIs return HTTP 503 because it has no production Supabase connection.
This is intentional; do not connect the staging database to make the checks pass.

**Current Cloudflare zone and Pages accounts are developer-controlled.
Domain registration/registrant details and actual Lema control of Cloudflare
cannot be established merely from a DNS or API check.** Verify and record the
client owner/recovery/payment details before handover.

## Completed readiness checks

- Domains, SSL and DNS associations active.
- Separate production Pages project exists; its Pages URL remains noindex.
- test host still has working staging content and review endpoints (HTTP 200).
- Production candidate has no staging content or review backend (HTTP 503).
- English-only review display and owner form tested and deployed to staging.
- Domain safety tests run via .github/workflows/cloudflare-domain-preflight.yml.
- Existing staging build, SEO, browser and chat tests run in Cloudflare workflow.
- No traffic, real Google rankings or indexing are claimed before verification.

## Must do BEFORE routing witnesslema.com to production

1. Establish verified client ownership/admin recovery and billing for registrar,
   Cloudflare, production Supabase, and Search Console; no shared passwords.
2. Create a **separate, client-owned production Supabase project** (not
   lema_staging, not the dummy transfer trial) with approved billing. Confirm
   project-creation costs/organization before creating it.
3. Apply reviewed schema/migrations, RLS and private function protections to the
   new database. Copy only owner-approved content and RAG knowledge; do not
   silently copy test reviews, user sessions, test submissions or credentials.
4. Provision separate media storage and per-production runtime secrets,
   admin authentication and API keys. Never use staging credentials. Test
   authorized and unauthorized writes, file uploads, chatbot and reviews.
5. Set production Pages env SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
   SEO_SITE_ORIGIN=https://witnesslema.com, and production-only secrets.
   Keep SEO_INDEXING_ENABLED=false until all checks pass.
6. Obtain owner approval for biography, rates, photos/licences, services,
   reviews and policy text. Never auto-generate false testimonials or areas.
7. Re-run HTTPS, media, admin, review, AI, contact handoff, canonical and
   sitemap checks on the production-candidate Pages URL.
8. After a successful preview, move witnesslema.com and www.witnesslema.com
   custom-domain bindings and DNS from the staging Pages project to the
   production Pages project. Leave test.witnesslema.com on staging.
9. Verify main and test public endpoints return independently sourced data.
   Perform a test edit on test.witnesslema.com, ensuring main is unchanged.
10. Configure www -> apex redirect and confirm canonical, robots, XML sitemap,
    structured data, 404 handling and safe adult-content classification.
11. Only then enable indexing for approved public routes on the live canonical
    host. Temporary *.pages.dev and test hosts must remain noindex. Verify
    HTTPS domain ownership in Google Search Console and submit the sitemap.
12. Retarget monitoring to the **actual** production host. Keep staging checks
    separate; do not confuse uptime with Google indexing or ranking.

## Rollback

Preserve the last good production deployment ID and Pages configuration.
If production breaks after domain routing, disable indexing if necessary,
restore the previous known-good production deployment and variables or
temporarily route the domain back to the verified stable deployment.
Avoid reversing production database migrations without an explicit
tested rollback plan. Never route clients to the dummy trial database.

## Current blockers (not automatic)

- No connected, owner-approved dedicated production Supabase project.
- Main domain still assigned to staging Pages; no public isolation yet.
- Lema ownership of registrar, Cloudflare, Supabase and GSC unverified.
- Witness Lema custom domain not connected as a verified GSC Wizard property.
- Owner approval of actual content and end-to-end production writes pending.

## Connected workflows

- Staging release: .github/workflows/cloudflare-staging.yml
- Production candidate first deploy: .github/workflows/cloudflare-production-candidate.yml
- Domain and backend guard: .github/workflows/cloudflare-domain-preflight.yml
- Health worker: workers/lema-search-health.mjs
- Public admin/SEO controls: middleware.js, functions/_middleware.js

Do not use Vercel. Do not enable paid SERP tracking or add Google Ads without
category/policy review. Search engine inclusion and rankings are not guaranteed.
