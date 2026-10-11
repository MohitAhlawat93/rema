# Client ownership & website handover — policy and implementation plan

**Status: Phase 1 (read-only audit and admin guidance).** This is a design/technical checklist, not confirmation that Lema's accounts or content have been approved. No migration or transfer is authorized by the existence of this document.

## Product decision: do clients receive GitHub source code?

**Not by default for a managed website.** The client receives functioning site access, ownership/control of their business content, domain and customer data, and a clear way to obtain those assets. The developer can retain its reusable template, deployment tooling and source repository under a properly disclosed, signed licence and service agreement.

**Yes, where source delivery is expressly purchased/contracted.** Deliver a **sanitized, client-specific repository** or agreed source archive (with deployment instructions). Do **not** transfer a mixed-purpose developer repository. The contract must distinguish (a) bespoke client work, (b) pre-existing reusable components, (c) third-party/OSS dependencies and licences, (d) ownership assignment versus perpetual/limited licence, and (e) ongoing maintenance obligations. A full source-code sale can warrant different pricing.

**Current warning:** `MohitAhlawat93/rema` is **public**. GitHub visitors can already view/fork public code. Switching to private does not retract prior copies, public history or any inadvertently committed secrets. Check repository history and legal/IP commitments before changing visibility. Do not claim exclusive confidentiality while public.

Contracts require appropriate legal review; do not use GitHub access as leverage to withhold client-owned content/data.

## Never transfer to a website client

- Developer's **personal GitHub, Google, Vercel, Supabase or registrar account credentials**, passkeys, recovery codes, cookies or MFA seeds.
- Reusable master templates, source code for **unrelated clients**, unrelated databases, backups, logs, training material or other customers' data.
- Developer-wide billing accounts, platform organization ownership and payment instruments (unless separately and explicitly agreed).
- Old/private signing keys, Supabase service-role keys, AI API keys or tokens that belong to the developer. Create fresh client-scoped credentials on the proper server side.
- Internal operational secrets, incident notes, client-specific sensitive records, and any repository history containing private material.
- Access to hidden or unrelated systems under the pretext of an administrative transfer.

## Must be owned or fully portable by the client

- Domain registration and renewal rights (or a clearly disclosed managed registration contract).
- Business name, original content, licensing of images, published reviews and personal/customer data subject to applicable privacy law.
- A working owner login and the right to manage content and export their own business data.
- Google Search Console property and marketing accounts, with delegated developer access where appropriate.
- Financial responsibility for selected hosting, database, email, AI provider and analytics in client-owned mode.
- Backups, restore instructions, privacy/retention and support/exit provisions.

## Supported sale models

| Model | GitHub/source | Hosting/database | Client guarantee |
| --- | --- | --- | --- |
| Managed service | Developer retains code; client has content/admin access and portable data | Developer manages dedicated or logically isolated resources per agreement | Access, support scope, export and termination rights defined in contract |
| Client-owned deployed site | Code access only if agreed; otherwise a licence to run the site with explicit continuity/exit terms | Client-owned hosting and isolated database | Full provider admin/billing access and portability |
| Full source-code handover | Sanitized client-specific repository/archive, license/assignment documents and build instructions | Client-owned resources | Can independently deploy and maintain the delivered site subject to licensed third-party components |

**Avoid the trap:** a 'client-owned site' without source, reproducible deployment path, escrow or maintenance agreement may be operationally dependent on the developer. Disclose that dependency rather than presenting it as unconditional independence.

## Technical delivery sequence

1. **Phase 1 — inventory and baseline (started).** Run `npm run audit:handover`. Surface a safe checklist inside the authenticated admin panel. Capture hard-coded brand/domain/contact/CSP/function identifiers. Output file paths and dependency classes, **never secret values**. This is a static-code audit, not live provider verification.
2. **Phase 2 — centralized client config.** Define validated `business_profile` values: public brand, business/contact details, localized SEO identity, legal links, verified canonical origin, assistant identity, media and service disclosures. Refactor build, middleware, schema, SEO previews and runtime to use the same approved published values. Admin edits go to private draft, preview, then publish. Preserve site continuity.
3. **Phase 3 — provider setup engine.** Define protected backend connectors for domain/DNS, Vercel, Supabase and optional AI/Google APIs using scoped OAuth or provider tokens. Owner signs in at the provider and approves required scopes; do not ask for passwords. Store server-side secrets in a vault/provider secrets store, never in ordinary content/SEO tables.
4. **Phase 4 — isolated data migration.** Provision a fresh client Supabase project; migrate only `witness_lema_*` tables and Lema-specific storage, functions, policies, triggers, roles and approved chatbot knowledge. Rebuild policies and test RLS/backup restore. The current `dance_booking` Supabase project contains unrelated client/application tables and **must not be transferred wholesale**.
5. **Phase 5 — domain and SEO rollout.** Client purchases a domain; verify TXT/DNS ownership, TLS, primary redirects, production `SEO_SITE_ORIGIN`, 200 pages, correct page-level canonicals/schema/image sitemap and Search Console property. Only after OAuth + property ownership may the app submit sitemaps. Submission is not an indexing guarantee.
6. **Phase 6 — release and acceptance.** Test all pages on mobile, desktop and slower connections, contact and reviews flows, AI replies, permission boundaries, logs, monitor/backup and restore. Rotate secrets and sessions after cutover. Record owner approvals and release a signed handover manifest containing resource IDs/URLs, not secret values.
7. **Phase 7 — repeatable template.** Separate the reusable product/tooling repo from individual client deployment repos. New clients start with owned resources in full-handover mode instead of requiring complex late migrations.

## Handover acceptance rules

Automated *verified* statuses require fresh evidence from relevant authenticated provider APIs. Never mark accounts 'connected', billing 'owned', content 'approved', backups 'restorable' or SEO 'verified' based solely on a form value or a hard-coded URL. Verification failure must not silently become a pass.

Keep the current live site unchanged until a staged backup and a reviewed cutover plan exist. Never automatically transfer GitHub repositories, change registrar settings, switch DNS or rotate production secrets by pressing a generic 'finish setup' button. Use an explicit, owner-approved confirmation gate per irreversible operation.

## Phase-1 commands

```sh
npm run audit:handover
npm run audit:handover -- --json
npm run audit:handover -- --strict  # intentionally fails while code refactors remain
npm test
```

The report is a starting point, not proof of successful ownership transfer.
