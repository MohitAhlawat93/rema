# Witness Lema — owner handover and launch runbook

> **Status: preparation only.** No owner has signed off on the words, rates, services or images. Do not assert owner approval merely because the build succeeds. Never store account recovery codes, personal ID documents or passwords in this repository.

## 1. Owner-led approval gate

The owner must open the private dashboard, review the **actual saved draft**, and explicitly authorize:
- Brand, name, location, identity/biographical claims and all visible Home/About/Contact/Privacy copy
- Every listed service and its duration, availability, price/currency/conditions, and legal compliance
- The entire Gallery (currently 21 photos), all Home/About selections, authenticity, depiction and the right to use and publish each image
- All contact destinations (WhatsApp and any social channels) and who receives visitor enquiries
- The assistant welcome text, stored answers and any claims about booking or verification
- The six SEO titles/descriptions and editorial paragraphs, particularly the Reviews page and its public-submission policy
- Consent for any genuine testimonials; the website must not invent review ratings or quotes
- Any age, consent, content, advertising or platform compliance required in the intended region

**Do not publish pending drafts for testing.** The owner can sign the private approval packet independently of public website access. If any claim, rate, photo or service remains disputed, keep it private and correct it before publishing. Archive the dated approval outside the public repository.

## 2. Client-owned accounts — in this order

1. Lema creates and controls her own primary Google account (recovery phone, recovery email, 2FA/passkey). The developer must not own the recovery channel. A free Google account can be used for Search Console. A matching branded mailbox requires a paid email provider such as Google Workspace, and is optional.
2. Lema chooses and purchases her preferred domain **in her own name and billing account**. Do not register a name merely because an availability lookup returned available. Renewals, legal terms and pricing require owner acceptance.
3. Give Lema ownership of Vercel, GitHub, and a new **isolated Supabase project**; give the developer least-privilege collaborator access. Current dev Supabase contains unrelated tenants; move only `witness_lema_*` data and its permissions.
4. Export and verify: private owner draft/published versions/history, 21 image assets and storage, 62 approved chatbot records (counts vary over time), review submissions, schema migrations, Edge functions and secrets. Run a rehearsed restore on the new Supabase project before switching production.
5. Move the approved Vercel project/domain and DNS into Lema's ownership. Rotate admin session/login credentials and backend secrets during transfer, update Vercel envs to the new isolated Supabase URL and client-provisioned service keys.
6. In Vercel add/verify the domain, choose the primary hostname (e.g. `https://example.com`), arrange HTTPS and redirect the old public hostname. Set Production `SEO_SITE_ORIGIN` to the new canonical origin, perform a production deployment and verify links, WhatsApp, sitemap and SEO.
7. Keep transfer/rollback plan, DNS records and recovery details in Lema's secure password manager, **not** in repository issues.

## 3. Search Console and sitemap

- Sign in **as Lema**, go to https://search.google.com/search-console/ and add a **Domain property** for her owned branded domain. Google will provide a property-specific DNS TXT record.
- Add the TXT record at Lema's DNS provider; verify ownership **from her Google account**. Do not fabricate a verification token or use the developer's account as the final sole owner.
- Check `https://<owner-domain>/robots.txt`, `/sitemap.xml`, and `/image-sitemap.xml`; the canonical domain must match `SEO_SITE_ORIGIN`.
- In Search Console → Sitemaps, submit `https://<owner-domain>/sitemap.xml` (submit image sitemap too if desired). Save submission status and date in the owner handover register.
- Inspect Home, Services, About, Gallery, Contact and Reviews URLs and check indexing visibility and rendered canonical. Google may choose not to index some adult-oriented pages; submission is not a ranking or indexing guarantee.
- GSC Wizard can read/analyze connected properties after the owner's Google account and property exist. It cannot create an unowned Google property by itself.

## 4. Browser and network release gates

The GitHub workflow `Full browser audit — desktop, mobile, slow network` tests Home, About, Gallery, Services, Reviews, Contact, Privacy, owner sign-in and 404 at desktop/mobile and simulated slowed speeds; it uploads screenshots and a page-matrix report. The standard `Browser QA — chatbot and WhatsApp` workflow tests the automatic popup and WhatsApp UI. These are **code/build tests**, not a substitute for checking the owner-controlled published data on the real device.

Before accepting handover:
- Confirm all release workflows are green and review screenshots for visual correctness; fix any horizontal scrolling or broken images.
- Test keyboard navigation, browser back, chatbot, gallery filters, review form, WhatsApp opening, admin login and draft/publish in a real browser.
- Check every contact link with the owner; do not send messages or place calls to real recipients merely as an unannounced test.
- Record real mobile field performance with Lighthouse or PageSpeed Insights separately, because simulated 3G and local build results are not field Core Web Vitals.

## 5. Final handover acceptance (owner completes)

- [ ] Final text, identity claims and all service rates signed off
- [ ] All 21 photos signed off for authenticity and legal publication rights
- [ ] Contact accounts and assistant responses confirmed
- [ ] Client owns the Google login, domain billing, Vercel/GitHub and isolated Supabase
- [ ] Client has recovery access and working secure admin login
- [ ] Canonical hostname, DNS, SSL and all site assets pass checks
- [ ] Search Console property verified under client Google account
- [ ] Sitemap successfully submitted on the new hostname
- [ ] Owner has completed end-to-end contact/reviews/draft/publish check
- [ ] Backup and rollback procedure demonstrated
