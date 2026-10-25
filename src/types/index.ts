export type AccentTheme = 'aurora' | 'citrine' | 'rose';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  joinedAt: string;
  workspaceId: string;
  /** Mock accounts are local-only and are not backed by an auth service. */
  isDemo: boolean;
}

export interface Wallet {
  balanceCredits: number;
  creditUsd: number;
  lifetimeTopUpUsd: number;
  ngnPerUsd: number;
}

export type TransactionType = 'topup' | 'usage' | 'refund';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  credits: number;
  amountUsd: number;
  status: TransactionStatus;
  createdAt: string;
  reference: string;
  method?: string;
}

export type SessionStatus = 'completed' | 'stopped' | 'failed';
export type SessionMode = 'sample' | 'demo' | 'live';

export interface SessionRecord {
  id: string;
  title: string;
  presetId: string | null;
  prompt: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  creditsUsed: number;
  status: SessionStatus;
  cameraLabel: string;
  referenceName: string | null;
  mode: SessionMode;
}

export interface NotificationPreferences {
  sessionEnded: boolean;
  lowBalance: boolean;
  productUpdates: boolean;
}

export interface AppSettings {
  accent: AccentTheme;
  reduceMotion: boolean;
  compact: boolean;
  mirrorCamera: boolean;
  rememberCamera: boolean;
  usageRatePerMin: number;
  notifications: NotificationPreferences;
  simulateOffline: boolean;
  simulateDataError: boolean;
}

export interface StudioDraft {
  prompt: string;
  presetId: string | null;
  /** Incremented when settings from a historical session are applied. */
  revision: number;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  /** Tailwind gradient classes used for the generated preview card. */
  gradient: string;
  glow: string;
}

export type ConnectionState = 'online' | 'offline' | 'reconnecting';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

/** Lifecycle of a real Decart Lucy session. */
export type LucySessionStatus =
  | 'idle'
  | 'requesting-camera'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'stopped';

export type LucySessionErrorCode =
  | 'camera-denied'
  | 'camera-unavailable'
  | 'camera-busy'
  | 'camera-unsupported'
  | 'credential-not-configured'
  | 'credential-unauthorized'
  | 'credential-network'
  | 'credential-invalid'
  | 'credential-server'
  | 'sdk-load-failed'
  | 'reference-upload-failed'
  | 'connect-failed'
  | 'connect-timeout'
  | 'authentication-failed'
  | 'insufficient-credits'
  | 'moderation'
  | 'session-limit'
  | 'disconnected'
  | 'update-failed'
  | 'app-offline'
  | 'unknown';

export interface LucySessionError {
  code: LucySessionErrorCode | (string & {});
  title: string;
  message: string;
  hint?: string;
  /** Fatal errors end the session; non-fatal errors are live-update warnings. */
  fatal: boolean;
}

export type LucyMirrorMode = 'auto' | boolean;

export interface LucySessionSnapshot {
  status: LucySessionStatus;
  error: LucySessionError | null;
  sessionId: string | null;
  startedAt: number | null;
  endedAt: number | null;
  providerSeconds: number | null;
  cameraLabel: string | null;
  mirror: LucyMirrorMode | null;
  updatePending: boolean;
}

export interface PersistedState {
  version: 1 | 2 | 3;
  user: User | null;
  wallet: Wallet;
  settings: AppSettings;
  transactions: Transaction[];
  sessions: SessionRecord[];
  studioDraft: StudioDraft;
}
