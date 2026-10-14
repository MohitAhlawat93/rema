# Witness Lema — website, owner dashboard, and SEO

Live repository: `MohitAhlawat93/rema`. The website is built as prerendered HTML/CSS/JS and deployed to a Cloudflare Pages staging environment; owner updates and public Q&A live in a separate, restricted Witness Lema namespace in Supabase.

## Implemented

- Home, About, Gallery, Services, Contact, Privacy and 404 pages; accessible navigation, photo gallery and reduced-motion controls.
- Owner dashboard at `/admin`: profile/links, services, photos, assistant settings and knowledge, private draft, publish and restore.
- Backend login protection, restricted writes, distributed request limits, database version checks, and server-side content validation.
- Concierge FAQ/knowledge retrieval with controlled AI fallback.
- SEO based on selected design patterns from Rebecca: owner-editable page settings and factual on-page supporting copy, server-generated metadata and structured data, canonical URLs, XML and image sitemaps, safe indexing modes, and CI validation.

## Where to edit

| Change | Location |
| --- | --- |
| Public profile, service options, image order and alt text, contact links, assistant answers | [Owner admin](/admin) |
| Published search titles, descriptions, previews and page indexing controls | Owner dashboard `/admin` (Google SEO); `seo/site.config.mjs` supplies safe build defaults |
| Visible supporting page copy and contextual internal links | [seo/editorial.config.mjs](seo/editorial.config.mjs) |
| Base fallback website content in GitHub | [data/site.js](data/site.js) |
| Gallery source-image metadata | [data/gallery.json](data/gallery.json) |
| Layout and styles | [scripts/build.mjs](scripts/build.mjs), [public/styles.css](public/styles.css) |
| Cloudflare staging monitoring | [workers/lema-search-health.mjs](workers/lema-search-health.mjs), [docs/CLOUDFLARE_SEARCH_GROWTH.md](docs/CLOUDFLARE_SEARCH_GROWTH.md) |
| Search verification, owner steps, domain setup | [docs/SEO_GUIDE.md](docs/SEO_GUIDE.md) |
| Actual search result competition and growth monitoring | [docs/SEARCH_GROWTH_PLAYBOOK.md](docs/SEARCH_GROWTH_PLAYBOOK.md) |

## Build and verification

Node 22+ and no npm dependencies:

```bash
npm run build
npm test
npm run validate:seo

# Local simulation of public production indexing (on Unix/macOS):
SEO_INDEXING_ENABLED=true npm run build
SEO_INDEXING_ENABLED=true npm run validate:seo
```

GitHub Actions checks preview-style and production-style indexing. The Cloudflare deployment workflow is `.github/workflows/cloudflare-staging.yml`; it runs tests, then uploads to **Cloudflare Pages**, using the restricted staging credential. Bundle tested changes into one deployment to minimize build usage. The client-owned domain is pending and staging stays **noindex**.

## Important limitations

- Cloudflare staging is at `https://lema-website-staging.pages.dev/`. The client's approved custom domain and Google Search Console ownership are pending verification. Google indexing and rankings are not guaranteed.
- The Cloudflare Pages middleware reads published Supabase data and renders SEO metadata and owner-approved content in the initial HTML; static build defaults remain fallback. Changes must be verified in the actual HTTP response, including canonicals and indexing rules.
- The Contact form prepares/copies an enquiry but does not deliver it.
- This adult-oriented site may be filtered by Google SafeSearch. Only publish accurate, owner-approved content and licensed images. Never invent ratings, reviews, extra service areas, or client testimonials.
- Credentials and private Supabase admin state must not be committed to GitHub.

Source-reuse notes: [docs/SOURCE_REUSE.md](docs/SOURCE_REUSE.md).
