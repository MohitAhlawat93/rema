const json = (response, status, body) => {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(body));
};

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' });
  const question = typeof request.body?.question === 'string' ? request.body.question.trim() : '';
  if (!question || question.length > 400) return json(response, 400, { error: 'Enter a question of up to 400 characters.' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return json(response, 503, { error: 'Assistant configuration is unavailable.' });

  try {
    const result = await fetch(`${url}/rest/v1/rpc/search_witness_lema_knowledge`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query_text: question, match_count: 1 }),
      signal: AbortSignal.timeout(5000)
    });
    if (!result.ok) throw new Error(`Supabase returned ${result.status}`);
    const matches = await result.json();
    const match = matches[0];
    if (!match) return json(response, 200, { answer: 'I do not have a clear answer for that yet. Please use the contact page for help.', href: '/contact/' });
    return json(response, 200, { answer: match.answer, href: match.href || '' });
  } catch {
    return json(response, 503, { error: 'Assistant search is temporarily unavailable.' });
  }
}
