/**
 * Server-side credit wallet endpoints.
 *
 * All credit mutations are mediated by this backend using the Supabase service
 * role key, so clients can never inflate their own balance. Clients present a
 * Supabase access token (Bearer) which is verified against Supabase Auth before
 * any read or write.
 *
 * Routes (mounted under /api/wallet):
 *   GET    /api/wallet/balance        -> { balanceCredits, lifetimeTopUpUsd }
 *   POST   /api/wallet/topup          -> { ok, balanceCredits }  (body: credits, amountUsd, reference, description)
 *   POST   /api/wallet/deduct         -> { ok, balanceCredits }  (body: credits, description)
 *   POST   /api/wallet/credit-by-email-> { ok, userId, email, balanceCredits }  (admin, body: email, credits, amountUsd, reference, description)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const WALLET_ROUTE_PREFIX = '/api/wallet';
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

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin);
  return {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    ...(allowed ? { 'Access-Control-Allow-Origin': origin ?? '*' } : {}),
    Vary: 'Origin',
  };
}

function respond(
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string>,
) {
  return { status, body, headers };
}

/** Verifies a Supabase access token and returns the owning user. */
async function verifyUser(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authorization: string | null,
): Promise<{ user: { id: string; email: string | null } | null; error: string | null }> {
  if (!authorization?.startsWith('Bearer ')) {
    return { user: null, error: 'missing_token' };
  }
  const token = authorization.slice('Bearer '.length);
  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });
    if (!res.ok) {
      return { user: null, error: 'invalid_token' };
    }
    const user = (await res.json()) as { id: string; email: string | null };
    return { user, error: null };
  } catch {
    return { user: null, error: 'network' };
  }
}

let adminClient: SupabaseClient | null = null;
function getAdminClient(
  supabaseUrl: string,
  supabaseSecretKey: string,
): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

function requireBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

export interface WalletEndpointInput {
  method: string;
  path: string;
  body: unknown;
  origin: string | null;
  authorization: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseSecretKey: string;
  adminCreditSecret: string;
}

