/**
 * Client-side credit wallet. Credits are the source of truth in Supabase
 * (see supabase/migrations/001_wallets.sql), never in localStorage, so a user's
 * balance cannot be inflated by editing client-side storage.
 *
 * Every call forwards the user's Supabase access token; the backend verifies it
 * against Supabase Auth before reading or mutating the wallet.
 */

import { getSupabaseClient } from './client';
import { isSupabaseConfigured } from '@/services/security/vault';

const DEFAULT_DEV_WALLET_ENDPOINT = '/api/wallet';

export interface WalletBalance {
  balanceCredits: number;
  lifetimeTopUpUsd: number;
}

function resolveWalletEndpoint(): string | null {
  const configured = (import.meta.env.VITE_WALLET_API_ENDPOINT as
    | string
    | undefined)?.trim();
  if (configured) return configured;

  const tokenEndpoint = (import.meta.env
    .VITE_DECART_TOKEN_ENDPOINT as string | undefined)?.trim();
  if (tokenEndpoint) {
    try {
      const url = new URL(tokenEndpoint);
      return `${url.origin}/api/wallet`;
    } catch {
      // Not a URL; fall through to the dev default below.
    }
  }

  return import.meta.env.DEV ? DEFAULT_DEV_WALLET_ENDPOINT : null;
}

async function getAccessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  try {
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function walletRequest(
  path: string,
  options: RequestInit,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const endpoint = resolveWalletEndpoint();
  if (!endpoint) {
    throw new Error('Wallet API endpoint is not configured for this build.');
  }
  const res = await fetch(`${endpoint.replace(/\/$/, '')}/${path}`, {
    cache: 'no-store',
    ...options,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON error responses are treated as failures.
  }
  return { ok: res.ok, status: res.status, json };
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
}

export async function fetchWallet(): Promise<WalletBalance | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await client
      .from('wallets')
      .select('balance_credits, lifetime_topup_usd')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) return null;
    if (!data) return null;

    return {
      balanceCredits: Number(data.balance_credits),
      lifetimeTopUpUsd: Number(data.lifetime_topup_usd),
    };
  } catch {
    return null;
  }
}

export async function topUpWallet(
  credits: number,
  amountUsd: number,
  reference: string,
  description = 'Credit top-up',
): Promise<{ ok: boolean; balanceCredits?: number; error?: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'not_authenticated' };

  const { ok, status, json } = await walletRequest('topup', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credits, amountUsd, reference, description }),
  });

  if (!ok) {
    return { ok: false, error: `server_error_${status}` };
  }
  const body =
    json && typeof json === 'object'
      ? (json as Record<string, unknown>)
      : null;
  if (!body || body.ok !== true) {
    return { ok: false, error: 'invalid_response' };
  }
  return {
    ok: true,
    balanceCredits:
      typeof body.balanceCredits === 'number' ? body.balanceCredits : undefined,
  };
}

export async function deductWallet(
  credits: number,
  description: string,
): Promise<{ ok: boolean; balanceCredits?: number; error?: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'not_authenticated' };

  const { ok, status, json } = await walletRequest('deduct', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credits, description }),
  });

  if (!ok) {
    if (status === 402) {
      return { ok: false, error: 'insufficient_funds' };
    }
    return { ok: false, error: `server_error_${status}` };
  }
  const body =
    json && typeof json === 'object'
      ? (json as Record<string, unknown>)
      : null;
  if (!body || body.ok !== true) {
    return { ok: false, error: 'invalid_response' };
  }
  return {
    ok: true,
    balanceCredits:
      typeof body.balanceCredits === 'number' ? body.balanceCredits : undefined,
  };
}

export async function recordTransaction(
  credits: number,
  amountUsd: number,
  type: 'topup' | 'usage' | 'refund',
  description: string,
  reference: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'not_authenticated' };

  const { ok, status } = await walletRequest('record-transaction', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credits, amountUsd, type, description, reference }),
  });

  if (!ok) {
    return { ok: false, error: `server_error_${status}` };
  }
  return { ok: true };
}
