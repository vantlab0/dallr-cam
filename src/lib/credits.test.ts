import { describe, expect, it } from 'vitest';
import {
  creditsToUsd,
  creditsUsedForDuration,
  estimatedSecondsRemaining,
  isValidTopUpUsd,
  MIN_TOPUP_CREDITS,
  ngnEquivalent,
  usdToCredits,
} from '@/lib/credits';

describe('credit maths', () => {
  it('converts the $20 minimum into 1,000 credits', () => {
    expect(usdToCredits(20)).toBe(1_000);
    expect(MIN_TOPUP_CREDITS).toBe(1_000);
    expect(usdToCredits(250)).toBe(12_500);
  });

  it('converts credits back to USD', () => {
    expect(creditsToUsd(1_000)).toBeCloseTo(20, 6);
    expect(creditsToUsd(4_820)).toBeCloseTo(96.4, 6);
  });

  it('computes the mock NGN checkout equivalent', () => {
    expect(ngnEquivalent(20, 1_650)).toBe(33_000);
    expect(ngnEquivalent(50, 1_650)).toBe(82_500);
  });

  it('estimates remaining session time from the demo rate', () => {
    expect(estimatedSecondsRemaining(4_820, 12)).toBe(24_100);
    expect(estimatedSecondsRemaining(0, 12)).toBe(0);
    expect(estimatedSecondsRemaining(100, 0)).toBe(0);
  });

  it('computes estimated credits for an elapsed session', () => {
    expect(creditsUsedForDuration(60, 12)).toBe(12);
    expect(creditsUsedForDuration(90, 12)).toBe(18);
    expect(creditsUsedForDuration(90, 0)).toBe(0);
  });

  it('enforces the top-up minimum', () => {
    expect(isValidTopUpUsd(20)).toBe(true);
    expect(isValidTopUpUsd(19.99)).toBe(false);
    expect(isValidTopUpUsd(Number.NaN)).toBe(false);
  });
});
