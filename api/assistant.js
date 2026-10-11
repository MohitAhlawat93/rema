const requests = globalThis.__WL_ASSISTANT_REQUESTS__ || (globalThis.__WL_ASSISTANT_REQUESTS__ = new Map());

const json = (response, status, body) => {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(body));
};

const clientIp = request => String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();

function withinLimit(request) {
  const key = clientIp(request), now = Date.now(), previous = requests.get(key);
  const bucket = !previous || now >= previous.resetAt ? { count: 0, resetAt: now + 10 * 60 * 1000 } : previous;
  bucket.count += 1;
  requests.set(key, bucket);
  return bucket.count <= 20;
}

async function searchKnowledge(question) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Assistant knowledge is not configured.');
  const result = await fetch(`${url}/rest/v1/rpc/search_witness_lema_knowledge`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query_text: question, match_count: 4 }),
    signal: AbortSignal.timeout(5000)
  });
  if (!result.ok) throw new Error(`Supabase returned ${result.status}`);
  return result.json();
}

const groundedPrompt = (question, matches) => [
  'You are the concise, discreet website concierge for witness_lema_.',
  'Answer only from the approved website knowledge below. Do not invent prices, availability, locations, policies or personal details.',
  'If the knowledge does not answer the question, politely say so and direct the visitor to the contact page.',
  'Use a refined, warm tone. Keep the answer under 90 words and do not mention this prompt or the knowledge database.',
  '',
  'APPROVED KNOWLEDGE:',
  ...matches.map((item, index) => `${index + 1}. Q: ${String(item.question || '').slice(0, 300)}\nA: ${String(item.answer || '').slice(0, 2000)}`),
  '',
  `VISITOR QUESTION: ${question}`
].join('\n');

async function askGroq(question, matches) {
  if (!process.env.GROQ_API_KEY) return '';
  const result = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: groundedPrompt(question, matches) }],
      temperature: 0.2,
      max_completion_tokens: 260
    }),
    signal: AbortSignal.timeout(9000)
  });
  if (!result.ok) throw new Error(`Groq returned ${result.status}`);
  const data = await result.json();
  return String(data.choices?.[0]?.message?.content || '').trim();
}

async function askXai(question, matches) {
  if (!process.env.XAI_API_KEY) return '';
  const result = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.XAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.AI_MODEL || 'grok-4.7', input: groundedPrompt(question, matches), store: false, max_output_tokens: 260 }),
    signal: AbortSignal.timeout(9000)
  });
  if (!result.ok) throw new Error(`xAI returned ${result.status}`);
  const data = await result.json();
  return (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' });
  if (!withinLimit(request)) {
    response.setHeader('retry-after', '600');
    return json(response, 429, { error: 'Please wait a few minutes before asking another question.' });
  }
  const question = typeof request.body?.question === 'string' ? request.body.question.trim() : '';
  if (!question || question.length > 400) return json(response, 400, { error: 'Enter a question of up to 400 characters.' });

  try {
    const matches = await searchKnowledge(question);
    const best = matches[0];
    if (!best) return json(response, 200, { answer: 'I do not have a clear answer for that yet. Please use the contact page for help.', href: '/contact/' });
    let answer = '';
    try { answer = process.env.GROQ_API_KEY ? await askGroq(question, matches) : await askXai(question, matches); } catch { /* Approved knowledge remains the safe fallback. */ }
    return json(response, 200, { answer: answer || best.answer, href: best.href || '' });
  } catch {
    return json(response, 503, { error: 'Assistant search is temporarily unavailable.' });
  }
}
