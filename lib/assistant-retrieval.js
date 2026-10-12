// Lightweight hybrid FAQ retrieval for the currently small approved knowledge base.
// Exact + lexical + multilingual intent matching; no embedding credentials required.
const lexicon = {
  rates: ['price','prices','pricing','rate','rates','cost','costs','charge','charges','charging','fee','fees','how much','kitna','kitni','paisa','paise','कीमत','कितना','कितनी','चार्ज','रेट'],
  contact: ['contact','whatsapp','message','text','phone','telephone','number','call','reach','get in touch','connect','sampark','संपर्क','फोन','नंबर','मैसेज'],
  location: ['where','location','located','based','live','lives','stays','city','gurgaon','gurugram','address','place','kahan','कहाँ','शहर','लोकेशन','पता'],
  availability: ['available','availability','free','today','tonight','tomorrow','schedule','times','time','slot','slots','kab','aaj','kal','आज','कल','कब','उपलब्ध','फ्री'],
  services: ['service','services','offer','offers','provide','provides','experience','experiences','seva','सेवा','सर्विस'],
  booking: ['book','booking','reserve','reservation','appointment','confirm','advance','बुकिंग'],
  gallery: ['photo','photos','photograph','picture','pictures','image','images','gallery','portrait','tasveer','फोटो','तस्वीर'],
  incall: ['incall','in call','in-call','at her place'],
  outcall: ['outcall','out call','out-call','hotel','travel'],
  video: ['video','video call','videocall','cam','online','वीडियो'],
  privacy: ['private','privacy','discreet','confidential','safety','safe','secure','consent','गोपनीय','सुरक्षित'],
  about: ['profile','biography','background','about','who','identity','age','height','nationality','परिचय','कौन'],
  cancellation: ['refund','refundable','cancel','cancellation','reschedule','postpone','रिफंड','कैंसिल'],
  reviews: ['review','reviews','testimonial','rating','feedback','रिव्यू','समीक्षा']
};
const ignore = new Set('a an the i is are was were she her he him you your me my of for in on to do does can could would please tell how what which where when who with if and or it this that more about some any just want from by will be there again'.split(' '));
export const normalizeQuestion = value => String(value ?? '').toLowerCase().normalize('NFKC')
  .replace(/[^\\p{L}\\p{N}]+/gu,' ').trim().replace(/\\s+/g,' ');
const phrases = Object.entries(lexicon).map(([key,items])=>({key,patterns:items.map(normalizeQuestion)}));
export function conceptsFor(value){
  const normalized=normalizeQuestion(value),tokens=normalized.split(' ').filter(Boolean);
  const set=new Set(tokens.filter(word=>word.length>1&&!ignore.has(word)));
  const surrounded=' '+normalized+' ';
  for(const {key,patterns} of phrases){
    if(patterns.some(pattern=>surrounded.includes(' '+pattern+' '))) set.add('intent:'+key);
  }
  return set;
}
function hits(query,candidate){
 let result=0;
 for(const x of query)if(candidate.has(x))result+=x.startsWith('intent:')?5:1.5;
 return result;
}
export function rankKnowledge(question,items,{history=[]}={}){
  const clean=normalizeQuestion(question);
  if(!clean)return [];
  const q=conceptsFor(clean);
  // A short, referential follow-up borrows conversational topic; otherwise
  // retrieval is based on the current message to avoid irrelevant old context.
  const referential=/^(and |what about |how about |is it |does it |what if |or |also )/i.test(clean)||clean.split(' ').length<=2;
  if(referential){
    const previous=[...history].reverse().find(m=>m?.role==='user'&&m.content&&normalizeQuestion(m.content)!==clean);
    if(previous)for(const term of conceptsFor(previous.content))if(term.startsWith('intent:'))q.add(term);
  }
  return (Array.isArray(items)?items:[])
   .filter(item=>item?.question&&item?.answer&&item.published!==false)
   .map(item=>{
     const title=normalizeQuestion(item.question);
     const titleSet=conceptsFor(title);
     const keywords=conceptsFor(Array.isArray(item.keywords)?item.keywords.join(' '):'');
     const score=title===clean?100:(hits(q,titleSet)*1.35+hits(q,keywords)*.75);
     return {item,score};
   })
   .filter(x=>x.score>=3)
   .sort((a,b)=>b.score-a.score)
   .slice(0,6);
}
// Database publication is authoritative; stale bundled FAQ must never overwrite it.
export function publishedKnowledgeOrFallback(published,bundled){
 if(Array.isArray(published))return published.filter(x=>x?.published!==false&&x?.question&&x?.answer);
 return (Array.isArray(bundled)?bundled:[]).filter(x=>x?.published!==false&&x?.question&&x?.answer);
}
export function isAvailabilityFollowup(question,history=[]){
 const clean=normalizeQuestion(question);
 if(!/(?:\\btomorrow\\b|\\btoday\\b|\\btonight\\b|\\bnow\\b|\\bkal\\b|\\baaj\\b|कल|आज|अभी|available|availability)/i.test(clean))return false;
 if(/(?:tomorrow|today|tonight|now|कल|आज|अभी)/i.test(clean)&&clean.split(' ').length<=4)return true;
 return history.some(x=>x?.role==='user'&&/book|available|meet|schedule|booking/i.test(x.content||''));
}
