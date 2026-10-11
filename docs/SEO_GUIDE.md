# Witness Lema SEO — simple editing guide

The SEO code is adapted from Rebecca but uses Lema's own pages, location, images and descriptions.

## Edit Google page titles and descriptions yourself

1. Open https://github.com/MohitAhlawat93/rema/blob/main/seo/site.config.mjs
2. Click the pencil icon (Edit).
3. Find the block for a page, like '/about/' or '/gallery/'.
4. Change its 'title' (the blue headline Google may show) and 'description' (the short text Google may show).
5. Keep the quotes and commas. Write naturally; do not stuff repeated keywords. Aim for 30–65 characters for a title and 80–160 characters for a description. The build rejects titles shorter than 10 or longer than 70 and descriptions shorter than 40 or longer than 170.
6. Change 'image' to an existing photo path, such as '/images/gallery/portrait-03.jpg', if you want a different social sharing picture.
7. Edit ALL pages first, then click 'Commit changes' ONCE so Vercel builds just once.
8. After READY deployment, visit the live site and check View Page Source for the title, description, canonical and og:image tags.

The admin dashboard at /admin changes visible content; it does not yet change HTML SEO metadata automatically. If you change the subject of a page, update its SEO settings too.

## Connecting a permanent domain

The canonical URL is currently https://rema-ruby.vercel.app.
To switch:
1. Add and verify your preferred domain in the Vercel project 'rema'.
2. In Vercel Project Settings > Environment Variables set SEO_SITE_ORIGIN to https://your-real-domain.example (replace this example with your owned domain). Choose Production.
3. Update any old-to-new domain redirects and make a single new production deployment.
4. Check /sitemap.xml, /image-sitemap.xml and /robots.txt on the new address.
5. Add the final domain in Google Search Console. A permanent branded domain is recommended before ongoing promotion.

## Google Search Console: step by step

1. Go to https://search.google.com/search-console/
2. Add a property using URL prefix: https://rema-ruby.vercel.app/ (or your final custom domain).
3. Verify ownership through one of Google's offered methods. For the HTML meta method, set GOOGLE_SITE_VERIFICATION to the supplied token in Vercel's Production environment and redeploy; DNS verification is preferred with an owned domain.
4. Open Sitemaps and submit 'sitemap.xml'. Optionally submit 'image-sitemap.xml'.
5. Use URL Inspection for the homepage, test the live URL and request indexing.
6. Check the Pages and Performance reports over time, and use https://www.bing.com/webmasters/ for Bing.
7. Confirm that the public domain does not require Vercel Authentication; Google cannot crawl a login-protected site.

## Automated behavior

- Production main pages are indexable by default; Vercel Preview and local builds have noindex.
- Set SEO_INDEXING_ENABLED=false in Production and redeploy if the site must not be listed.
- Privacy, 404, admin and API endpoints remain excluded.
- The build generates unique SEO tags, canonicals, Open Graph previews, Twitter cards, WebSite/WebPage/BreadcrumbList structured data, robots.txt, sitemap.xml and image-sitemap.xml.
- Because this is an adult-oriented service, Google SafeSearch may filter results. The generated HTML identifies adult content appropriately.
- Do not fabricate ratings, reviews, locations, or other structured data to improve rankings.

Run 'npm run build && npm test && npm run validate:seo' to check local staging output. Run 'SEO_INDEXING_ENABLED=true npm run build && npm run validate:seo' to check production-like indexing. GitHub Actions checks both.

Metadata is built from the GitHub snapshot, while the public website can also load later admin changes. If important content changed in admin after the last deployment, search-visible static HTML may be older. Synchronizing those will be a later SEO improvement.

Google indexing and ranking are not guaranteed by this implementation.
