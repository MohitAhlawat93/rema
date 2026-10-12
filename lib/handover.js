// Public descriptions only. Ownership evidence is stored privately on the server.
export const HANDOVER_STEPS=Object.freeze([
  {
    "id": "business-approval",
    "title": "Business content & image rights",
    "description": "Approve all public copy, services, prices, images, privacy wording and assistant knowledge.",
    "tab": "business"
  },
  {
    "id": "source-agreement",
    "title": "Source and service agreement",
    "description": "Choose managed, client-owned or full-source delivery and sign a licence/support and exit agreement.",
    "tab": "handover"
  },
  {
    "id": "email-domain",
    "title": "Client-owned email and domain",
    "description": "Create owner-controlled email and domain accounts, with owner billing and recovery access.",
    "tab": "business"
  },
  {
    "id": "hosting-ownership",
    "title": "Client-owned hosting",
    "description": "Invite or transfer control to the approved owner/team and independently verify billing/permissions.",
    "tab": "handover"
  },
  {
    "id": "isolated-database",
    "title": "Isolated client database",
    "description": "Migrate only Lema content/files/functions to a dedicated project, verify RLS and no cross-client access.",
    "tab": "handover"
  },
  {
    "id": "client-api-keys",
    "title": "Scoped keys and access",
    "description": "Issue client-authorized keys, rotate signing secrets, replace shared server credentials.",
    "tab": "handover"
  },
  {
    "id": "google-search",
    "title": "Google Search Console",
    "description": "Verify the owner’s Search Console property and submit the live, canonical sitemap.",
    "tab": "seo"
  },
  {
    "id": "backups-restore",
    "title": "Restorable backup and export",
    "description": "Create a true database/storage backup and perform a tested restore; the website JSON export is not a backup.",
    "tab": "handover"
  },
  {
    "id": "live-qa",
    "title": "Release acceptance",
    "description": "Check mobile, desktop, slow network, forms, WhatsApp, chatbot, reviews, accessibility and permissions.",
    "tab": "handover"
  },
  {
    "id": "final-acceptance",
    "title": "Owner sign-off and exit",
    "description": "Verify ownership evidence, signed acceptance, export portability and support/exit commitments.",
    "tab": "handover"
  }
]);
export const HANDOVER_MODES=Object.freeze(['undecided','managed','client_owned','full_source']);
export const HANDOVER_STATUSES=Object.freeze(['todo','in_progress','submitted']);
export const blankProgress=()=>Object.fromEntries(HANDOVER_STEPS.map(s=>[s.id,'todo']));
export function validateHandoverUpdate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return 'Invalid handover request.';
 if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)return 'Invalid handover version.';
 if(!HANDOVER_MODES.includes(input.saleModel))return 'Invalid handover model.';
 if(!input.progress||typeof input.progress!=='object'||Array.isArray(input.progress))return 'Invalid handover progress.';
 const known=new Set(HANDOVER_STEPS.map(s=>s.id));
 if(Object.keys(input.progress).some(id=>!known.has(id)))return 'Unknown handover requirement.';
 if(Object.values(input.progress).some(v=>!HANDOVER_STATUSES.includes(v)))return 'Invalid handover status.';
 if(JSON.stringify(input).length>3500)return 'Handover request is too large.';
 return '';
}
export function handoverIndicators(env={}){
 const origin=String(env.SEO_SITE_ORIGIN||'');
 const url=String(env.SUPABASE_URL||'');
 return [
  {id:'admin',label:'Owner sign-in is configured',configured:Boolean(env.SIGNATURE_ADMIN_LOGIN_ID&&env.SIGNATURE_ADMIN_PASSWORD_HASH&&env.SIGNATURE_SESSION_SECRET)},
  {id:'published-db',label:'A website database endpoint is configured',configured:Boolean(/^https:\/\/[^/]+/.test(url)&&env.SUPABASE_PUBLISHABLE_KEY)},
  {id:'isolated-db',label:'Database URL differs from the known shared project (not proof of ownership)',configured:Boolean(url&&/^https:\/\//.test(url)&&!url.includes('rhwefssbnhmsypnjdfcl.supabase.co'))},
  {id:'canonical',label:'Verified-domain deployment setting is present (not proof of DNS ownership)',configured:Boolean(/^https:\/\/[^/]+$/.test(origin)&&origin!=='https://rema-ruby.vercel.app')},
  {id:'ai',label:'AI provider key is configured (not proof of client billing)',configured:Boolean(env.GROQ_API_KEY||env.XAI_API_KEY)},
  {id:'gsc',label:'Search Console verification token is configured (not proof of verified property)',configured:Boolean(env.GOOGLE_SITE_VERIFICATION)}
 ];
}
