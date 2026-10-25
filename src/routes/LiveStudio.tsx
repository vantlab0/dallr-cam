import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { useLucySession } from '@/hooks/useLucySession';
import { useCameraDevices } from '@/hooks/useCameraDevices';
import type { LucySessionSummary } from '@/services/decart/session';
import { estimatedSecondsRemaining } from '@/lib/credits';
import { StudioStage } from '@/components/studio/StudioStage';

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

export function LiveStudio() {
  const {
    wallet,
    settings,
    studioDraft,
    connection,
    isOnline,
    setStudioDraft,
    updateSettings,
    addSessionRecord,
    deductCredits,
    recordUsageTransaction,
    reconnect,
  } = useApp();
  const { pushToast } = useToast();

  const [prompt, setPrompt] = useState(studioDraft.prompt);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showPip, setShowPip] = useState(true);

  const referenceUrl = useObjectUrl(referenceFile);

  const appliedPromptRef = useRef('');
  const appliedRevision = useRef(studioDraft.revision);
  const sessionCreditsUsedRef = useRef(0);
  const [firstFrameAt, setFirstFrameAt] = useState<number | null>(null);

  const handleFirstFrame = useCallback(() => {
    setFirstFrameAt((prev) => prev ?? Date.now());
  }, []);

  const handleEnded = useCallback(
    (summary: LucySessionSummary) => {
      const creditsUsed = sessionCreditsUsedRef.current;
      const actualDuration = firstFrameAt
        ? Math.max(1, Math.round((Date.now() - firstFrameAt) / 1_000))
        : 0;
      const title = summary.referenceName
        ? `Reference session · ${summary.referenceName}`
        : 'Live session';

      addSessionRecord({
        title,
        presetId: null,
        prompt: summary.prompt,
        durationSec: actualDuration,
        creditsUsed,
        cameraLabel: summary.cameraLabel,
        referenceName: summary.referenceName,
        status: summary.status,
        mode: 'live',
      });

      if (creditsUsed > 0) {
        recordUsageTransaction(creditsUsed, actualDuration, summary.referenceName ?? undefined);
      }

      setElapsedSec(actualDuration);

      if (summary.status === 'failed') {
        pushToast({
          tone: 'error',
          title: 'Session stopped',
          description:
            creditsUsed > 0
              ? `The Dallr Cam session stopped. ${creditsUsed} credits used for ${actualDuration}s rendering.`
              : 'The Dallr Cam session stopped before streaming video. No credits were deducted.',
        });
      } else {
        pushToast({
          tone: 'success',
          title: 'Session ended',
          description: `${actualDuration}s rendered (${creditsUsed} credits deducted).`,
        });
      }
    },
    [firstFrameAt, addSessionRecord, recordUsageTransaction, pushToast],
  );

  const {
    snapshot,
    localStream,
    remoteStream,
    start,
    stop,
    setPrompt: setLivePrompt,
    setReference: setLiveReference,
  } = useLucySession({ onEnded: handleEnded });

  const camera = useCameraDevices(settings.rememberCamera);
  const refreshDevices = camera.refresh;

  const status = snapshot.status;
  const isLive = status === 'connected' || status === 'reconnecting';
  const controlsBusy = status === 'requesting-camera' || status === 'connecting';
  const sessionActive = isLive || controlsBusy;
  const fatalError = snapshot.error?.fatal ? snapshot.error : null;

  const usageRate = settings.usageRatePerMin;
  const estimatedRemaining = estimatedSecondsRemaining(wallet.balanceCredits, usageRate);

  useEffect(() => {
    if (studioDraft.revision === appliedRevision.current) return;
    appliedRevision.current = studioDraft.revision;
    setPrompt(studioDraft.prompt);
    setPromptError(null);
  }, [studioDraft.revision, studioDraft.prompt]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStudioDraft({ prompt, presetId: null });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [prompt, setStudioDraft]);

  // Only start counting seconds and deducting credits after first frame is received from Decart
  useEffect(() => {
    if (status !== 'connected' || firstFrameAt === null) {
      if (status !== 'connected') {
        setFirstFrameAt(null);
      }
      return;
    }

    const interval = window.setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - firstFrameAt) / 1_000);
      setElapsedSec(currentElapsed);

      // Deduct 4 credits for every second rendered
      const success = deductCredits(4);
      if (success) {
        sessionCreditsUsedRef.current += 4;
      } else {
        stop('user');
        pushToast({
          tone: 'error',
          title: 'Credits depleted',
          description: 'Your credit balance has reached 0. Live rendering has stopped. Top up your wallet to continue.',
        });
      }
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [firstFrameAt, status, deductCredits, stop, pushToast]);

  useEffect(() => {
    if (!isLive) return;
    const value = prompt.trim();
    if (!value || value === appliedPromptRef.current) return;

    const timer = window.setTimeout(() => {
      void setLivePrompt(value).then(() => {
        appliedPromptRef.current = value;
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isLive, prompt, setLivePrompt]);

  useEffect(() => {
    if (!localStream) return;
    void refreshDevices();
  }, [localStream, refreshDevices]);

  useEffect(() => {
    if (connection === 'online' || !sessionActive) return;
    stop('offline');
  }, [connection, sessionActive, stop]);

  const handleStart = () => {
    if (sessionActive) return;
    if (!prompt.trim()) {
      setPromptError('Add a prompt before starting a session.');
      document.getElementById('transform-prompt')?.focus();
      return;
    }
    if (!isOnline) {
      pushToast({
        tone: 'error',
        title: 'You are offline',
        description: 'Reconnect before starting a Dallr Cam session.',
      });
      return;
    }

    if (wallet.balanceCredits < 4) {
      pushToast({
        tone: 'error',
        title: 'Insufficient credits',
        description: 'You need at least 4 credits to start live rendering. Please top up your wallet.',
      });
      return;
    }

    sessionCreditsUsedRef.current = 0;
    setFirstFrameAt(null);
    setPromptError(null);
    setElapsedSec(0);
    appliedPromptRef.current = prompt.trim();
    void start({
      prompt: prompt.trim(),
      referenceFile,
      deviceId: camera.selectedId,
      mirror: settings.mirrorCamera,
    });
  };

  const handleApplyPrompt = () => {
    const value = prompt.trim();
    if (!value) {
      setPromptError('Add a prompt before applying it.');
      document.getElementById('transform-prompt')?.focus();
      return;
    }
    if (!isLive) {
      handleStart();
      return;
    }

    setPromptError(null);
    void setLivePrompt(value).then(() => {
      appliedPromptRef.current = value;
    });
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (promptError && value.trim()) setPromptError(null);
  };

  const handleReferenceChange = (file: File | null) => {
    setReferenceFile(file);
    if (isLive) void setLiveReference(file);
  };

  return (
    <div className="relative size-full min-h-[100dvh] overflow-hidden bg-[#060709] lg:h-full lg:min-h-0">
      <StudioStage
        status={status}
        remoteStream={remoteStream}
        localStream={localStream}
        referenceFile={referenceFile}
        referenceUrl={referenceUrl}
        error={fatalError}
        mirror={settings.mirrorCamera}
        isOnline={isOnline}
        elapsedSec={elapsedSec}
        balanceCredits={wallet.balanceCredits}
        estimatedRemainingSec={estimatedRemaining}
        camera={{
          devices: camera.devices,
          selectedId: camera.selectedId,
          selectDevice: camera.selectDevice,
          refresh: () => void refreshDevices(),
          error: camera.error,
        }}
        showPip={showPip}
        onTogglePip={() => setShowPip((current) => !current)}
        onToggleMirror={() => updateSettings({ mirrorCamera: !settings.mirrorCamera })}
        onStart={handleStart}
        onStop={() => stop('user')}
        onRetry={handleStart}
        onReconnect={() => void reconnect()}
        prompt={prompt}
        onPromptChange={handlePromptChange}
        onApplyPrompt={handleApplyPrompt}
        promptError={promptError ?? undefined}
        onReferenceChange={handleReferenceChange}
        updatePending={snapshot.updatePending}
        onFirstFrame={handleFirstFrame}
      />
    </div>
  );
}
