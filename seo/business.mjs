// Public business identity. The owner changes the published copy in /admin;
// domain DNS, hosting and provider credentials are intentionally separate.
export const DEFAULT_BUSINESS=Object.freeze({
 name:'Witness Lema',
 wordmark:'witness_lema_',
 tagline:'A WORLD OF HER OWN',
 city:'Gurgaon',
 email:'',
 logoUrl:'/assets/mark.svg',
 requestedDomain:''
});
const validLogo=(value,supabaseUrl='')=>{
 if(value==='/assets/mark.svg')return true;
 if(/^\/images\/[a-z0-9/_-]+\.(?:png|jpe?g|webp)$/i.test(value)&&!value.includes('..'))return true;
 const prefix=String(supabaseUrl||'').replace(/\/$/,'')+'/storage/v1/object/public/witness-lema-gallery/';
 return Boolean(supabaseUrl)&&typeof value==='string'&&value.startsWith(prefix)&&
   /^https:\/\//.test(value)&&!/[<>"'\s]/.test(value)&&value.length<=2048;
};
const validDomain=value=>value===''||(
 value.length<=253&&!value.includes('..')&&
 /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value.toLowerCase())
);
export function businessErrors(value,supabaseUrl=''){
 if(!value||typeof value!=='object'||Array.isArray(value))return ['Business settings must be an object.'];
 const errors=[];
 for(const [name,max,minimum] of [['name',80,2],['wordmark',70,2],['tagline',90,0],['city',90,2]]){
   if(typeof value[name]!=='string'||value[name].trim().length<minimum||value[name].length>max)
      errors.push('Invalid business '+name+'.');
 }
 if(typeof value.email!=='string'||value.email.length>254||(
   value.email!==''&&!/^[^\s@<>]+@[^\s@<>]+\.[a-zA-Z]{2,}$/.test(value.email)
 ))errors.push('Invalid business email.');
 if(!validLogo(value.logoUrl,supabaseUrl))errors.push('Invalid business logo path.');
 if(typeof value.requestedDomain!=='string'||!validDomain(value.requestedDomain))errors.push('Enter a domain name such as example.com, without https://.');
 return errors;
}
export function resolveBusiness(raw,supabaseUrl=''){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {...DEFAULT_BUSINESS};
 const b={...DEFAULT_BUSINESS,...Object.fromEntries(Object.keys(DEFAULT_BUSINESS).map(key=>
   [key,typeof raw[key]==='string'?raw[key]:DEFAULT_BUSINESS[key]]))};
 return businessErrors(b,supabaseUrl).length===0?b:{...DEFAULT_BUSINESS};
}
// Only change our original template brand. Custom owner SEO copy is not arbitrarily rewritten.
// The owner should review all six SEO pages in /admin before publishing.
export function seoIdentityText(value,business){
 const text=String(value??'');
 return text.replaceAll(DEFAULT_BUSINESS.name,business.name).replaceAll(DEFAULT_BUSINESS.city,business.city);
}
