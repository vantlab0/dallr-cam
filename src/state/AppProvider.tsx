import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createId } from '@/lib/id';
import {
  getSupabaseClient,
  getInitialSupabaseUser,
  signInWithSupabase,
  signUpWithSupabase,
  signOutFromSupabase,
} from '@/services/supabase/client';
import {
  createDefaultState,
  loadPersistedState,
  savePersistedState,
} from '@/lib/storage';
import {
  fetchWallet,
  topUpWallet as topUpWalletService,
  deductWallet as deductWalletService,
  recordTransaction as recordTransactionService,
} from '@/services/supabase/wallet';
import type {
  AppSettings,
  ConnectionState,
  NotificationPreferences,
  PersistedState,
  StudioDraft,
  User,
  Wallet,
} from '@/types';
import { AppContext, type SessionRecordInput } from './app-context';
import { useToast } from './useToast';
import { isProductionRuntime } from '@/lib/environment';
import { isSupabaseConfigured } from '@/services/security/vault';

export function AppProvider({ children }: { children: ReactNode }) {
  const [initial] = useState<PersistedState>(() => loadPersistedState() ?? createDefaultState());
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(() =>
    // Production builds require a real Supabase session; development seeds a local user.
    isProductionRuntime() ? null : initial.user,
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet>(initial.wallet);
  const [settings, setSettings] = useState<AppSettings>(initial.settings);
  const [transactions, setTransactions] = useState(initial.transactions);
  const [sessions, setSessions] = useState(initial.sessions);
  const [studioDraft, setStudioDraftState] = useState(initial.studioDraft);
  const [onlineNow, setOnlineNow] = useState(() => navigator.onLine);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectingRef = useRef(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setBooting(false);
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnlineNow(true);
    const handleOffline = () => setOnlineNow(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const captureAccessToken = useCallback(async () => {
    try {
      const client = getSupabaseClient();
      const { data } = await client.auth.getSession();
      setAccessToken(data.session?.access_token ?? null);
    } catch {
      setAccessToken(null);
    }
  }, []);

  const seedWalletFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured() || !accessToken) return;
    const balance = await fetchWallet();
    if (balance) {
      setWallet((current) => ({
        ...current,
        balanceCredits: balance.balanceCredits,
        lifetimeTopUpUsd: balance.lifetimeTopUpUsd,
      }));
    }
  }, [accessToken]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = settings.accent;
    root.classList.add('dark');
    root.classList.toggle('reduce-motion', settings.reduceMotion);
    root.classList.toggle('compact-ui', settings.compact);
  }, [settings.accent, settings.reduceMotion, settings.compact]);

  useEffect(() => {
    if (booting) return;
    savePersistedState({
      version: 3,
      user,
      wallet,
      settings,
      transactions,
      sessions,
      studioDraft,
    });
  }, [booting, user, wallet, settings, transactions, sessions, studioDraft]);

  const connection: ConnectionState = reconnecting
    ? 'reconnecting'
    : settings.simulateOffline || !onlineNow
      ? 'offline'
      : 'online';

  useEffect(() => {
    getInitialSupabaseUser().then(async (sbUser) => {
      if (sbUser) {
        setUser((current) => current || sbUser);
      }
      await captureAccessToken();
      await seedWalletFromSupabase();
    }).catch(() => {});
  }, [captureAccessToken, seedWalletFromSupabase]);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      try {
        const sbUser = await signInWithSupabase({ email, password });
        setUser(sbUser);
        await captureAccessToken();
        await seedWalletFromSupabase();
      } catch (err: unknown) {
        throw err;
      }
    },
    [captureAccessToken, seedWalletFromSupabase],
  );

  const register = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      try {
        const { user: sbUser } = await signUpWithSupabase({ email, password, name });
        setUser(sbUser);
        await captureAccessToken();
        await seedWalletFromSupabase();
      } catch (err: unknown) {
        throw err;
      }
    },
    [captureAccessToken, seedWalletFromSupabase],
  );

  const signOut = useCallback(() => {
    signOutFromSupabase().catch(() => {});
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<Pick<User, 'name' | 'email'>>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const updateNotifications = useCallback((patch: Partial<NotificationPreferences>) => {
    setSettings((current) => ({
      ...current,
      notifications: { ...current.notifications, ...patch },
    }));
  }, []);

  const setStudioDraft = useCallback((patch: Partial<Omit<StudioDraft, 'revision'>>) => {
    setStudioDraftState((current) => ({ ...current, ...patch }));
  }, []);

  const addSessionRecord = useCallback((input: SessionRecordInput) => {
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - input.durationSec * 1000);
    setSessions((current) =>
      [
        {
          id: createId('ses'),
          title: input.title,
          presetId: input.presetId,
          prompt: input.prompt,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSec: input.durationSec,
          creditsUsed: input.creditsUsed,
          status: input.status,
          cameraLabel: input.cameraLabel,
          referenceName: input.referenceName,
          mode: input.mode,
        },
        ...current,
      ].slice(0, 100),
    );
  }, []);

  const walletRef = useRef(wallet);
  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (walletRef.current.balanceCredits < amount) {
      return false;
    }
    const result = await deductWalletService(amount, 'Live rendering');
    if (!result.ok) {
      return false;
    }
    const nextBalance =
      typeof result.balanceCredits === 'number'
        ? result.balanceCredits
        : Math.max(0, walletRef.current.balanceCredits - amount);
    walletRef.current = { ...walletRef.current, balanceCredits: nextBalance };
    setWallet((current) => ({
      ...current,
      balanceCredits: nextBalance,
    }));
    return true;
  }, []);

  const recordUsageTransaction = useCallback(
    async (creditsUsed: number, durationSec: number, title?: string) => {
      if (creditsUsed <= 0) return;
      const amountUsd = Number((creditsUsed * 0.02).toFixed(2));
      const reference = `use_${Math.random().toString(36).slice(2, 10)}`;
      const description = title
        ? `Live rendering · ${title} (${durationSec}s)`
        : `Live rendering · ${durationSec}s`;
      await recordTransactionService(
        creditsUsed,
        amountUsd,
        'usage',
        description,
        reference,
      );
      setTransactions((current) => [
        {
          id: createId('txn'),
          type: 'usage',
          description,
          credits: creditsUsed,
          amountUsd,
          status: 'completed',
          createdAt: new Date().toISOString(),
          reference,
          method: 'Credit balance',
        },
        ...current,
      ]);
    },
    [],
  );

  const topUpWallet = useCallback(
    async (
      addedCredits: number,
      amountUsd: number,
      description = 'Credit top-up',
    ): Promise<boolean> => {
      const reference = `top_${Math.random().toString(36).slice(2, 10)}`;
      const result = await topUpWalletService(
        addedCredits,
        amountUsd,
        reference,
        description,
      );
      if (!result.ok) return false;
      const nextBalance =
        typeof result.balanceCredits === 'number'
          ? result.balanceCredits
          : walletRef.current.balanceCredits + addedCredits;
      const nextLifetime = walletRef.current.lifetimeTopUpUsd + amountUsd;
      walletRef.current = {
        ...walletRef.current,
        balanceCredits: nextBalance,
        lifetimeTopUpUsd: nextLifetime,
      };
      setWallet((current) => ({
        ...current,
        balanceCredits: nextBalance,
        lifetimeTopUpUsd: nextLifetime,
      }));
      setTransactions((current) => [
        {
          id: createId('txn'),
          type: 'topup',
          description,
          credits: addedCredits,
          amountUsd,
          status: 'completed',
          createdAt: new Date().toISOString(),
          reference,
          method: 'Card Payment',
        },
        ...current,
      ]);
      return true;
    },
    [],
  );

  const reconnect = useCallback(async (): Promise<boolean> => {
    if (reconnectingRef.current) return false;
    reconnectingRef.current = true;
    setReconnecting(true);
    setSettings((current) => ({ ...current, simulateOffline: false }));
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    reconnectingRef.current = false;
    setReconnecting(false);

    if (!navigator.onLine) {
      pushToast({
        tone: 'error',
        title: 'Still offline',
        description: 'Check your network connection, then try again.',
      });
      return false;
    }

    pushToast({
      tone: 'success',
      title: 'Connection restored',
      description: 'Workspace services are reachable again.',
    });
    return true;
  }, [pushToast]);

  const value = useMemo(
    () => ({
      booting,
      user,
      wallet,
      settings,
      transactions,
      sessions,
      studioDraft,
      connection,
      isOnline: connection === 'online',
      signIn,
      register,
      signOut,
      updateUser,
      updateSettings,
      updateNotifications,
      setStudioDraft,
      addSessionRecord,
      deductCredits,
      recordUsageTransaction,
      topUpWallet,
      reconnect,
    }),
    [
      booting,
      user,
      wallet,
      settings,
      transactions,
      sessions,
      studioDraft,
      connection,
      signIn,
      register,
      signOut,
      updateUser,
      updateSettings,
      updateNotifications,
      setStudioDraft,
      addSessionRecord,
      deductCredits,
      recordUsageTransaction,
      topUpWallet,
      reconnect,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
