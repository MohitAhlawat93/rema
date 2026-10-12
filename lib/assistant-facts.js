// Authoritative English-only facts and lightweight conversation-topic resolution.
// These are structured, owner-published website fields — NOT a second search index.
export const normalizeEnglish=value=>String(value??'').toLowerCase().normalize('NFKC')
 .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')
 .replace(/\bwebsits\b|\bwebstie\b|\bwebiste\b|\bwebsit\b/g,'website')
 .replace(/\bcharres\b|\bchares\b|\bchages\b|\bchargess\b|\bchargs\b/g,'charges')
 .replace(/\bpricess\b|\bprcie\b|\bpries\b/g,'prices')
 .replace(/\bvidoe\b/g,'video');

const regex={
 identity:/\b(?:whose|who owns|owner|boss|belongs to|belong to|website of|who is she|what is her name|your name|her name)\b/,
 assistant:/\b(?:what do you do|what you do|your job|your role|work for her|work for him|help her|help him|purpose|who are you)\b/,
 video:/\b(?:video(?:call)?|video call|camera call|online call|virtual call|cam call)\b/,
 incall:/\b(?:in call|incall|at her place|her place|at your place|visit her)\b/,
 outcall:/\b(?:out call|outcall|hotel|my place|my hotel|comes to me)\b/,
 overnight:/\b(?:overnight|all night|full night|whole night)\b/,
 dinner:/\b(?:dinner|coffee date|dining)\b/,
 private:/\b(?:private|intimate|one on one|one to one|exclusive)\b/,
 pricing:/\b(?:charges?|prices?|pricing|rates?|cost|fees?|pay|how much|amount|tariff|rupees|rs|inr)\b/,
 services:/\b(?:services?|offer(?:s|ed)?|options|experiences?|available services|menu)\b/,
 contact:/\b(?:contact|whatsapp|phone|telephone|call her|message her|reach her|text her|connect with)\b/,
 gallery:/\b(?:gallery|photos?|pictures?|images?|portraits?)\b/,
 location:/\b(?:where is she|where is (?:lema|her place)|based|location|city|address|where does she live)\b/,
 availability:/\b(?:available|availability|free today|free tomorrow|meet tomorrow|meet today|appointment|slots?|book now|when can i meet|tomorrow|tonight|today)\b/,
 sensitive:/\b(?:threesome|3some|three some|three way|group sex|duo|couple session|two girls|swinging|lives alone|live alone|exact address|home address|private address)\b/
};
const followup=/^(?:and\b|what about\b|how about\b|how much\b|what is it\b|what does it\b|is it\b|does it\b|it\b|that\b|those\b|same\b|then\b|also\b|or\b|why\b)/;
function lastTopic(history){
 const users=(Array.isArray(history)?history:[]).filter(x=>x?.role==='user'&&typeof x.content==='string').slice(-3);
 for(const x of users.reverse()){
  const q=normalizeEnglish(x.content);
  if(regex.video.test(q))return 'video';
  if(regex.incall.test(q))return 'incall';
  if(regex.outcall.test(q))return 'outcall';
  if(regex.overnight.test(q))return 'overnight';
  if(regex.private.test(q))return 'private';
  if(regex.pricing.test(q))return 'pricing';
  if(regex.services.test(q))return 'services';
  if(regex.contact.test(q))return 'contact';
  if(regex.gallery.test(q))return 'gallery';
  if(regex.identity.test(q))return 'identity';
 }
 return '';
}
export function interpretQuestion(question,history=[]){
 const text=normalizeEnglish(question);
 const previous=lastTopic(history);
 const refersBack=followup.test(text)||/^(?:how much|how many|why|and|what about)(?:\s+is it)?$/.test(text);
 const kind=regex.sensitive.test(text)?'sensitive':
  regex.assistant.test(text)?'purpose':
  regex.identity.test(text)?'identity':
  regex.availability.test(text)&&!regex.pricing.test(text)?'availability':
  regex.contact.test(text)?'contact':
  regex.gallery.test(text)&&!regex.pricing.test(text)?'gallery':
  regex.location.test(text)?'location':
  regex.pricing.test(text)?'pricing':
  regex.services.test(text)?'services':
  refersBack&&previous==='pricing'?'pricing':
  refersBack&&previous==='identity'?'purpose':
  'vector';
 let topic=regex.video.test(text)?'video':
  regex.incall.test(text)?'incall':
  regex.outcall.test(text)?'outcall':
  regex.overnight.test(text)?'overnight':
  regex.dinner.test(text)?'dinner':
  regex.private.test(text)?'private':
  refersBack?previous:'';
 const duration=/\b(?:2|two)\s*(?:hour|hr)/.test(text)?2:/\b(?:1|one)\s*(?:hour|hr)/.test(text)?1:null;
 return {kind,topic,duration,previousTopic:previous,followup:refersBack,normalized:text};
}
export function ownerName(site={}){
 const assistant=String(site.assistant?.name||'').trim().replace(/\s+(?:concierge|assistant|chatbot|bot)$/i,'').trim();
 if(assistant&&!/^(website|site|ai|my|the|virtual|digital)$/i.test(assistant))return assistant;
 const publicName=String(site.business?.name||site.name||'').trim().replace(/^witness[\s_-]+/i,'').replace(/_/g,' ').trim();
 return publicName&&!/^(website|site|brand|business)$/i.test(publicName)?publicName:'the website owner';
}
export function verifiedFactAnswer(question,site={},history=[]){
 const parsed=interpretQuestion(question,history);
 const owner=ownerName(site);
 const rows=(Array.isArray(site.services)?site.services:[]).filter(row=>row&&typeof row.title==='string'&&row.title.trim());
 const pricing=rows.filter(row=>typeof row.tag==='string'&&row.tag.trim());
 const lower=row=>normalizeEnglish(row.title);
 const select=topic=>pricing.filter(row=>
  topic==='video'?/\bvideo\b/.test(lower(row)):
  topic==='incall'?/\bincall\b|\bin call\b/.test(lower(row)):
  topic==='outcall'?/\boutcall\b|\bout call\b/.test(lower(row)):
  topic==='overnight'?/\bovernight\b|\bfull night\b/.test(lower(row)):
  topic==='dinner'?/\bdinner\b/.test(lower(row)):false);
 const result=(answer,source='structured',href='',needsReview=false)=>({answer,source,href,intent:parsed.kind,topic:parsed.topic||'general',needsReview});
 switch(parsed.kind){
 case 'identity':
  return result('This is '+owner+"'s website. I am the website assistant helping visitors find published information.");
 case 'purpose':
  return result('I help visitors learn about '+owner+"'s published services, prices, profile, and ways to get in touch.");
 case 'availability':
  return result('I cannot view live availability or confirm a booking. Please contact '+owner+' directly to check dates and times.','structured','/contact/');
 case 'contact':
  return result('You can reach '+owner+' using the official links on the Contact page.','structured','/contact/');
 case 'gallery':
  return result('You can view the published photos on the Gallery page.','structured','/gallery/');
 case 'location':
  return result('Please check the About page for the published location. An exact private address is not confirmed here.','structured','/about/');
 case 'sensitive': {
  const approved=new Set(String(site.assistant?.verifiedSensitiveClaims||'').toLowerCase().split(/[,\n]/).map(x=>x.trim()).filter(Boolean));
  const key=/threesome|3some|three some|three way/.test(parsed.normalized)?'threesome':
   /live alone|lives alone|address/.test(parsed.normalized)?'private residence':'couple session';
  if(!approved.has(key))return result('I cannot confirm that arrangement from explicitly owner-verified information. Please ask '+owner+' directly through the Contact page.','needs-verification','/contact/',true);
  return null; // An explicitly approved topic still requires vector-grounded evidence.
 }
 case 'pricing': {
  if(parsed.topic==='private')return result('Do you mean an incall or an outcall, and for how many hours? The Services page lists the published starting rates.','clarification','/services/');
  if(parsed.topic){
   let options=select(parsed.topic);
   if(parsed.duration)options=options.filter(row=>new RegExp('(?:\\b'+parsed.duration+'\\b|\\b'+(parsed.duration===2?'two':'one')+'\\b)\\s*(?:hour|hr)').test(lower(row)));
   if(options.length===1)return result('The published rate for '+options[0].title+' is '+options[0].tag+'. Please confirm current availability directly.','structured','/services/');
   if(options.length>1)return result('Published rates: '+options.map(row=>row.title+' — '+row.tag).join('; ')+'.','structured','/services/');
   return result('That specific price is not listed in the published Services page. Please confirm through Contact.','clarification','/contact/');
  }
  if(pricing.length){
   const listed=pricing.filter(row=>/\b(?:from|₹|rs\b|inr\b|per|\/\s*\d)/i.test(row.tag)).slice(0,10);
   if(listed.length)return result('Published starting rates: '+listed.map(row=>row.title+' — '+row.tag).join('; ')+'. For current details, please use Contact.','structured','/services/');
  }
  return result('I cannot find a published price yet. Please use the Contact page for current rates.','clarification','/contact/');
 }
 default:return null;
 }
}
export function resolvedRetrievalQuery(question,history=[]){
 const parsed=interpretQuestion(question,history);
 if(parsed.followup&&parsed.previousTopic){
  const last=(Array.isArray(history)?history:[]).filter(x=>x?.role==='user').at(-1)?.content;
  if(last)return String(last).slice(0,250)+'; follow-up: '+String(question).slice(0,300);
 }
 return String(question).slice(0,500);
}

export function filterVerifiedEvidence(rows,site={}){
 const approved=new Set(String(site.assistant?.verifiedSensitiveClaims||'').toLowerCase().split(/[,\n]/).map(x=>x.trim()).filter(Boolean));
 return (Array.isArray(rows)?rows:[]).filter(item=>{
  const text=normalizeEnglish(String(item.question||'')+' '+String(item.answer||''));
  const topics=[
   [/\b(?:threesome|three some|three way|3some)\b/,'threesome'],
   [/\b(?:couple session|group sex|two girls|duo session)\b/,'couple session'],
   [/\b(?:lives? alone|exact home address|private residence|private and secure place)\b/,'private residence'],
   [/\b(?:guaranteed safe|completely safe|100 percent safe)\b/,'safety guarantee']
  ];
  return topics.every(([pattern,key])=>!pattern.test(text)||approved.has(key));
 });
}
