import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { useLucySession } from '@/hooks/useLucySession';
import { useCameraDevices } from '@/hooks/useCameraDevices';
import type { LucySessionSummary } from '@/services/decart/session';
import { estimatedSecondsRemaining } from '@/lib/credits';
import { Button } from '@/components/ui/Button';
import { InlineNotice } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { StudioPromptPanel } from '@/components/studio/StudioPromptPanel';
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
  const { openNav, toggleNav } = useOutletContext<{ openNav: () => void; toggleNav?: () => void }>();

  const [prompt, setPrompt] = useState(studioDraft.prompt);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [showPip, setShowPip] = useState(true);

  const referenceUrl = useObjectUrl(referenceFile);

  const appliedPromptRef = useRef('');
  const appliedRevision = useRef(studioDraft.revision);
  const sessionCreditsUsedRef = useRef(0);

  const handleEnded = useCallback(
    (summary: LucySessionSummary) => {
      const creditsUsed = sessionCreditsUsedRef.current;
      const title = summary.referenceName
        ? `Reference session · ${summary.referenceName}`
        : 'Live session';

      addSessionRecord({
        title,
        presetId: null,
        prompt: summary.prompt,
        durationSec: summary.durationSec,
        creditsUsed,
        cameraLabel: summary.cameraLabel,
        referenceName: summary.referenceName,
        status: summary.status,
        mode: 'live',
      });

      if (creditsUsed > 0) {
        recordUsageTransaction(creditsUsed, summary.durationSec, summary.referenceName ?? undefined);
      }

      setElapsedSec(summary.durationSec);

      if (summary.status === 'failed') {
        pushToast({
          tone: 'error',
          title: 'Session stopped',
          description: `The Lucy session stopped. ${creditsUsed} credits used for ${summary.durationSec}s rendering.`,
        });
      } else {
        pushToast({
          tone: 'success',
          title: 'Session ended',
          description: `${summary.durationSec}s rendered (${creditsUsed} credits deducted).`,
        });
      }
    },
    [addSessionRecord, recordUsageTransaction, pushToast],
  );

  const {
    snapshot,
    localStream,
    remoteStream,
    start,
    stop,
    setPrompt: setLivePrompt,
    setReference: setLiveReference,
    endpoint,
    credentialsConfigured,
  } = useLucySession({ onEnded: handleEnded });

  const camera = useCameraDevices(settings.rememberCamera);
  const refreshDevices = camera.refresh;

  const status = snapshot.status;
  const isLive = status === 'connected' || status === 'reconnecting';
  const controlsBusy = status === 'requesting-camera' || status === 'connecting';
  const sessionActive = isLive || controlsBusy;
  const fatalError = snapshot.error?.fatal ? snapshot.error : null;
  const updateError = snapshot.error && !snapshot.error.fatal ? snapshot.error : null;
  const credentialIssue = snapshot.error?.code.startsWith('credential-') ? snapshot.error : null;

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

  // Wire 4 credits per second deduction during live rendering
  useEffect(() => {
    if (status !== 'connected' || snapshot.startedAt === null) return;
    const startedAt = snapshot.startedAt;

    const interval = window.setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startedAt) / 1_000);
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
  }, [snapshot.startedAt, status, deductCredits, stop, pushToast]);

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
        description: 'Reconnect before starting a Lucy session.',
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
    <div className="grid min-h-[100dvh] grid-cols-1 gap-2 p-2 sm:gap-3 sm:p-3 lg:h-full lg:min-h-0 lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">
      <div className="order-2 flex min-h-[460px] min-w-0 flex-col lg:order-1 lg:min-h-0">
        <StudioPromptPanel
          prompt={prompt}
          onPromptChange={handlePromptChange}
          promptError={promptError ?? undefined}
          referenceFile={referenceFile}
          referenceUrl={referenceUrl}
          onReferenceChange={handleReferenceChange}
          status={status}
          disabled={controlsBusy}
          live={isLive}
          pending={snapshot.updatePending}
          updateError={updateError}
          isOnline={isOnline}
          balanceCredits={wallet.balanceCredits}
          estimatedRemainingSec={estimatedRemaining}
          onStart={handleStart}
          onApplyPrompt={handleApplyPrompt}
          onOpenNotes={() => setNotesOpen(true)}
          onOpenNav={toggleNav ?? openNav}
        />
      </div>

      <div className="order-1 flex min-h-[220px] min-w-0 flex-col lg:order-2 lg:min-h-0">
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
          onOpenNotes={() => setNotesOpen(true)}
          onReconnect={() => void reconnect()}
        />
      </div>

      <Modal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title="Integration notes"
        description="What this build connects to, and what it deliberately does not."
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setNotesOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <InlineNotice
            tone={credentialsConfigured && !credentialIssue ? 'accent' : 'warning'}
            icon={Terminal}
            title={
              credentialIssue
                ? credentialIssue.title
                : credentialsConfigured
                  ? 'Live Lucy 2.5 integration'
                  : 'Session service not configured'
            }
          >
            {credentialIssue
              ? credentialIssue.message
              : credentialsConfigured
                ? 'The studio requests a short-lived client token from your backend, then opens a WebRTC session with Decart Lucy 2.5. The permanent API key never reaches the frontend.'
                : 'Add DECART_API_KEY to .env.local and restart pnpm dev, or point VITE_DECART_TOKEN_ENDPOINT at a hosted token service that returns { "apiKey": "..." }.'}
          </InlineNotice>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-positive/70">
                Implemented
              </p>
              <ul className="mt-2.5 space-y-2 text-[11.5px] leading-[1.45] text-white/45">
                <li>Decart Lucy 2.5 realtime WebRTC</li>
                <li>Camera capture after explicit Start</li>
                <li>Live prompt and reference updates</li>
                <li>Live 4 credits/second rendering deduction</li>
                <li>Short-lived token from your backend</li>
                <li>Mirror handling and session cleanup</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-warning/70">
                Not implemented
              </p>
              <ul className="mt-2.5 space-y-2 text-[11.5px] leading-[1.45] text-white/45">
                <li>Virtual camera driver</li>
                <li>Video or audio recording</li>
                <li>Hosted token service for packaged builds</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/28">
              Token service
            </p>
            <p className="mt-1.5 break-all font-mono text-[10.5px] text-white/55">
              {endpoint ?? 'Not configured'}
            </p>
            <p className="mt-1.5 text-[10.5px] leading-[1.55] text-white/30">
              {endpoint && credentialIssue?.code === 'credential-not-configured'
                ? 'The endpoint is running, but DECART_API_KEY is missing. Add it to .env.local and restart pnpm dev.'
                : credentialIssue?.code === 'credential-unauthorized'
                  ? 'The endpoint reached Decart, but the server-side API key was rejected. Replace DECART_API_KEY and restart the service.'
                  : endpoint === '/api/realtime-token'
                    ? 'Local Vite endpoint. It reads DECART_API_KEY in Node and is available only while pnpm dev is running.'
                    : endpoint
                      ? 'Hosted endpoint. It must keep the Decart API key server-side and return a short-lived client token.'
                      : 'A packaged desktop build cannot mint tokens by itself. Configure a hosted token endpoint before shipping.'}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              Decart Lucy 2.5 Capabilities & Edit Types
            </p>
            <p className="mt-1 text-[11px] leading-[1.5] text-white/50">
              Transform any video in realtime at 720p 30fps. The prompt and reference image are passed in <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px] text-white/80">initialState</code> so the first frame is already transformed without flashing raw camera feed.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10.5px] leading-[1.45] text-white/60">
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
                <span className="font-medium text-white/85">Character swap:</span> Replace character with reference identity
              </div>
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
                <span className="font-medium text-white/85">Virtual try-on:</span> Swap clothes & accessories from reference
              </div>
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
                <span className="font-medium text-white/85">Background:</span> Cleanly alter room or environment
              </div>
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
                <span className="font-medium text-white/85">Add / Replace:</span> Insert new objects or swap existing items
              </div>
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
                <span className="font-medium text-white/85">Style & Visual FX:</span> 35mm film, lighting, embers & smoke
              </div>
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
                <span className="font-medium text-white/85">Remove:</span> Clean reconstruction with inpainting
              </div>
            </div>
          </div>

          <p className="text-[11px] leading-[1.6] text-white/32">
            Live sessions record actual transformation metadata, elapsed rendering seconds, and live credit
            deductions at 4 credits/sec. Every completed session is logged in Session History and Transactions.
          </p>
        </div>
      </Modal>
    </div>
  );
}
