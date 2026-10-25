import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatCredits,
  formatDuration,
  formatNgn,
  formatUsd,
  getInitials,
  pluralize,
} from '@/lib/format';

describe('format helpers', () => {
  it('formats USD and credit values', () => {
    expect(formatUsd(96.4)).toBe('$96.40');
    expect(formatCredits(4_820)).toBe('4,820');
  });

  it('formats NGN checkout equivalents with an explicit naira symbol', () => {
    expect(formatNgn(33_000)).toBe('₦33,000');
    expect(formatNgn(1_650)).toBe('₦1,650');
  });

  it('formats durations for timers and summaries', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(65)).toBe('1m 05s');
    expect(formatDuration(3_665)).toBe('1h 01m');
  });

  it('formats a session clock', () => {
    expect(formatClock(5)).toBe('00:05');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3_665)).toBe('1:01:05');
  });

  it('derives initials from display names', () => {
    expect(getInitials('Ada Okafor')).toBe('AO');
    expect(getInitials('Dallr')).toBe('DA');
    expect(getInitials('  ')).toBe('D');
  });

  it('pluralises simple counts', () => {
    expect(pluralize(1, 'session')).toBe('1 session');
    expect(pluralize(2, 'session')).toBe('2 sessions');
  });
});
