// Cloudflare Pages Function — served at /api/gold-price
// Set ANTHROPIC_API_KEY as a secret in Cloudflare Pages → Settings → Environment
// variables (mark it "Secret", not plain text) before this will work.

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: 'What is today\'s LBMA London gold price (spot or PM fix) in USD per troy ounce? Reply with ONLY compact JSON and nothing else, no markdown fences: {"priceUsdPerOz": <number>, "asOfDate": "<YYYY-MM-DD>", "source": "<short source name>"}',
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
    const match = text.match(/\{[^{}]*\}/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Could not read a price from the response.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(match[0]);
    if (!parsed.priceUsdPerOz || parsed.priceUsdPerOz <= 0) {
      return new Response(JSON.stringify({ error: 'No usable price found.' }), {
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
