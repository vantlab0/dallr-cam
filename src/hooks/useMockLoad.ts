import { useCallback, useEffect, useState } from 'react';

export type LoadState = 'loading' | 'ready' | 'error';

/**
 * Small deterministic loading simulation for the local sample repositories.
 * It exists so loading, empty and error states are reviewable without a backend.
 */
export function useMockLoad(simulateError: boolean, delayMs = 520) {
  const [state, setState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState('loading');
    const timer = window.setTimeout(() => {
      setState(simulateError ? 'error' : 'ready');
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [simulateError, attempt, delayMs]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
}
