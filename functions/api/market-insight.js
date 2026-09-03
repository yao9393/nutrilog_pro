// Cloudflare Pages Function — served at /api/market-insight
// Same pattern as gold-price.js: keeps ANTHROPIC_API_KEY server-side.

export async function onRequestPost(context) {
  const { env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set in Cloudflare Pages environment variables.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: 'Search for the latest news and pricing insight (ideally within the past 1-2 weeks) on these semiconductor OSAT packaging raw materials: epoxy molding compound, DAF die attach film tape, mold compound, IC substrate, leadframe, JEDEC tray, tape and reel packaging, copper clip, copper wire bonding wire. For each material where you find a genuine, sourced, recent insight (price change, supply news, shortage, hike announcement), return one item. Skip any material with no current sourced news rather than inventing one — it is fine to return fewer than 9 items. Reply with ONLY compact JSON and nothing else, no markdown fences, in this exact shape: [{"material": "<name>", "headline": "<short headline, 4-8 words>", "detail": "<one sentence with specifics, paraphrased not quoted>", "changePct": <number or null>, "direction": "up" or "down" or null, "source": "<short source name>"}]',
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Anthropic API error: ${errText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Could not read insight from the response.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) {
      return new Response(JSON.stringify({ error: 'Unexpected format.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unexpected error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
