import {
  getPaystackPublicKey as getVaultPaystackKey,
  isPaystackConfigured,
} from '@/services/security/vault';

export const PAYSTACK_PUBLIC_KEY_STORAGE = 'dallr_paystack_public_key';

export function getPaystackPublicKey(): string {
  try {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(PAYSTACK_PUBLIC_KEY_STORAGE);
      if (stored && stored.trim()) return stored.trim();
    }
  } catch {
    // Storage can throw in private browsing modes; fall back to the vault key.
  }
  return getVaultPaystackKey();
}

export function setPaystackPublicKey(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      if (key.trim()) {
        window.localStorage.setItem(PAYSTACK_PUBLIC_KEY_STORAGE, key.trim());
      } else {
        window.localStorage.removeItem(PAYSTACK_PUBLIC_KEY_STORAGE);
      }
    }
  } catch {
    // Storage can throw in private browsing modes; clearing is best-effort.
  }
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // in kobo
        ref?: string;
        currency?: string;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string; status: string; trans: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

export async function loadPaystackScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.PaystackPop) return;

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('paystack-inline-js');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Paystack')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error('Unable to connect to Paystack payment gateway. Check network or ad-blocker.'));
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export interface PaystackCheckoutOptions {
  email: string;
  amountNgn: number;
  credits: number;
  amountUsd: number;
  onSuccess: (reference: string) => void;
  onCancel?: () => void;
}

export async function openPaystackCheckout(options: PaystackCheckoutOptions): Promise<void> {
  const key = getPaystackPublicKey();
  const koboAmount = Math.max(100, Math.round(options.amountNgn * 100));
  const reference = `dallr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (!isPaystackConfigured()) {
    // Development fallback: no real Paystack key is configured, so top-ups are simulated.
    try {
      await loadPaystackScript();
    } catch {
      // The gateway script may be blocked by an ad-blocker; the fallback checkout still works locally.
    }

    const confirmed = window.confirm(
      `[Paystack fallback]\n\nPay ₦${options.amountNgn.toLocaleString()} ($${options.amountUsd}) for ${options.credits.toLocaleString()} Dallr Cam credits?\n\nClick OK to proceed with the fallback approval.`,
    );
    if (confirmed) {
      options.onSuccess(reference);
    } else {
      options.onCancel?.();
    }
    return;
  }

  // Real Paystack checkout for production builds and configured sandbox keys.
  try {
    await loadPaystackScript();

    if (!window.PaystackPop) {
      throw new Error('Paystack inline script did not initialize.');
    }

    const handler = window.PaystackPop.setup({
      key,
      email: options.email,
      amount: koboAmount,
      currency: 'NGN',
      ref: reference,
      metadata: {
        custom_fields: [
          {
            display_name: 'Credits Purchased',
            variable_name: 'credits',
            value: options.credits,
          },
          {
            display_name: 'USD Equivalent',
            variable_name: 'amount_usd',
            value: options.amountUsd,
          },
        ],
      },
      callback: (response) => {
        options.onSuccess(response.reference || reference);
      },
      onClose: () => {
        options.onCancel?.();
      },
    });

    handler.openIframe();
    return;
  } catch (err) {
    console.warn('[Paystack] Real checkout failed:', err);
    throw new Error('Failed to initiate the Paystack checkout. Check your connection and try again.');
  }
}
