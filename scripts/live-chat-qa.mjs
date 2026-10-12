// Non-destructive production smoke: checks deployed asset version and consecutive real chat replies.
// Never logs visitor content, API credentials or complete generated answers.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const site=String(process.env.CHAT_QA_URL||'https://rema-ruby.vercel.app').replace(/\/$/,'');
const expected=createHash('sha256').update(await readFile('public/app.js')).digest('hex').slice(0,12);
const deadline=Date.now()+150000;
async function ready(){
 while(Date.now()<deadline){
  try{
   const response=await fetch(site+'/?chat_qa='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(6500)});
   const html=await response.text();
   if(response.ok&&html.includes('/app.js?v='+expected))return;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 throw Error('Production did not receive the current chatbot JS asset within 150 seconds.');
}
await ready();
const history=[];
for(const question of [
 'Hello',
 'How can I get in touch with her?',
 'What are her rates?',
 'And tomorrow?',
 'Which page shows her photos?',
 'What is two plus two?',
 'Why is that the answer?'
]){
 const started=Date.now();
 const response=await fetch(site+'/api/assistant',{
  method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify({question,language:'en',history:history.slice(-6)}),
  signal:AbortSignal.timeout(11500)
 });
 const result=await response.json().catch(()=>({}));
 const elapsedMs=Date.now()-started;
 const idx=history.filter(x=>x.role==='user').length+1;
 console.log(JSON.stringify({turn:idx,status:response.status,elapsedMs,
  source:result.source||'unspecified',failureCode:result.diagnostics?.code||'',answerLength:String(result.answer||'').length}));
 if(!response.ok||!result.answer?.trim())throw Error('Missing reply from production chat at turn '+idx+' (HTTP '+response.status+')');
 history.push({role:'user',content:question},{role:'assistant',content:result.answer});
}
console.log('LIVE CHAT SMOKE PASSED: seven consecutive production chatbot replies (including two requiring AI or fallback).');
