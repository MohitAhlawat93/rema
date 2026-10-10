# Editing witness_lema_

All paths below are in `MohitAhlawat93/rema`, branch `main`. Use GitHub’s pencil button to edit a file, then Commit changes. Vercel builds from the connected repository; wait for a READY deployment before checking the live page. Never edit generated `dist` files.

## About and homepage

Edit `data/site.js`:

- `about.title`: large About page title. `\n` adds a line break.
- `about.heading`: heading beside the portrait.
- `about.text`: main introduction.
- `about.paragraphs`: extra paragraphs, e.g. `["First paragraph.", "Second paragraph."]`.
- `profileFacts`: optional labelled facts, e.g. `[{ label: 'Languages', value: 'English' }]`.
- `hero.title` and `hero.intro`: homepage headline and short introduction.
- `servicesIntro`: introductory text on Services.
- `services`: owner-approved general professional descriptions with `number`, `title`, `text`, and optional `tag`. Empty list hides the rows.
- `social.whatsapp`, `social.telegram`, `social.instagram`: HTTPS links. Empty strings hide links. The current Instagram link opens a reel, not a profile.

Text is safely rendered as plain text. Do not paste HTML. Preserve commas, brackets and quotes; escape apostrophes inside single-quoted strings or use double quotes for that text.

## Upload gallery photographs

1. Open `public/images/gallery/` in GitHub.
2. Choose **Add file → Upload files**.
3. Upload JPG, JPEG, PNG, WebP or AVIF photos. Recommended: WebP/JPG around 1600–2000 pixels on the longest side, under 500 KB when practical.
4. Give every file a unique, simple lowercase name: `portrait-01.webp`, `portrait-02.jpg`, `outdoor-01.jpg`. No required special name. Avoid spaces and keep extension/capitalization exact.
5. Commit uploads.
6. Edit `data/gallery.json` and add one object per image:

```json
{
  "src": "/images/gallery/portrait-01.webp",
  "alt": "Describe what is in this photograph",
  "title": "A quiet moment",
  "category": "Portraits",
  "hero": true,
  "reference": false
}
```

The public URL omits the `public` prefix. `public/images/gallery/portrait-01.webp` becomes `/images/gallery/portrait-01.webp`.

- Order of objects = order in gallery.
- `hero: true` = also include it in the rotating homepage background.
- First two entries = homepage selected photos and layered introduction; first entry also appears on About.
- Set `reference: false` only for actual approved owner photos. When all reference entries are replaced, the small gallery reference note disappears automatically.
- Categories create their own filter buttons. Gallery count is automatic; there is no four-image limit.
- Keep at least two entries for the current layered layout. Set at least one image to `hero: true`.
- Uploading a file alone does not display it: you must add the JSON entry too.
- Remove old reference image entries when replacing them. Do not merely add new photographs after the references if you want the new photos in the hero/About.

JSON uses double quotes and no trailing comma after the final item. The build checks local image paths so a misspelled filename fails deployment instead of publishing a broken photo.

## Assistant data today

Edit `data/assistant/knowledge.json`. Each object contains:

```json
{
  "question": "How can I get in touch?",
  "answer": "Use the WhatsApp button on Contact.",
  "keywords": ["contact", "whatsapp", "message"],
  "href": "/contact/"
}
```

`keywords` drive the current local FAQ matching. `href` should be an existing internal page, e.g. `/about/`, `/services/`, `/gallery/` or `/contact/`.

This is public content bundled into the website, not private knowledge storage. Do not add secrets, private addresses, identification documents or internal instructions. The current helper is not an LLM or vector RAG system.

## Planned Supabase RAG

Supabase is not connected in this release. Before implementation, identify the intended Supabase project and generation/embedding provider. Never paste secret keys into GitHub files or chat; store server-only credentials through the hosting provider’s environment-variable controls.

Planned flow: owner-approved public source documents → indexed chunks in Supabase → server-side retrieval restricted to this client and published content → grounded assistant response. Use separate tenant ownership, protected owner uploads and versioned publication. Vercel hosts the website/API code; Supabase holds the knowledge. In that setup, editing knowledge will not require changing GitHub or redeploying website code.

Start by providing the target project name/ID. No existing client database or credentials have been reused. The JSON file remains the current FAQ source until that integration is built and verified.
