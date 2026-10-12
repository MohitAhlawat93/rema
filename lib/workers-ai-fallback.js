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
  const output=await binding.run(model,{messages,max_tokens:Math.max(32,Math.min(maxTokens,400)),temperature:0.2});
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
