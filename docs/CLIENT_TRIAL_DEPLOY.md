# Customer-trial deploy — isolated, no source delivery

Status: Deployment pipeline prepared, **not yet executed against the customer account**.

Target: `lema-transfer-trial.pages.dev` in the dummy customer's Cloudflare Pages account.
Source: developer-controlled `feat/cloudflare-client-handover` branch.
Data: customer-owned trial Supabase project, already configured in the destination Pages environment.
Publishing: **noindex** is mandatory at build and runtime. Never point this pipeline to production or the original staging database.

## How to run without repeating setup

- Provision a **short-lived token scoped only to the trial Cloudflare account** with Account / Cloudflare Pages / Edit.
- Store it once as `CF_CUSTOMER_TRIAL_API_TOKEN` in the developer GitHub repository's encrypted Actions secrets. Never paste it into docs, commits, or client-facing admin screens.
- The developer updates `docs/client-trial-deploy-request.txt` on the feature branch to trigger one isolated deployment. The workflow does not run on each code change.
- The workflow builds and tests HTML, uploads compiled assets and Functions with Wrangler, and confirms live noindex, canonical URLs, sitemap exclusion and no original database URL in HTML.
- Remove/revoke the temporary token after the rehearsal. This token is *not* the permanent client's hosting credential.

## Photo storage without R2 billing

The 21 published photographs currently live in the checked-in static `public/images/gallery/` folder and are included by the website build. The free trial Supabase project has its own `witness-lema-gallery` public bucket, initially empty. The website upload handler falls back to its Supabase Edge Function when no R2 `MEDIA_BUCKET` is bound. This still requires a fresh, **trial-only internal authentication secret** configured consistently on Cloudflare and Supabase; until then, admin upload and publishing tests are blocked.

Do not copy contact enquiries, private reviews, session credentials, or secret keys from developer infrastructure.

## Remaining acceptance evidence

Verify new admin login and fresh session/internal secret, source independence, published image responses, upload/delete, authenticated draft/save/publish, SEO changes, reviews, chatbot under expected free-tier limits, safe backups and restoration. Revoke vendor access then confirm the owner's account can still operate. These checks cannot be marked complete merely because the deployment workflow succeeds.
