// Shared, browser-safe contact helpers. No server or private contact details.
const safeHttps=value=>{
  try{const url=new URL(String(value));return url.protocol==='https:'&&!url.username&&!url.password?url:null;}
  catch{return null;}
};
const whatsappNumber=value=>{
  const url=safeHttps(value);
  if(!url)return null;
  const host=url.hostname.toLowerCase();
  let phone='';
  if(host==='wa.me'||host==='www.wa.me')phone=url.pathname.replace(/^\//,'');
  else if(host==='api.whatsapp.com'||host==='web.whatsapp.com')phone=url.searchParams.get('phone')||'';
  else return null;
  return /^\d{8,15}$/.test(phone)?phone:null;
};
export function officialWhatsAppUrl(contactLinks=[],social={}){
  const links=Array.isArray(contactLinks)?contactLinks:[];
  const urls=[...links.map(item=>item?.url),social?.whatsapp];
  for(const raw of urls){
    const phone=whatsappNumber(raw);
    if(phone)return 'https://wa.me/'+phone;
  }
  return '';
}
export function whatsappEnquiryUrl(base,message){
  const phone=whatsappNumber(base);
  if(!phone)return '';
  const text=String(message||'').trim();
  if(!text||text.length>4000)return '';
  return 'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
}
export function formatEnquiry({name='',email='',type='',date='',message=''}={}){
  const clean=value=>String(value??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,2200);
  const lines=['Hello Lema,','',clean(message),'','From: '+clean(name)];
  if(clean(type))lines.push('Topic: '+clean(type));
  if(clean(date))lines.push('Preferred date: '+clean(date));
  if(clean(email))lines.push('Email (optional): '+clean(email));
  return lines.join('\n').trim();
}
