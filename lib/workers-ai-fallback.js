// Optional second AI provider; the binding is scoped to the deployed client.
// Never persist visitor questions or output in application storage here.
export async function workersAiAnswer(binding,systemPrompt,userPrompt,{
  model='@cf/zai-org/glm-4.7-flash',
  maxTokens=280
}={}) {
  if (!binding || typeof binding.run !== 'function') return '';
  // Limit text sent to the secondary provider and its output tokens.
  const messages=[
    {role:'system',content:String(systemPrompt||'').slice(0,12000)},
    {role:'user',content:String(userPrompt||'').slice(0,1300)}
  ];
  // GLM-4.7-Flash honors the OpenAI-compatible chat_template_kwargs setting.
  // The top-level enable_thinking flag is ignored: without this, short
  // completions can contain only reasoning and no visitor-facing answer.
  const output=await binding.run(model,{
    messages,max_completion_tokens:Math.max(32,Math.min(maxTokens,400)),
    temperature:0.2,chat_template_kwargs:{enable_thinking:false}
  });
  // Legacy Workers AI models returned {response}; current 2026 chat models
  // return OpenAI-style {choices:[{message:{content}}]}. Never echo reasoning fields.
  const choice=output?.choices?.[0]?.message?.content;
  const chatText=typeof choice==='string'?choice:
    Array.isArray(choice)?choice.filter(x=>x?.type==='text'&&typeof x?.text==='string')
      .map(x=>x.text).join(' '):'';
  const value=chatText||
    (typeof output?.response==='string'?output.response:
      typeof output?.result?.response==='string'?output.result.response:'');
  return value.trim().slice(0,1800);
}

// Cloudflare inference may stall under load; always leave time for a safe answer.
export async function withTimeBudget(promise,timeoutMs=3200){
 let timer;
 try{
  return await Promise.race([
   Promise.resolve(promise),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('AI backup timed out'),{name:'TimeoutError'})),Math.max(100,Math.min(10000,timeoutMs)));})
  ]);
 }finally{clearTimeout(timer);}
}
