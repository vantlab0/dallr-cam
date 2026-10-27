/**
 * Cloudflare Worker template for Dallr Cam Decart token service.
 * Deploy with `wrangler deploy` after setting DECART_API_KEY secret.
 */
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'method_not_allowed', message: 'Use POST to request a token.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!env.DECART_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'not_configured', message: 'DECART_API_KEY secret is not set.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    try {
      const response = await fetch('https://api.decart.ai/v1/tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.DECART_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiresIn: 300,
          allowedModels: ['lucy-2.5'],
          metadata: { app: 'dallr-studio', environment: 'production-worker' },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'unauthorized', message: 'Decart rejected API key.' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ apiKey: data.apiKey, expiresAt: data.expiresAt }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'token_service_error', message: err.message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  },
};
