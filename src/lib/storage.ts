import {
  createMockSessions,
  createMockTransactions,
  createMockUser,
  createMockWallet,
  DEFAULT_SETTINGS,
  DEFAULT_STUDIO_DRAFT,
} from '@/lib/mock-data';
import type { AppSettings, PersistedState } from '@/types';

const STORAGE_KEY = 'dallr:state:v2';

export function createDefaultState(): PersistedState {
  return {
    version: 2,
    user: createMockUser(),
    wallet: createMockWallet(),
    settings: structuredClone(DEFAULT_SETTINGS),
    transactions: createMockTransactions(),
    sessions: createMockSessions(),
    studioDraft: { ...DEFAULT_STUDIO_DRAFT },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function loadPersistedState(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 2) return null;

    const defaults = createDefaultState();
    const settings: AppSettings = isRecord(parsed.settings)
      ? {
          ...defaults.settings,
          ...parsed.settings,
          notifications: {
            ...defaults.settings.notifications,
            ...(isRecord(parsed.settings.notifications) ? parsed.settings.notifications : {}),
          },
        }
      : defaults.settings;

    return {
      version: 2,
      user: isRecord(parsed.user) ? (parsed.user as unknown as PersistedState['user']) : null,
      wallet: isRecord(parsed.wallet)
        ? { ...defaults.wallet, ...(parsed.wallet as Partial<PersistedState['wallet']>) }
        : defaults.wallet,
      settings,
      transactions: Array.isArray(parsed.transactions)
        ? (parsed.transactions as PersistedState['transactions'])
        : defaults.transactions,
      sessions: Array.isArray(parsed.sessions)
        ? (parsed.sessions as PersistedState['sessions'])
        : defaults.sessions,
      studioDraft: isRecord(parsed.studioDraft)
        ? { ...defaults.studioDraft, ...(parsed.studioDraft as Partial<PersistedState['studioDraft']>) }
        : defaults.studioDraft,
    };
  } catch (error) {
    console.warn('Unable to restore local workspace state.', error);
    return null;
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to save local workspace state.', error);
  }
}

export function clearPersistedState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear local workspace state.', error);
  }
}
