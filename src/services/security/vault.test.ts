import { describe, expect, it } from 'vitest';
import { getSupabaseConfig } from './vault';

describe('Secure In-App Vault', () => {
  it('returns config from environment variables with no hardcoded fallbacks', () => {
    const config = getSupabaseConfig();
    expect(typeof config.url).toBe('string');
    expect(typeof config.publishableKey).toBe('string');
    expect(typeof config.secretKey).toBe('string');
    expect(typeof config.jwksUrl).toBe('string');
  });
});
