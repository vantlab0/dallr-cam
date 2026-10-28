/**
 * Production Decart token service entry point.
 *
 * Runs a minimal HTTP server that mints short-lived Decart client tokens for
 * Dallr Studio sessions. Used for hosted deployments; local development uses the
 * Vite dev middleware (`vite/decart-token-plugin.ts`) instead.
 */

import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  TOKEN_ROUTE,
  createTokenMinter,
  handleTokenRequest,
} from './decart-token.ts';
import { WALLET_ROUTE_PREFIX, handleWalletRequest } from './wallet.ts';

if (typeof process.loadEnvFile === 'function') {
  for (const envFile of ['.env.local', '.env']) {
    if (existsSync(envFile)) {
      try {
        process.loadEnvFile(envFile);
      } catch {
        // ignore missing or malformed env files
      }
    }
  }
}

const PORT = Number(process.env.PORT ?? 8787);
const attempts = new Map<string, number[]>();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? '';
const ADMIN_CREDIT_SECRET = process.env.ADMIN_CREDIT_SECRET ?? '';

const TAURI_ORIGINS = new Set([
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
]);

const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (TAURI_ORIGINS.has(origin)) return true;
  if (LOCAL_ORIGIN_REGEX.test(origin)) return true;
  const configured = (process.env.ALLOWED_ORIGINS ?? '*')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return configured.includes('*') || configured.includes(origin);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin);
  return {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
    ...(allowed ? { 'Access-Control-Allow-Origin': origin ?? '*' } : {}),
  };
}

const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  const origin = request.headers.origin ?? null;
  const url = request.url ?? '';
  const path = url.split('?')[0];

  const corsHeaders = getCorsHeaders(origin);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (path === '/' || path === '/health') {
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    });
    response.end(
      JSON.stringify({
        status: 'ok',
        service: 'dallr-server',
        version: '0.1.0',
        routes: [
          'POST /api/realtime-token',
          'GET  /api/wallet/balance',
          'POST /api/wallet/topup',
          'POST /api/wallet/deduct',
          'POST /api/wallet/credit-by-email',
        ],
      }),
    );
    return;
  }

  if (path === TOKEN_ROUTE) {
    const result = await handleTokenRequest({
      method: request.method,
      ip: request.socket.remoteAddress ?? 'local',
      origin,
      apiKey: process.env.DECART_API_KEY,
      attempts,
      mintToken: createTokenMinter(),
    });

    response.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...result.headers,
    });
    response.end(JSON.stringify(result.body));
    return;
  }

  if (path.startsWith(WALLET_ROUTE_PREFIX)) {
    const walletPath = path.slice(WALLET_ROUTE_PREFIX.length).replace(/^\//, '');
    const body = await readJsonBody(request);

    const result = await handleWalletRequest({
      method: request.method ?? 'POST',
      path: walletPath,
      body,
      origin,
      authorization: request.headers.authorization ?? null,
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      supabaseSecretKey: SUPABASE_SECRET_KEY,
      adminCreditSecret: ADMIN_CREDIT_SECRET,
    });

    response.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...result.headers,
    });
    response.end(JSON.stringify(result.body));
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
    });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch {
        resolve(undefined);
      }
    });
    request.on('error', () => resolve(undefined));
  });
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[dallr] Decart token service listening on port ${PORT}`);
});
