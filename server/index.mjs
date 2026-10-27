import { createServer } from 'node:http';
import { createDecartClient } from '@decartai/sdk';

const PORT = Number(process.env.PORT || 3001);
const DECART_API_KEY = process.env.DECART_API_KEY;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const attempts = new Map();

function takeRateLimit(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    attempts.set(ip, recent);
    return false;
  }
  recent.push(now);
  attempts.set(ip, recent);
  return true;
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!ALLOWED_ORIGINS || (origin && ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const pathname = (req.url || '').split('?')[0];
  if (pathname !== '/' && pathname !== '/api/realtime-token' && pathname !== '/decart/session-token') {
    sendJson(res, 404, { error: 'not_found', message: 'Endpoint not found.' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use POST to request a token.' });
    return;
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!takeRateLimit(clientIp)) {
    res.setHeader('Retry-After', '60');
    sendJson(res, 429, { error: 'rate_limited', message: 'Rate limit exceeded. Wait 1 minute.' });
    return;
  }

  if (!DECART_API_KEY) {
    sendJson(res, 503, { error: 'not_configured', message: 'DECART_API_KEY server secret is missing.' });
    return;
  }

  try {
    const client = createDecartClient({ apiKey: DECART_API_KEY, telemetry: false });
    const token = await client.tokens.create({
      expiresIn: 300,
      allowedModels: ['lucy-2.5'],
      metadata: {
        app: 'dallr-studio',
        environment: 'production',
      },
    });

    sendJson(res, 200, {
      apiKey: token.apiKey,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown token error';
    console.error(`[Dallr Token Service] Decart error: ${message}`);
    sendJson(res, 502, {
      error: 'token_service_error',
      message: 'Failed to mint Decart client token.',
    });
  }
});

server.listen(PORT, () => {
  console.log(`[Dallr Token Service] Listening on port ${PORT}`);
});
