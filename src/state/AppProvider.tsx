import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createId } from '@/lib/id';
import { createDefaultUser } from '@/lib/defaults';
import {
  clearPersistedState,
  createDefaultState,
  loadPersistedState,
  savePersistedState,
} from '@/lib/storage';
import type {
  AppSettings,
  ConnectionState,
  NotificationPreferences,
  PersistedState,
  StudioDraft,
  User,
} from '@/types';
import { AppContext, type SessionRecordInput } from './app-context';
import { useToast } from './useToast';

function titleCase(value: string): string {
  return value
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function userFromEmail(email: string): User {
  const localPart = email.split('@')[0] ?? 'User';
  return {
    ...createDefaultUser(),
    id: createId('usr'),
    name: titleCase(localPart) || 'User',
    email,
    plan: 'Standard',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [initial] = useState<PersistedState>(() => loadPersistedState() ?? createDefaultState());
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(initial.user);
  const [wallet, setWallet] = useState(initial.wallet);
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

  const signIn = useCallback(
    async ({ email }: { email: string; password: string }) => {
      setUser(userFromEmail(email));
    },
    [],
  );

  const register = useCallback(
    async ({ name, email }: { name: string; email: string; password: string }) => {
      setUser({
        ...createDefaultUser(),
        id: createId('usr'),
        name: name.trim() || 'User',
        email: email.trim(),
        plan: 'Standard',
      });
    },
    [],
  );

  const signOut = useCallback(() => {
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

  const deductCredits = useCallback((amount: number): boolean => {
    if (walletRef.current.balanceCredits < amount) {
      return false;
    }
    const nextBalance = Math.max(0, walletRef.current.balanceCredits - amount);
    walletRef.current = { ...walletRef.current, balanceCredits: nextBalance };
    setWallet((current) => ({
      ...current,
      balanceCredits: nextBalance,
    }));
    return true;
  }, []);

  const recordUsageTransaction = useCallback((creditsUsed: number, durationSec: number, title?: string) => {
    if (creditsUsed <= 0) return;
    const amountUsd = Number((creditsUsed * 0.02).toFixed(2));
    setTransactions((current) => [
      {
        id: createId('txn'),
        type: 'usage',
        description: title ? `Live rendering · ${title} (${durationSec}s)` : `Live rendering · ${durationSec}s`,
        credits: creditsUsed,
        amountUsd,
        status: 'completed',
        createdAt: new Date().toISOString(),
        reference: `use_${Math.random().toString(36).slice(2, 10)}`,
        method: 'Credit balance',
      },
      ...current,
    ]);
  }, []);

  const topUpWallet = useCallback((addedCredits: number, amountUsd: number, description = 'Credit top-up') => {
    const nextBalance = walletRef.current.balanceCredits + addedCredits;
    const nextLifetime = walletRef.current.lifetimeTopUpUsd + amountUsd;
    walletRef.current = { ...walletRef.current, balanceCredits: nextBalance, lifetimeTopUpUsd: nextLifetime };
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
        reference: `top_${Math.random().toString(36).slice(2, 10)}`,
        method: 'Card Payment',
      },
      ...current,
    ]);
  }, []);

  const resetDemoData = useCallback(() => {
    const defaults = createDefaultState();
    clearPersistedState();
    setUser(defaults.user);
    setWallet(defaults.wallet);
    setSettings(defaults.settings);
    setTransactions(defaults.transactions);
    setSessions(defaults.sessions);
    setStudioDraftState(defaults.studioDraft);
    setOnlineNow(navigator.onLine);
    setReconnecting(false);
    reconnectingRef.current = false;
    setBooting(true);
    window.setTimeout(() => setBooting(false), 450);
  }, []);

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
      resetDemoData,
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
      resetDemoData,
      reconnect,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
