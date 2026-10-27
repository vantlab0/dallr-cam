import { describe, expect, it, vi } from 'vitest';
import {
  createTokenEndpointProvider,
  resolveTokenEndpoint,
  SessionCredentialError,
} from '@/services/decart/credentials';

function fakeResponse(
  body: unknown,
  options: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => body,
  } as Response;
}

describe('session credential provider', () => {
  it('uses the local dev endpoint in development and requires configuration in production', () => {
    expect(resolveTokenEndpoint(undefined, true)).toBe('/api/realtime-token');
    expect(resolveTokenEndpoint('https://api.example.com/token', true)).toBe(
      'https://api.example.com/token',
    );
    expect(resolveTokenEndpoint('https://api.example.com/token', false)).toBe(
      'https://api.example.com/token',
    );
    expect(resolveTokenEndpoint(undefined, false)).toBeNull();
  });

  it('returns a fresh apiKey from the token endpoint', async () => {
    const fetchImpl = vi.fn(async () =>
      fakeResponse({ apiKey: 'client-token', expiresAt: '2026-01-01T00:00:00.000Z' }),
    ) as unknown as typeof fetch;
    const provider = createTokenEndpointProvider('/api/realtime-token', { fetchImpl });

    await expect(provider.getToken()).resolves.toBe('client-token');
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/realtime-token',
      expect.objectContaining({ method: 'POST', credentials: 'omit', cache: 'no-store' }),
    );
  });

  it('fails safely when no endpoint is configured', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = createTokenEndpointProvider(null, { fetchImpl });

    await expect(provider.getToken()).rejects.toMatchObject({
      name: 'SessionCredentialError',
      code: 'not-configured',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps an unauthorized token service response', async () => {
    const fetchImpl = vi.fn(async () =>
      fakeResponse({ error: 'unauthorized' }, { ok: false, status: 502 }),
    ) as unknown as typeof fetch;
    const provider = createTokenEndpointProvider('/api/realtime-token', { fetchImpl });

    await expect(provider.getToken()).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('maps a missing server key to not-configured', async () => {
    const fetchImpl = vi.fn(async () =>
      fakeResponse({ error: 'not_configured' }, { ok: false, status: 503 }),
    ) as unknown as typeof fetch;
    const provider = createTokenEndpointProvider('/api/realtime-token', { fetchImpl });

    await expect(provider.getToken()).rejects.toMatchObject({
      code: 'not-configured',
    });
  });

  it('rejects malformed token responses', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({ apiKey: '' })) as unknown as typeof fetch;
    const provider = createTokenEndpointProvider('/api/realtime-token', { fetchImpl });

    await expect(provider.getToken()).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });

  it('wraps network failures without leaking the underlying response', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const provider = createTokenEndpointProvider('/api/realtime-token', { fetchImpl });

    await expect(provider.getToken()).rejects.toBeInstanceOf(SessionCredentialError);
    await expect(provider.getToken()).rejects.toMatchObject({ code: 'network' });
  });
});
