# Selective source reuse

Source: `MohitAhlawat93/rebecca_project` at commit `084f247cf462d6a005a07a81beef40a8d0d96966`.

| Source | Use in Signature |
| --- | --- |
| `styles.css` | Adapted paper/ink palette, serif/sans pairing, editorial spacing and reduced-motion pattern into a smaller stylesheet |
| `script.js` gallery block | Adapted stepping and focus-return behaviour; native dialog supplies focus containment; added filtering |
| `lib/admin-auth.js` | Copied authentication primitives; changed env/cookie/signature namespace from Rebecca to Signature |
| `lib/admin-origin-guard.js` | Reused same-origin write validation |
| Canonical data pattern | New public content model shared by prerendered pages and FAQ answers |

Included content: selected neutral public profile facts and interests from `data/rebecca-data.js`, plus the fully clothed `_DSC9687-copy.jpg` portrait from `data/rebecca-images.js`. Three abstract studies remain as clearly labelled artwork.

Excluded: rates, paid sexual-service booking/screening flows, live contact destinations, explicit image archives, tour booking, multilingual pages, growth automation, separate publishing stores, credentials, deployment links and Git history.

A new repository was already empty. Selective extraction avoids carrying Rebecca's client-specific state and large coupled admin system into the middle tier. The original repository was read only and remains unchanged.

Only `public/`, `data/site.js` and `lib/faq.js` are emitted into `dist`. Owner auth helpers are not shipped as browser files. Real owner authentication and persistence are deferred to SIGNATURE-02.
