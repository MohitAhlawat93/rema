# Élanora Signature — Anora demonstration

A middle-tier personal portfolio built selectively from the Rebecca project’s neutral design and interaction patterns. Target repository: `MohitAhlawat93/rema`. No Anora repository code was used.

## Current delivery: SIGNATURE-01

- Five prerendered pages: Home, About, Gallery, Work and Contact.
- Ivory, charcoal and bronze editorial layout with responsive navigation.
- Filtered gallery, native full-screen dialog, keyboard stepping and return focus.
- Click-to-open compact FAQ assistant sharing the published content model.
- Enquiry preparation and clipboard fallback; **does not send enquiries**.
- Privacy page, 404, security headers and deliberately disabled indexing.
- Isolated authentication/origin helpers adapted from Rebecca, tested but **not connected to an admin endpoint**.

This is a design demo, not a production launch. Abstract local SVG studies are explicitly labelled placeholders. No Rebecca photographs, biography, rates, contacts, credentials or database configuration were copied. Personal biography, approved photos, professional offerings and contact destinations still need verified owner content. Sample copy does not represent confirmed facts about Anora.

## Run

Node 22 or later; no package dependencies.

```sh
npm run build
npm test
npm start
```

Open `http://127.0.0.1:3000`. On Vercel use the supplied build command and `dist` output directory. No domain is hardcoded and no external services are contacted by this stage.

## Edit locations

| Content | File |
| --- | --- |
| Profile, sample offerings, image metadata, FAQs | `data/site.js` |
| Page composition and shared shell | `scripts/build.mjs` |
| Design and responsive behaviour | `public/styles.css` |
| Gallery, navigation, FAQ and enquiry UI | `public/app.js` |
| Local artwork | `public/assets/` |
| FAQ matching | `lib/faq.js` |

Build after editing content. Normal edits become deployment-free only when SIGNATURE-02 persistence is implemented.

## Remaining stages

**SIGNATURE-02:** authenticated four-area owner dashboard (Content, Photos, Assistant, Settings & Insights), one coordinated persisted draft, private preview, atomic publish and recoverable versions. Use separate client storage and credentials. Do not connect this client to Rebecca's runtime stores.

**SIGNATURE-03:** server-side grounded AI, service limits and pause control, verified enquiry destination and spam controls, canonical URLs/sitemap/social previews after the final domain is known, configured basic insights. The current assistant is a deterministic local FAQ helper, not a live AI model.

**SIGNATURE-04:** browser/mobile acceptance, real provider and persistence tests, recovery verification and owner instructions. Remove demo copy and indexing restrictions only after approved content and launch checks.

No admin, upload, Publish or analytics buttons are shown until their backing services exist. The imported authentication code is groundwork, not a claim of production security readiness. Distributed login throttling remains required when sign-in is wired.

See `docs/SOURCE_REUSE.md` for provenance and scope decisions.