export async function handleWalletRequest(
  input: WalletEndpointInput,
): Promise<{ status: number; body: Record<string, unknown>; headers: Record<string, string> }> {
  const { method, path, origin, authorization } = input;
  const headers = corsHeaders(origin);
  const respondWith = (status: number, body: Record<string, unknown>) =>
    respond(status, body, headers);

  if (method === 'OPTIONS') {
    return respondWith(204, {});
  }

  const supabaseUrl = input.supabaseUrl.replace(/\/$/, '');

  // ------------------------------------------------------------------
  // Admin: credit a user by email (protected by ADMIN_CREDIT_SECRET)
  // ------------------------------------------------------------------
  if (path === 'credit-by-email' && method === 'POST') {
    const adminSecret = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    if (!input.adminCreditSecret || adminSecret !== input.adminCreditSecret) {
      return respondWith(401, { error: 'unauthorized' });
    }

    const payload = requireBody(input.body);
    if (!payload) {
      return respondWith(400, { error: 'invalid_body' });
    }
    const email = String(payload.email ?? '').trim().toLowerCase();
    const credits = Number(payload.credits);
    const amountUsd = Number(payload.amountUsd);
    const reference = String(payload.reference ?? `admin_${Date.now()}`);
    const description = String(payload.description ?? 'Admin credit top-up');

    if (!email || !Number.isFinite(credits) || credits <= 0) {
      return respondWith(400, { error: 'invalid_params' });
    }

    const admin = getAdminClient(supabaseUrl, input.supabaseSecretKey);
    const { data: users, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      return respondWith(500, { error: 'user_lookup_failed' });
    }
    const target = (users?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email);
    if (!target) {
      return respondWith(404, { error: 'user_not_found' });
    }

    const { data, error } = await admin
      .rpc('credit_wallet', {
        p_user_id: target.id,
        p_credits: credits,
        p_amount_usd: amountUsd || credits * 0.02,
        p_description: description,
        p_reference: reference,
      });

    if (error) {
      return respondWith(500, { error: 'credit_failed', detail: String(error.message) });
    }

    return respondWith(200, {
      ok: true,
      userId: target.id,
      email: target.email,
      balanceCredits: data,
    });
  }

  // ------------------------------------------------------------------
  // User-scoped endpoints (require a valid Supabase access token)
  // ------------------------------------------------------------------
  const { user, error: tokenError } = await verifyUser(
    supabaseUrl,
    input.supabaseAnonKey,
    authorization,
  );
  if (!user || tokenError) {
    return respondWith(401, { error: tokenError ?? 'unauthenticated' });
  }
  const userId = user.id;

  const admin = getAdminClient(supabaseUrl, input.supabaseSecretKey);

  // ------------------------------------------------------------------
  // GET /api/wallet/balance
  // ------------------------------------------------------------------
  if (path === 'balance' && method === 'GET') {
    const { data, error } = await admin
      .from('wallets')
      .select('balance_credits, lifetime_topup_usd')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return respondWith(500, { error: 'balance_fetch_failed' });
    }
    if (!data) {
      return respondWith(404, { error: 'wallet_not_found' });
    }

    return respondWith(200, {
      balanceCredits: Number(data.balance_credits),
      lifetimeTopUpUsd: Number(data.lifetime_topup_usd),
    });
  }

  // ------------------------------------------------------------------
  // POST /api/wallet/topup
  // ------------------------------------------------------------------
  if (path === 'topup' && method === 'POST') {
    const payload = requireBody(input.body);
    if (!payload) {
      return respondWith(400, { error: 'invalid_body' });
    }
    const credits = Number(payload.credits);
    const amountUsd = Number(payload.amountUsd);
    const reference = String(payload.reference ?? `topup_${Date.now()}`);
    const description = String(payload.description ?? 'Credit top-up');

    if (!Number.isFinite(credits) || credits <= 0 || !Number.isFinite(amountUsd)) {
      return respondWith(400, { error: 'invalid_params' });
    }

    const { data, error } = await admin.rpc('credit_wallet', {
      p_user_id: userId,
      p_credits: credits,
      p_amount_usd: amountUsd,
      p_description: description,
      p_reference: reference,
    });

    if (error) {
      return respondWith(500, { error: 'topup_failed', detail: String(error.message) });
    }

    return respondWith(200, { ok: true, balanceCredits: data });
  }

  // ------------------------------------------------------------------
  // POST /api/wallet/deduct  (balance only; transaction recorded separately)
  // ------------------------------------------------------------------
  if (path === 'deduct' && method === 'POST') {
    const payload = requireBody(input.body);
    if (!payload) {
      return respondWith(400, { error: 'invalid_body' });
    }
    const credits = Number(payload.credits);
    const description = String(payload.description ?? 'Live rendering');

    if (!Number.isFinite(credits) || credits <= 0) {
      return respondWith(400, { error: 'invalid_params' });
    }

    const { data, error } = await admin.rpc('deduct_wallet_balance', {
      p_user_id: userId,
      p_credits: credits,
      p_description: description,
    });

    if (error) {
      return respondWith(500, { error: 'deduct_failed', detail: String(error.message) });
    }
    if (data === -1) {
      return respondWith(402, { error: 'insufficient_funds' });
    }

    return respondWith(200, { ok: true, balanceCredits: data });
  }

  // ------------------------------------------------------------------
  // POST /api/wallet/record-transaction  (audit ledger entry)
  // ------------------------------------------------------------------
  if (path === 'record-transaction' && method === 'POST') {
    const payload = requireBody(input.body);
    if (!payload) {
      return respondWith(400, { error: 'invalid_body' });
    }
    const credits = Number(payload.credits);
    const amountUsd = Number(payload.amountUsd);
    const type = String(payload.type ?? 'usage');
    const description = String(payload.description ?? 'Live rendering');
    const reference = String(payload.reference ?? `txn_${Date.now()}`);

    if (!Number.isFinite(credits) || credits <= 0 || !Number.isFinite(amountUsd)) {
      return respondWith(400, { error: 'invalid_params' });
    }
    if (!['topup', 'usage', 'refund'].includes(type)) {
      return respondWith(400, { error: 'invalid_params' });
    }

    const { error } = await admin.from('wallet_transactions').insert({
      user_id: userId,
      type,
      credits,
      amount_usd: amountUsd,
      description,
      reference,
    });

    if (error) {
      return respondWith(500, { error: 'transaction_record_failed', detail: String(error.message) });
    }

    return respondWith(200, { ok: true });
  }

  return respondWith(404, { error: 'not_found' });
}
