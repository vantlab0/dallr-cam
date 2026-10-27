import { getPaystackPublicKey as getVaultPaystackKey, isPaystackConfigured } from '@/services/security/vault';

export const PAYSTACK_PUBLIC_KEY_STORAGE = 'dallr_paystack_public_key';

export function getPaystackPublicKey(): string {
  try {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(PAYSTACK_PUBLIC_KEY_STORAGE);
      if (stored && stored.trim()) return stored.trim();
    }
  } catch {
    // Ignore storage errors in restricted contexts
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
    // Ignore storage errors in restricted contexts
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
  const configured = isPaystackConfigured();
  const koboAmount = Math.max(100, Math.round(options.amountNgn * 100));
  const reference = `dallr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (configured) {
    try {
      await loadPaystackScript();

      if (window.PaystackPop) {
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
      }
      throw new Error('Paystack inline SDK failed to initialize.');
    } catch (err) {
      console.error('[Paystack] Checkout failed:', err);
      const msg = err instanceof Error ? err.message : 'Unable to connect to Paystack payment gateway.';
      alert(`Payment Error: ${msg}\n\nPlease check your network connection or ad-blocker settings.`);
      options.onCancel?.();
      return;
    }
  }

  // Fallback demo checkout only when VITE_PAYSTACK_PUBLIC_KEY is not configured in dev mode
  const confirmed = window.confirm(
    `[Paystack Sandbox / Demo Mode]\n\nPay ₦${options.amountNgn.toLocaleString()} ($${options.amountUsd}) for ${options.credits.toLocaleString()} Dallr Cam credits?\n\nClick OK to simulate successful Paystack card approval.`,
  );
  if (confirmed) {
    options.onSuccess(reference);
  } else {
    options.onCancel?.();
  }
}
