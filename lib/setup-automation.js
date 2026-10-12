// Owner-only, read-only setup diagnostics. No provider keys are sent to browsers.
// Never accept a domain or URL from a request: probe only the deployment's trusted origin.
export const PUBLIC_PATHS=Object.freeze(['/','/about/','/gallery/','/services/','/contact/','/reviews/']);
const FALLBACK_ORIGIN='https://rema-ruby.vercel.app';
export function trustedOrigin(env={}){
 const configured=String(env.SEO_SITE_ORIGIN||'').trim();
 if(!configured)return FALLBACK_ORIGIN;
 try{
  const url=new URL(configured);
  // Approved environment configuration, never user input. Avoid path/query/port surprises.
  if(url.protocol==='https:'&&url.username===''&&url.password===''&&
     url.pathname==='/'&&!url.search&&!url.hash&&url.port===''&&
     !/^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0)$/i.test(url.hostname))
    return url.origin;
 }catch{}
 return FALLBACK_ORIGIN;
}
const check=(id,title,status,detail,action='')=>({id,title,status,detail,action});
async function probe(origin,path,fetchImpl,timeout){
 try{
  const response=await fetchImpl(origin+path,{method:'GET',redirect:'manual',
    headers:{accept:path.endsWith('.xml')?'application/xml':path.endsWith('.txt')?'text/plain':'text/html, application/json'},
    signal:AbortSignal.timeout(timeout)});
  return {ok:response.status===200,status:response.status,response};
 }catch{return {ok:false,status:0,response:null};}
}
async function limitedText(response,maxChars=4000){
 if(!response)return '';
 try{
  const value=await response.text();
  return typeof value==='string'?value.slice(0,maxChars):'';
 }catch{return '';}
}
export async function runAutomaticSetupChecks({env=process.env,fetchImpl=fetch,timeout=4000}={}){
 const origin=trustedOrigin(env);
 // GET only, bounded; no AI calls, DB writes, domains added, or secrets transmitted.
 const targets=[...PUBLIC_PATHS,'/sitemap.xml','/robots.txt','/api/site-content'];
 const responses=await Promise.all(targets.map(path=>probe(origin,path,fetchImpl,timeout)));
 const pages=responses.slice(0,PUBLIC_PATHS.length);
 const pagePass=pages.filter(p=>p.ok).length;
 const sitemap=responses[PUBLIC_PATHS.length];
 const robots=responses[PUBLIC_PATHS.length+1];
 const content=responses[PUBLIC_PATHS.length+2];
 const [sitemapText,robotsText]=await Promise.all([
  limitedText(sitemap.response),limitedText(robots.response)
 ]);
 let siteContent=null;
 try{siteContent=content.ok?await content.response.json():null;}catch{}
 const published=siteContent?.payload||null;
 const pageCheck=check('pages','Website pages',pagePass===PUBLIC_PATHS.length?'passed':'attention',
   pagePass+'/'+PUBLIC_PATHS.length+' pages responded successfully.',
   pagePass===PUBLIC_PATHS.length?'':'Some pages need fixing.');
 const sitemapPass=sitemap.ok&&/<(?:urlset|sitemapindex)(?:\s|>)/i.test(sitemapText);
 const sitemapCheck=check('sitemap','Google sitemap',sitemapPass?'passed':'attention',
   sitemapPass?'The website sitemap is accessible.':'The sitemap could not be confirmed.',
   sitemapPass?'':'Check sitemap generation and production routing.');
 const robotsPass=robots.ok&&/user-agent\s*:/i.test(robotsText);
 const robotsBlocked=robotsPass&&/disallow\s*:\s*\/\s*(?:\r?\n|$)/i.test(robotsText);
 const robotsCheck=check('robots','Search engine access',robotsPass&&!robotsBlocked?'passed':'attention',
   robotsBlocked?'Robots currently blocks crawling; verify if this is intentional.':robotsPass?'Robots instructions are accessible.':'Robots instructions could not be confirmed.',
   robotsBlocked?'Confirm search visibility settings.':'');
 const contentCheck=check('content','Website content connection',published&&typeof published==='object'&&!Array.isArray(published)?'passed':'attention',
   published?'Published website content was retrieved.':'Could not confirm the published content connection.',
   published?'':'Check the publishing API and database availability.');
 const photosOk=Array.isArray(published?.images)&&published.images.length>0;
 const photosCheck=check('photos','Published photos',photosOk?'passed':'attention',
   photosOk?'Photo references are present (image loading not checked).':'No published photo references were confirmed.',
   photosOk?'':'Review and publish the photo gallery.');
 const aiConfigured=Boolean(env.GROQ_API_KEY||env.XAI_API_KEY);
 const aiCheck=check('ai','Chatbot configuration',aiConfigured?'configured':'attention',
   aiConfigured?'An AI key is configured. Replies and billing ownership are not verified here.':'No AI key is configured.',
   aiConfigured?'':'Connect an approved AI provider securely.');
 const requested=String(published?.business?.requestedDomain||'').toLowerCase().trim();
 const brandedDomain=Boolean(env.SEO_SITE_ORIGIN&&trustedOrigin(env)!==FALLBACK_ORIGIN);
 const domainCheck=check('domain','Personal website address',brandedDomain?'configured':'owner_action',
   brandedDomain?'A custom origin is configured; domain ownership is not independently verified.':
    requested?'A requested address is saved; it is not yet connected.':'No owner-controlled custom domain is connected.',
   brandedDomain?'':'Owner chooses/purchases a domain and authorizes its connection.');
 const isolated=Boolean(env.SUPABASE_URL&&
   !String(env.SUPABASE_URL).includes('rhwefssbnhmsypnjdfcl.supabase.co'));
 const databaseCheck=check('client-database','Separate client data',isolated?'configured':'developer_action',
   isolated?'A different database endpoint is configured; access and isolation still need testing.':
   'This website still points to the shared development database.',
   isolated?'Verify RLS, backups and ownership.':'Set up a separate client database before full handover.');
 const gscConfigured=Boolean(env.GOOGLE_SITE_VERIFICATION);
 const googleCheck=check('google','Google Search Console',gscConfigured?'configured':'owner_action',
   gscConfigured?'A verification token is configured; Google property ownership and sitemap submission are not checked.':
     'The website has not configured a Google verification token.',
   gscConfigured?'Verify the Google property in Search Console.':'Owner authorizes Google Search Console for the connected domain.');
 const checks=[pageCheck,sitemapCheck,robotsCheck,contentCheck,photosCheck,aiCheck,domainCheck,databaseCheck,googleCheck];
 return {
  checkedAt:new Date().toISOString(),
  origin, // Approved configured deployment origin, not the requested/unverified domain.
  mode:'read_only',
  checks,
  summary:{passed:checks.filter(x=>x.status==='passed').length,
    configured:checks.filter(x=>x.status==='configured').length,
    needAttention:checks.filter(x=>x.status==='attention').length,
    ownerActions:checks.filter(x=>x.status==='owner_action').length,
    developerActions:checks.filter(x=>x.status==='developer_action').length},
  limitations:'These are live technical checks, not proof of legal ownership, signed approval, account billing, verified backups, or Search Console ownership. No production changes were made.'
 };
}
