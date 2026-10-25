import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMockLoad } from '@/hooks/useMockLoad';

describe('useMockLoad', () => {
  it('moves from loading to ready for sample repositories', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMockLoad(false, 400));

    expect(result.current.state).toBe('loading');
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.state).toBe('ready');
    vi.useRealTimers();
  });

  it('enters an error state and retries', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMockLoad(true, 200));

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.state).toBe('error');

    act(() => {
      result.current.retry();
    });
    expect(result.current.state).toBe('loading');

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.state).toBe('error');
    vi.useRealTimers();
  });
});
