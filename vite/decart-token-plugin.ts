import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const TOKEN_ROUTE = '/api/realtime-token';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;

type Attempts = Map<string, number[]>;

function sendJson(
  response: ServerResponse,
  status: number,
  payload: Record<string, unknown>,
): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function takeRateLimit(attempts: Attempts, key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

async function issueToken(
  request: IncomingMessage,
  response: ServerResponse,
  apiKey: string | undefined,
  attempts: Attempts,
): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, {
      error: 'method_not_allowed',
      message: 'Use POST to request a session token.',
    });
    return;
  }

  const clientKey = request.socket.remoteAddress ?? 'local';
  if (!takeRateLimit(attempts, clientKey)) {
    response.setHeader('Retry-After', '60');
    sendJson(response, 429, {
      error: 'rate_limited',
      message: 'Too many token requests. Wait a minute and try again.',
    });
    return;
  }

  if (!apiKey) {
    sendJson(response, 503, {
      error: 'not_configured',
      message:
        'DECART_API_KEY is not set. Add it to .env.local and restart the dev server.',
    });
    return;
  }

  try {
    // Loaded lazily so the dev server can start even if the SDK fails to load.
    const { createDecartClient } = await import('@decartai/sdk');
    const client = createDecartClient({ apiKey, telemetry: false });
    const token = await client.tokens.create({
      expiresIn: 300,
      allowedModels: ['lucy-2.5'],
      metadata: {
        app: 'dallr-studio',
        environment: 'local-development',
      },
    });

    sendJson(response, 200, {
      apiKey: token.apiKey,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : 'unknown';
    const message = error instanceof Error ? error.message : 'Unknown token error';
    console.error(`[dallr] Decart token request failed (${code}): ${message}`);

    if (code === 'TOKEN_CREATE_ERROR' && /401|403/.test(message)) {
      sendJson(response, 502, {
        error: 'unauthorized',
        message: 'Decart rejected the server-side API key.',
      });
      return;
    }

    sendJson(response, 502, {
      error: 'token_service_error',
      message: 'The local token service could not issue a Decart token.',
    });
  }
}

/**
 * Development-only endpoint that mints short-lived Decart client tokens.
 * The permanent API key never enters the frontend bundle.
 */
export function decartTokenPlugin(options: { apiKey: string | undefined }): Plugin {
  const attempts: Attempts = new Map();

  return {
    name: 'dallr-decart-token',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = (request.url ?? '').split('?')[0];
        if (pathname !== TOKEN_ROUTE) {
          next();
          return;
        }
        void issueToken(request, response, options.apiKey, attempts);
      });
    },
  };
}
