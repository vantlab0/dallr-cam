export const CREDIT_USD = 0.01;
export const CREDITS_PER_USD = 1 / CREDIT_USD;
export const CREDITS_PER_SECOND = 4;
export const CREDITS_PER_MINUTE = CREDITS_PER_SECOND * 60; // 240 credits/min
export const MIN_TOPUP_USD = 10;
export const MIN_TOPUP_CREDITS = MIN_TOPUP_USD * CREDITS_PER_USD;
export const TOPUP_PRESETS_USD = [10, 50, 100, 250] as const;

export function usdToCredits(usd: number): number {
  return Math.round(usd * CREDITS_PER_USD);
}

export function creditsToUsd(credits: number): number {
  return credits * CREDIT_USD;
}

export function ngnEquivalent(usd: number, ngnPerUsd: number): number {
  return Math.round(usd * ngnPerUsd);
}

/** Estimated remaining run time, in seconds, for a credit balance at 4 credits/sec (240 cr/min). */
export function estimatedSecondsRemaining(
  balanceCredits: number,
  ratePerMinute: number = CREDITS_PER_MINUTE,
): number {
  if (!Number.isFinite(ratePerMinute) || ratePerMinute <= 0) return 0;
  return Math.max(0, Math.floor((balanceCredits / ratePerMinute) * 60));
}

export function creditsUsedForDuration(durationSec: number, ratePerMinute: number): number {
  if (!Number.isFinite(ratePerMinute) || ratePerMinute <= 0) return 0;
  return Math.max(0, (durationSec / 60) * ratePerMinute);
}

export function isValidTopUpUsd(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_TOPUP_USD;
}
