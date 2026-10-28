function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/**
 * True when a real hosted Supabase project is configured for this build. When it
 * is, the app must use real auth; when it is not, the local workspace is used.
 */
export function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const publishable =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return hasValue(url) && hasValue(publishable);
}

/**
 * True when a real Paystack public key is configured in the environment.
 * Payments must go through Paystack; there is no simulated checkout fallback.
 */
export function isPaystackConfigured(): boolean {
  const publicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined)?.trim();
  const secretKey = (import.meta.env.PAYSTACK_SECRET_KEY as string | undefined)?.trim();
  return hasValue(publicKey) && hasValue(secretKey);
}

export function getSupabaseConfig(): {
  url: string;
  publishableKey: string;
  secretKey: string;
  jwksUrl: string;
} {
  return {
    url: (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '',
    publishableKey:
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
      '',
    secretKey: (import.meta.env.SUPABASE_SECRET_KEY as string | undefined)?.trim() || '',
    jwksUrl: (import.meta.env.VITE_SUPABASE_JWKS_URL as string | undefined)?.trim() || '',
  };
}
