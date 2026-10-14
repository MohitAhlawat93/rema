# Cloudflare Search Growth — Phase 0 (2026-10-14)

This implementation is limited to staging until the client-owned domain is ready.
No Vercel deployment or configuration changes are part of this rollout.

## Cloudflare resources

Website: https://lema-website-staging.pages.dev/
Monitor: https://lema-search-health.amohit920.workers.dev/status
Source: workers/lema-search-health.mjs on branch feat/cloudflare-client-handover
KV: lema_staging_search_health, binding HEALTH_KV
Cron: 0 6 * * * (06:00 UTC / 11:30 AM India daily)

## Implemented behavior

The Worker checks ten fixed staging routes for HTTP errors, missing metadata,
missing headings, sitemap/robots issues, inadvertent indexability and old
Vercel canonical references. It stores the latest summarized findings in KV.
An initial GET /status generates its first report if storage is empty;
subsequent reads use the saved snapshot until the daily scheduled job refreshes.
Its report contains no personal data, visitor tracking or ranking assertions.

Run node --test test/search-health.test.mjs to test the monitor logic.

## Important boundaries

- Keep staging and trial deployment isolation. Do not enable staging indexing.
- Do not deploy to Vercel or move production before the domain is approved.
- Do not create fake Google rankings or claim search visibility without real data.
- Do not enable paid geographic SERP API requests before budget approval.
- Do not insert private coordinates or visitor conversation transcripts into reports.
- The Pages staging project uses direct uploads. Editing the GitHub branch alone
  does not publish a new Cloudflare Pages website version.

## Next milestones

1. Verify first live Worker status and address any genuine findings.
2. Audit Cloudflare Pages HTML publishing, canonicals and failure fallbacks.
3. Attach the approved client-owned domain to the correct Cloudflare project.
4. Connect the verified domain to Google Search Console.
5. Integrate owner-only Growth dashboard cards and evidence-backed recommendations.
6. Start a low-cost geographic ranking pilot after launch and client approval.
