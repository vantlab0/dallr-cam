/**
 * Session credentials are minted by an application backend, never by the client.
 *
 * The browser only receives a short-lived Decart client token. The permanent
 * `DECART_API_KEY` stays on the token service (the Vite dev middleware in local
 * development, or a hosted backend in production).
 */

const DEFAULT_DEV_ENDPOINT = '/api/realtime-token';
const DEFAULT_TIMEOUT_MS = 12_000;

export type CredentialErrorCode =
  | 'not-configured'
  | 'unauthorized'
  | 'network'
  | 'invalid-response'
  | 'server';

export class SessionCredentialError extends Error {
  readonly code: CredentialErrorCode;
  readonly status: number | undefined;

  constructor(
    code: CredentialErrorCode,
    message: string,
    options?: { cause?: unknown; status?: number },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'SessionCredentialError';
    this.code = code;
    this.status = options?.status;
  }
}

export interface SessionCredentialProvider {
  /** The endpoint used to mint tokens, or null when the app has not been configured. */
  readonly endpoint: string | null;
  /** Returns a fresh short-lived client token for one Decart request or dial. */
  getToken: () => Promise<string>;
}

export const DECART_API_KEY_STORAGE = 'dallr:decart_api_key';
export const DECART_TOKEN_ENDPOINT_STORAGE = 'dallr:decart_token_endpoint';

export function resolveTokenEndpoint(
  configured: string | undefined,
  isDevelopment: boolean,
): string | null {
  const trimmed = configured?.trim();
  if (trimmed) return trimmed;
  try {
    if (typeof window !== 'undefined') {
      const custom = window.localStorage.getItem(DECART_TOKEN_ENDPOINT_STORAGE);
      if (custom?.trim()) return custom.trim();
    }
  } catch {
    // Storage can throw in private browsing modes; fall back to defaults.
  }
  return isDevelopment ? DEFAULT_DEV_ENDPOINT : null;
}

interface TokenResponse {
  apiKey?: unknown;
  expiresAt?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorCode(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return typeof payload.error === 'string' ? payload.error : null;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (isRecord(error) && error.name === 'AbortError')
  );
}

export function createTokenEndpointProvider(
  endpoint: string | null = resolveTokenEndpoint(
    import.meta.env.VITE_DECART_TOKEN_ENDPOINT,
    import.meta.env.DEV,
  ),
  options: { fetchImpl?: typeof fetch; timeoutMs?: number; directKey?: string | null } = {},
): SessionCredentialProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const getDirectApiKey = (): string | null => {
    if (options.directKey) return options.directKey;
    // Direct key escape hatch. Works in both dev and production builds so the
    // desktop app can authenticate with Decart directly without calling an
    // external /api/realtime-token endpoint.
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(DECART_API_KEY_STORAGE)?.trim();
        if (stored) return stored;
      }
    } catch {
      // Storage can throw in private browsing modes; fall back to defaults.
    }
    if (
      typeof import.meta.env.VITE_DECART_API_KEY === 'string' &&
      import.meta.env.VITE_DECART_API_KEY.trim()
    ) {
      return import.meta.env.VITE_DECART_API_KEY.trim();
    }
    return null;
  };

  return {
    get endpoint(): string | null {
      return endpoint ?? (getDirectApiKey() ? 'direct-api-key' : null);
    },
    async getToken(): Promise<string> {
      const directKey = getDirectApiKey();
      if (directKey) return directKey;

      if (!endpoint) {
        throw new SessionCredentialError(
          'not-configured',
          'No session token endpoint is configured for this build.',
        );
      }

      const controller = new AbortController();
      const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          credentials: 'omit',
          cache: 'no-store',
          signal: controller.signal,
        });

        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const serviceCode = readErrorCode(payload);
          if (
            response.status === 401 ||
            response.status === 403 ||
            serviceCode === 'unauthorized'
          ) {
            throw new SessionCredentialError(
              'unauthorized',
              'The session service rejected its Decart credential.',
              { status: response.status },
            );
          }
          if (response.status === 503 || serviceCode === 'not_configured') {
            throw new SessionCredentialError(
              'not-configured',
              'The session service is not configured with a Decart API key.',
              { status: response.status },
            );
          }
          throw new SessionCredentialError(
            'server',
            'The session service could not issue a token.',
            { status: response.status },
          );
        }

        const token = isRecord(payload) ? (payload as TokenResponse).apiKey : null;
        if (typeof token !== 'string' || token.trim().length === 0) {
          throw new SessionCredentialError(
            'invalid-response',
            'The session service returned an invalid token response.',
          );
        }

        return token;
      } catch (error) {
        if (error instanceof SessionCredentialError) throw error;
        if (isAbortError(error)) {
          throw new SessionCredentialError(
            'network',
            'The session service took too long to respond.',
            { cause: error },
          );
        }
        throw new SessionCredentialError(
          'network',
          'Could not reach the session service. Check your connection and try again.',
          { cause: error },
        );
      } finally {
        globalThis.clearTimeout(timeout);
      }
    },
  };
}
