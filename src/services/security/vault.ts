function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/*─────────────────────────────────────────────────────────────────────────────
  HARDCODED PUBLIC CONFIG — safe to embed in the client bundle.
  These values come from .env.local so the desktop app works with zero setup.

  ⚠️  WARNING: Anyone who downloads the .exe can extract these keys.
  Only hardcode values you are comfortable being public.
─────────────────────────────────────────────────────────────────────────────*/
const HARDCODED_SUPABASE_URL = 'https://itsxgmkhdvivyhmbyblo.supabase.co';
const HARDCODED_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_FxoLjOAfQwsTt--QrXCV3Q_FN8mduKG';
const HARDCODED_SUPABASE_JWKS_URL =
  'https://itsxgmkhdvivyhmbyblo.supabase.co/auth/v1/.well-known/jwks.json';

// Direct Decart API key — enables client-side auth without an external token endpoint.
// ⚠️  Extractable from the .exe. Use only for personal/desktop builds.
const HARDCODED_DECART_API_KEY =
  'dct_dallr-cam_cxVrbSyMuvJpvDRPAFUdWNFxvdBMrYVZIlBHUrBzlxDzvSpOUXFLYYjiNZqFwNzL';

// Paystack public key — public by design, safe to embed.
// ⚠️  Do NOT hardcode PAYSTACK_SECRET_KEY in client-side code.
const HARDCODED_PAYSTACK_PUBLIC_KEY =
  'pk_live_9ca8fd7f800eb630f535045b6a0467fc95e47f18';

/**
 * True when a real hosted Supabase project is configured. Falls back to the
 * hardcoded public URL/key so the app works without any env vars.
 */
export function isSupabaseConfigured(): boolean {
  const url =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
    HARDCODED_SUPABASE_URL;
  const publishable =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
    HARDCODED_SUPABASE_PUBLISHABLE_KEY;
  return hasValue(url) && hasValue(publishable);
}

/**
 * Returns the Decart API key for direct client-side authentication.
 * Env var takes precedence; falls back to the hardcoded key.
 */
export function getDecartDirectApiKey(): string | null {
  const envVal = (import.meta.env.VITE_DECART_API_KEY as
    | string
    | undefined)?.trim();
  if (envVal) return envVal;
  return HARDCODED_DECART_API_KEY;
}

/**
 * Returns the Paystack public key. Env var takes precedence.
 */
export function getPaystackPublicKey(): string {
  const envVal = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as
    | string
    | undefined)?.trim();
  if (envVal) return envVal;
  return HARDCODED_PAYSTACK_PUBLIC_KEY;
}

/**
 * True when Paystack is configured (public key + secret key).
 * The secret key must come from env vars — it is NOT hardcoded.
 */
export function isPaystackConfigured(): boolean {
  const publicKey = getPaystackPublicKey();
  const secretKey = (import.meta.env.PAYSTACK_SECRET_KEY as
    | string
    | undefined)?.trim();
  return hasValue(publicKey) && hasValue(secretKey);
}

export function getSupabaseConfig(): {
  url: string;
  publishableKey: string;
  secretKey: string;
  jwksUrl: string;
} {
  return {
    url:
      (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
      HARDCODED_SUPABASE_URL,
    publishableKey:
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
      HARDCODED_SUPABASE_PUBLISHABLE_KEY,
    secretKey: (import.meta.env.SUPABASE_SECRET_KEY as string | undefined)?.trim() || '',
    jwksUrl:
      (import.meta.env.VITE_SUPABASE_JWKS_URL as string | undefined)?.trim() ||
      HARDCODED_SUPABASE_JWKS_URL,
  };
}
