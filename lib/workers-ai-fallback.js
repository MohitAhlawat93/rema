// Optional second AI provider; the binding is scoped to the deployed client.
// Never persist visitor questions or output in application storage here.
export async function workersAiAnswer(binding,systemPrompt,userPrompt,{
  model='@cf/meta/llama-3.1-8b-instruct',
  maxTokens=280
}={}) {
  if (!binding || typeof binding.run !== 'function') return '';
  // Limit text sent to the secondary provider and its output tokens.
  const messages=[
    {role:'system',content:String(systemPrompt||'').slice(0,12000)},
    {role:'user',content:String(userPrompt||'').slice(0,1300)}
  ];
  const output=await binding.run(model,{messages,max_tokens:Math.max(32,Math.min(maxTokens,400)),temperature:0.2});
  const value=typeof output?.response==='string'?output.response:
    typeof output?.result?.response==='string'?output.result.response:'';
  return value.trim().slice(0,1800);
}
