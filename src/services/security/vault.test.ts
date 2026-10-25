import { describe, expect, it } from 'vitest';
import {
  getPaystackPublicKey,
  getPaystackSecretKey,
  getSupabaseConfig,
} from './vault';

// Tests verify that the vault correctly reconstructs credentials from obfuscated byte streams.
// Plaintext secret values are NOT checked here to avoid committing secrets to source control.
// Instead we verify structural integrity: type, prefix shape, and length.

describe('Secure In-App Vault', () => {
  it('produces a valid Paystack live public key format', () => {
    const pubKey = getPaystackPublicKey();
    expect(typeof pubKey).toBe('string');
    expect(pubKey.startsWith('pk_live_')).toBe(true);
    expect(pubKey.length).toBeGreaterThan(12);
  });

  it('produces a valid Paystack secret key format', () => {
    const secKey = getPaystackSecretKey();
    expect(typeof secKey).toBe('string');
    expect(secKey.startsWith('sk_live_')).toBe(true);
    expect(secKey.length).toBeGreaterThan(12);
  });

  it('produces a valid Supabase config structure', () => {
    const config = getSupabaseConfig();
    expect(config.url).toMatch(/^https?:\/\//);
    expect(config.publishableKey.startsWith('sb_publishable_')).toBe(true);
    expect(config.secretKey.startsWith('sb_secret_')).toBe(true);
    expect(config.jwksUrl).toContain('/.well-known/jwks.json');
  });
});
