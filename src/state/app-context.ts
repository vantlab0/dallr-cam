import { createContext } from 'react';
import type {
  AppSettings,
  ConnectionState,
  NotificationPreferences,
  SessionMode,
  SessionRecord,
  SessionStatus,
  StudioDraft,
  Transaction,
  User,
  Wallet,
} from '@/types';

export interface SessionRecordInput {
  title: string;
  presetId: string | null;
  prompt: string;
  durationSec: number;
  creditsUsed: number;
  cameraLabel: string;
  referenceName: string | null;
  status: SessionStatus;
  mode: SessionMode;
}

export interface AppContextValue {
  booting: boolean;
  user: User | null;
  wallet: Wallet;
  settings: AppSettings;
  transactions: Transaction[];
  sessions: SessionRecord[];
  studioDraft: StudioDraft;
  connection: ConnectionState;
  isOnline: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  signOut: () => void;
  updateUser: (patch: Partial<Pick<User, 'name' | 'email'>>) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateNotifications: (patch: Partial<NotificationPreferences>) => void;
  setStudioDraft: (patch: Partial<Omit<StudioDraft, 'revision'>>) => void;
  addSessionRecord: (input: SessionRecordInput) => void;
  deductCredits: (amount: number) => boolean;
  recordUsageTransaction: (creditsUsed: number, durationSec: number, title?: string) => void;
  topUpWallet: (addedCredits: number, amountUsd: number, description?: string) => void;
  resetDemoData: () => void;
  reconnect: () => Promise<boolean>;
}

export const AppContext = createContext<AppContextValue | null>(null);
