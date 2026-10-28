/**
 * Production Decart token endpoint.
 *
 * Accepts `POST /api/realtime-token`, reads the permanent `DECART_API_KEY` from the
 * server environment and mints a short-lived Decart client token restricted to
 * `lucy-2.5`. The permanent key never enters the client bundle or the desktop binary.
 */

export const TOKEN_ROUTE = '/api/realtime-token';
export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;

export interface DecartTokenResponse {
  apiKey: string;
  expiresAt?: string;
}

export type TokenMinter = (apiKey: string) => Promise<DecartTokenResponse>;

export interface TokenEndpointResult {
  status: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface TokenEndpointInput {
  method?: string;
  ip?: string;
  origin?: string | null;
  apiKey?: string | null;
  allowedOrigins?: string[];
  attempts?: Map<string, number[]>;
  now?: number;
  mintToken: TokenMinter;
}

const TAURI_ORIGINS = new Set(['tauri://localhost', 'http://tauri.localhost', 'https://tauri.localhost']);

function takeRateLimit(attempts: Map<string, number[]>, key: string, now: number): boolean {
  const recent = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

function resolveCorsHeaders(origin: string | null | undefined, allowedOrigins: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
  };

  const allowed =
    !origin || TAURI_ORIGINS.has(origin) || allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = origin ?? '*';
  }
  headers['Vary'] = 'Origin';
  return headers;
}

export async function handleTokenRequest(input: TokenEndpointInput): Promise<TokenEndpointResult> {
  const { method = 'POST', mintToken, now = Date.now() } = input;
  const allowedOrigins = input.allowedOrigins?.length
    ? input.allowedOrigins
    : (process.env.ALLOWED_ORIGINS ?? '*')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  const headers = resolveCorsHeaders(input.origin ?? null, allowedOrigins);
  const respond = (status: number, body: Record<string, unknown>) => ({ status, body, headers });

  if (method === 'OPTIONS') {
    return { status: 204, body: {}, headers };
  }

  if (method !== 'POST') {
    return respond(405, {
      error: 'method_not_allowed',
      message: 'Use POST to request a session token.',
    });
  }

  const clientKey = input.ip ?? 'local';
  if (!takeRateLimit(input.attempts ?? new Map<string, number[]>(), clientKey, now)) {
    return respond(429, {
      error: 'rate_limited',
      message: 'Too many token requests. Wait a minute and try again.',
    });
  }

  const apiKey = input.apiKey?.trim();
  if (!apiKey) {
    return respond(503, {
      error: 'not_configured',
      message: 'The Decart token service is not configured with a server-side API key.',
    });
  }

  try {
    const token = await mintToken(apiKey);
    if (!token?.apiKey) {
      return respond(502, {
        error: 'token_service_error',
        message: 'The token service could not mint a Decart session token.',
      });
    }
    return respond(200, {
      apiKey: token.apiKey,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown';
    const message = error instanceof Error ? error.message : 'Unknown token error';
    if (code === 'TOKEN_CREATE_ERROR' && /401|403/.test(message)) {
      return respond(502, {
        error: 'unauthorized',
        message: 'Decart rejected the server-side API key.',
      });
    }
    console.error(`[dallr] Decart token request failed (${code}): ${message}`);
    return respond(502, {
      error: 'token_service_error',
      message: 'The token service could not issue a Decart token.',
    });
  }
}

export function createTokenMinter(): TokenMinter {
  return async (apiKey: string) => {
    if (!apiKey) {
      throw new Error('Decart API key is missing');
    }

    // Loaded lazily so the process can boot even if the SDK cannot be loaded.
    const { createDecartClient } = await import('@decartai/sdk');
    const client = createDecartClient({ apiKey, telemetry: false });
    const token = await client.tokens.create({
      expiresIn: 300,
      allowedModels: ['lucy-2.5'],
      metadata: {
        app: 'dallr-studio',
        environment: 'production',
      },
    });

    return { apiKey: token.apiKey, expiresAt: token.expiresAt };
  };
}
