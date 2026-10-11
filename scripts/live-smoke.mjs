// Non-destructive smoke tests for the currently deployed public production site.
// No login, no valid review submissions, and no content publishing.
const origin=(process.env.LEMA_LIVE_URL||'https://rema-ruby.vercel.app').replace(/\/$/,'');
const failures=[];
async function check(label,path,options,validate){
  try{
    const response=await fetch(origin+path,{redirect:'follow',signal:AbortSignal.timeout(14000),...options});
    const body=await response.text();
    if(!validate(response,body))throw new Error('unexpected status '+response.status+', type '+response.headers.get('content-type')+', body '+body.slice(0,90));
    console.log('PASS '+label+' ('+response.status+')');
  }catch(error){failures.push(label+': '+error.message);console.error('FAIL '+label+': '+error.message);}
}
const html=(r,b)=>r.status===200&&r.headers.get('content-type')?.includes('text/html')&&b.toLowerCase().includes('lema');
const post=question=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question,language:'en',history:[]})});
await check('homepage','/',{},html);
await check('services','/services/',{},html);
await check('reviews form','/reviews/',{},(r,b)=>html(r,b)&&b.includes('id="review-form"'));
await check('contact form','/contact/',{},(r,b)=>html(r,b)&&b.includes('id="enquiry"'));
await check('owner sign-in page','/admin',{},(r,b)=>r.status===200&&/login|sign in|owner/i.test(b));
await check('admin requires session','/api/admin/session',{},r=>r.status===401);
await check('reviews endpoint rejects GET','/api/reviews',{},r=>r.status===405);
await check('invalid review rejected without saving','/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({author:'Tester',text:'Too short',language:'en',consent:false})},r=>r.status===400);
await check('chatbot greeting','/api/assistant',post('Hello'),(r,b)=>r.status===200&&/hello/i.test(JSON.parse(b).answer||''));
await check('chatbot does not promise availability','/api/assistant',post('Can I meet today?'),(r,b)=>r.status===200&&/calendar|confirm|availability/i.test(JSON.parse(b).answer||''));
console.log('Live smoke: '+(10-failures.length)+'/10 passed');
if(failures.length)process.exitCode=1;
