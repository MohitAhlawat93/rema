# Witness Lema — Search Growth & Competition Playbook

This is an owner-operated, evidence-based workflow. No keyword rank, search traffic, competitor strength or customer rating is claimed without live data.

## 1. Assign one clear purpose to each existing page

| Page | Visitor need | Relevant search themes (not promises of ranking) | Original content to maintain |
| --- | --- | --- | --- |
| Home | Find the genuine website | Witness Lema, Lema Gurgaon, official Witness Lema | A concise overview with clear About / Gallery / Services / Contact links |
| About | Understand the person behind the website | Witness Lema profile, Lema Kenyan Gurgaon | Owner-approved biography and real portrait photos |
| Gallery | See original photographs | Witness Lema photos, Witness Lema portraits | Approved original images with descriptive, non-repetitive alt text |
| Services | Understand the available options | Witness Lema services, Lema Gurgaon arrangements | Current options, accurate descriptions and prices; confirm availability independently |
| Contact | Find the official way to make an enquiry | Contact Witness Lema, Witness Lema WhatsApp | Current contact links and a clear explanation that the enquiry form only copies text |

Don't create one near-duplicate page per Gurgaon neighbourhood, or dozens of service pages that say the same thing. Google specifically calls out doorway and scaled-content abuse.

## 2. Review the actual competing results

Every 2–4 weeks, in a private browser session:
1. Search each theme above with the appropriate SafeSearch setting and language.
2. Record the top 5 meaningful results for each non-brand query; exclude irrelevant classifieds, search advertisements, and misleading aggregators.
3. Check each result: Is it an individual site or directory? Does it have current verified details, original photos, accessible mobile experience, useful FAQs, clear contact options, current indexing?
4. Write down ONE specific value Witness Lema can genuinely add for visitors that the results don't answer.
5. Improve that one existing page. Never copy competitors' biography, images or claims.

Worksheet (replace example placeholders with genuine observations):

| Check date | Query | Actual search result URL | What users can learn there | Missing visitor question | Useful improvement for Lema |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | [search phrase] | [link you actually saw] | [description] | [question] | [small proposed edit] |

Rankings vary by location, device, query and SafeSearch; observations aren't a universal position.

## 3. Use Google Search Console every week

1. Choose your verified property.
2. Open **Performance > Search results**. Set the last 28 days.
3. Use **Queries** to see terms that generated genuine impressions and clicks. Use **Pages** to see which URLs receive visibility.
4. Compare with the previous 28 days. Note **impressions, clicks, CTR and average position**. Do not overinterpret very small samples.
5. Look for a page with impressions but few clicks. Check whether its title and description clearly match the query; improve them in [seo/site.config.mjs](../seo/site.config.mjs).
6. Look for a question that sends visitors to the wrong page. Add a clear, factual answer and an internal link in [seo/editorial.config.mjs](../seo/editorial.config.mjs) or via the owner dashboard.
7. Use **Indexing > Pages** and **URL Inspection** to investigate excluded URLs. Ensure your sitemap and canonical pages are accessible without login.
8. For photos, review **Performance > Search type: Image** when there is sufficient data.

Keep raw Google reports private; do not publish confidential exports in the public repository.

## 4. Build trust with real evidence

- Keep an honest and current About page; never invent credentials, nationality, age, awards, reviews or client experiences.
- Use images owned by / licensed to the owner. Keep captions and alt descriptions truthful.
- Keep pricing and contact channels accurate and easy to confirm.
- Clearly state the enquiry form prepares and copies text and that the user must choose a contact channel.
- Maintain a privacy notice that reflects real website behaviour, including external AI processing when applicable.
- Check local applicable laws and platform terms before advertising; code changes do not establish legal compliance.

## 5. Speed and mobile experience

Use https://pagespeed.web.dev/ on the public production URL for Home, Gallery and Services. Check real user field data once available and lab diagnostics in the meantime. Aim for **LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1** at the 75th percentile. Fix large above-fold images first, then blocking scripts, layout shifts, accessibility and unstable animations.

## 6. What you can measure — and what you cannot

- **Directly measurable:** deployment readiness, meta tags, HTML content, crawl access, Search Console impressions/clicks, mobile lab metrics.
- **Not guaranteed:** a first-page rank, a specific number of leads, Google SafeSearch visibility, Google displaying your exact meta description, or a fixed time to indexing.
- **External dependencies:** Google Search Console verification; real domain/domain redirect configuration; permitted images and factual copy; no Vercel authentication barrier.
