import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucySessionSnapshot } from '@/types';
import {
  INITIAL_SESSION_SNAPSHOT,
  LucySessionService,
  type LucySessionStartInput,
  type LucySessionSummary,
} from '@/services/decart/session';
import { createTokenEndpointProvider } from '@/services/decart/credentials';

export function useLucySession(
  options: { onEnded?: (summary: LucySessionSummary) => void } = {},
) {
  const [snapshot, setSnapshot] = useState<LucySessionSnapshot>(
    INITIAL_SESSION_SNAPSHOT,
  );
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const serviceRef = useRef<LucySessionService | null>(null);

  if (!serviceRef.current) {
    serviceRef.current = new LucySessionService();
  }
  const service = serviceRef.current;

  const credentials = useMemo(() => createTokenEndpointProvider(), []);
  const onEndedRef = useRef(options.onEnded);

  useEffect(() => {
    onEndedRef.current = options.onEnded;
  }, [options.onEnded]);

  useEffect(() => {
    const handlePageHide = () => service.stop('user');
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      // Leaving the studio (or the app) must release the camera and provider session.
      service.stop('user');
    };
  }, [service]);

  const start = useCallback(
    (input: LucySessionStartInput) =>
      service.start({
        ...input,
        credentials,
        onSnapshot: setSnapshot,
        onLocalStream: setLocalStream,
        onRemoteStream: setRemoteStream,
        onEnded: (summary) => onEndedRef.current?.(summary),
      }),
    [credentials, service],
  );

  const stop = useCallback(
    (reason: 'user' | 'offline' = 'user') => service.stop(reason),
    [service],
  );

  const setPrompt = useCallback(
    (prompt: string) => service.setPrompt(prompt),
    [service],
  );

  const setReference = useCallback(
    (file: File | null) => service.setReference(file),
    [service],
  );

  return {
    snapshot,
    localStream,
    remoteStream,
    start,
    stop,
    setPrompt,
    setReference,
    endpoint: credentials.endpoint,
    credentialsConfigured: Boolean(credentials.endpoint),
  };
}
