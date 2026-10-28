import { CREDIT_USD } from '@/lib/credits';
import type {
  AppSettings,
  Preset,
  SessionRecord,
  StudioDraft,
  Transaction,
  User,
  Wallet,
} from '@/types';

export const DEFAULT_USER: User = {
  id: 'usr_creator',
  name: 'Creator',
  email: 'creator@dallr.studio',
  plan: 'Standard',
  joinedAt: new Date().toISOString(),
  workspaceId: 'ws_dallr_main',
};

export const DEFAULT_WALLET: Wallet = {
  balanceCredits: 0,
  creditUsd: CREDIT_USD,
  lifetimeTopUpUsd: 0,
  ngnPerUsd: 1_650,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_SESSIONS: SessionRecord[] = [];

export const PRESETS: Preset[] = [
  {
    id: 'studio-portrait',
    name: 'Studio portrait',
    description: 'Soft key light, editorial grade',
    prompt:
      'Editorial studio portrait, soft key light from the left, warm skin tones, muted olive backdrop, medium format detail.',
    gradient: 'from-[#33312f] via-[#5b5348] to-[#b39a78]',
    glow: 'bg-[#d9bb91]/40',
  },
  {
    id: 'noir-35mm',
    name: 'Noir 35mm',
    description: 'Monochrome, deep contrast',
    prompt:
      'Black and white 35mm portrait, hard side light, deep contrast, silver halide grain, documentary framing.',
    gradient: 'from-[#17171a] via-[#494a4f] to-[#c9c9cc]',
    glow: 'bg-white/30',
  },
  {
    id: 'golden-hour',
    name: 'Golden hour',
    description: 'Warm backlight, soft haze',
    prompt:
      'Golden hour portrait, low sun behind the subject, warm rim light, soft haze, shallow depth of field, 85mm lens.',
    gradient: 'from-[#3a2418] via-[#9b5b2d] to-[#f0c27b]',
    glow: 'bg-[#ffbf70]/40',
  },
  {
    id: 'cyber-bloom',
    name: 'Cyber bloom',
    description: 'Neon cyan and magenta',
    prompt:
      'Neon cyan and magenta bloom, wet reflective surfaces, cinematic night portrait, soft anamorphic flares.',
    gradient: 'from-[#0d2938] via-[#235d75] to-[#c25f9f]',
    glow: 'bg-[#61d6e8]/40',
  },
  {
    id: 'paper-cut',
    name: 'Paper craft',
    description: 'Tactile layered cut-outs',
    prompt:
      'Layered paper craft portrait, cut-paper edges, tactile fibers, warm desk lamp light, stop-motion miniature set.',
    gradient: 'from-[#44362a] via-[#a99173] to-[#efe4d2]',
    glow: 'bg-[#f4dfbb]/40',
  },
  {
    id: 'analog-heat',
    name: 'Analog heat',
    description: 'Film grain, warm halation',
    prompt:
      'Warm analog film look, visible grain, halation around highlights, soft contrast, slightly faded blacks, 35mm.',
    gradient: 'from-[#2c1c1e] via-[#79463d] to-[#d5936c]',
    glow: 'bg-[#e8a17a]/40',
  },
];

export const DEFAULT_PRESET_ID = PRESETS[0]!.id;

export const DEFAULT_PROMPT = '';

export const DEFAULT_STUDIO_DRAFT: StudioDraft = {
  prompt: DEFAULT_PROMPT,
  presetId: null,
  revision: 0,
};

export const DEFAULT_SETTINGS: AppSettings = {
  accent: 'aurora',
  reduceMotion: false,
  compact: false,
  mirrorCamera: true,
  rememberCamera: true,
  usageRatePerMin: 240,
  notifications: {
    sessionEnded: true,
    lowBalance: true,
    productUpdates: false,
  },
  simulateOffline: false,
  simulateDataError: false,
};

export function createDefaultSessions(): SessionRecord[] {
  return [];
}

export function createDefaultTransactions(): Transaction[] {
  return [];
}

export function createDefaultUser(): User {
  return { ...DEFAULT_USER };
}

export function createDefaultWallet(): Wallet {
  return { ...DEFAULT_WALLET };
}
