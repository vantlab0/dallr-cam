import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  FlipHorizontal2,
  Grid2x2,
  LoaderCircle,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Square,
  Terminal,
  TriangleAlert,
  WalletCards,
  WifiOff,
} from 'lucide-react';
import type { CameraDevice, LucySessionError, LucySessionStatus } from '@/types';
import { formatClock, formatCredits, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

function StreamVideo({
  stream,
  mirrored = false,
  label,
  id,
  className,
  onFramesReady,
}: {
  stream: MediaStream;
  mirrored?: boolean;
  label: string;
  id?: string;
  className?: string;
  onFramesReady?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onFramesReadyRef = useRef(onFramesReady);
  onFramesReadyRef.current = onFramesReady;

  // Clear srcObject only when component completely unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    // React does not reliably set the HTMLMediaElement.muted DOM property from JSX,
    // which causes browsers to reject WebRTC autoplay. Explicitly set it here:
    element.muted = true;
    element.defaultMuted = true;
    element.playsInline = true;
    element.autoplay = true;

    // Only assign if different to avoid aborting in-flight decode/play
    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }

    const tryPlay = () => {
      if (!element) return;
      element.muted = true;
      element.defaultMuted = true;
      if (element.paused) {
        element.play().catch(() => {});
      }
    };

    const handleFrame = () => {
      if (element && element.videoWidth > 0 && element.videoHeight > 0) {
        onFramesReadyRef.current?.();
      }
      tryPlay();
    };

    tryPlay();

    element.addEventListener('loadedmetadata', handleFrame);
    element.addEventListener('loadeddata', handleFrame);
    element.addEventListener('canplay', handleFrame);
    element.addEventListener('playing', handleFrame);
    element.addEventListener('timeupdate', handleFrame);
    stream.addEventListener('addtrack', tryPlay);

    // Remote WebRTC tracks begin in muted state until the first RTP packet arrives
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.addEventListener('unmute', tryPlay);
    });

    // Auto-resume if user clicks anywhere on stage
    const handleUserGesture = () => {
      if (element && (element.paused || element.readyState < 2)) {
        tryPlay();
      }
    };
    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
      element.removeEventListener('loadedmetadata', handleFrame);
      element.removeEventListener('loadeddata', handleFrame);
      element.removeEventListener('canplay', handleFrame);
      element.removeEventListener('playing', handleFrame);
      element.removeEventListener('timeupdate', handleFrame);
      stream.removeEventListener('addtrack', tryPlay);
      videoTracks.forEach((track) => {
        track.removeEventListener('unmute', tryPlay);
      });
      // Do not clear srcObject here; element stays mounted across stream re-renders
    };
  }, [stream]);

  return (
    <video
      id={id}
      ref={videoRef}
      muted
      playsInline
      autoPlay
      aria-label={label}
      className={cn('size-full object-cover', mirrored && 'scale-x-[-1]', className)}
    />
  );
}

function StagePlaceholder({
  status,
  error,
  isOnline,
  onOpenNotes,
}: {
  status: LucySessionStatus;
  error: LucySessionError | null;
  isOnline: boolean;
  onOpenNotes: () => void;
}) {
  const failedError = status === 'failed' ? error : null;

  return (
    <div className="relative flex size-full flex-col items-center justify-center px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgb(var(--accent)/0.12),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(98,171,181,0.08),transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]"
        aria-hidden="true"
      />

      {failedError ? (
        <>
          <span className="grid size-11 place-items-center rounded-2xl border border-negative/20 bg-negative/[0.07] text-negative">
            <TriangleAlert className="size-[18px]" aria-hidden="true" />
          </span>
          <p className="mt-3 text-[13px] font-medium text-white/80">{failedError.title}</p>
          <p className="mt-1.5 max-w-[380px] text-[11px] leading-[1.55] text-white/40">
            {failedError.message}
          </p>
          {failedError.hint ? (
            <p className="mt-1.5 max-w-[380px] text-[10px] leading-[1.5] text-white/25">
              {failedError.hint}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {failedError.code.startsWith('credential-') ? (
              <button
                type="button"
                onClick={onOpenNotes}
                className="inline-flex h-7 items-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 text-[10.5px] font-medium text-white/65 transition hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Open setup
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenNotes}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10.5px] font-medium text-white/32 transition hover:bg-white/[0.05] hover:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Terminal className="size-3" aria-hidden="true" />
              Integration notes
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="grid size-11 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-accent/80 shadow-[0_0_0_6px_rgba(255,255,255,0.015)]">
            <Sparkles className="size-[18px]" aria-hidden="true" />
          </span>
          <p className="mt-3 text-[13px] font-medium text-white/80">
            {status === 'stopped' ? 'Session ended' : 'Lucy 2.5 is ready'}
          </p>
          <p className="mt-1.5 max-w-[380px] text-[11px] leading-[1.55] text-white/35">
            {!isOnline
              ? 'Reconnect before starting a session. The camera stays off until Lucy is available.'
              : status === 'stopped'
                ? 'Start a new session to reconnect the camera and Lucy 2.5.'
                : 'Start a session to transform your camera in real time. Camera access begins only after you press Start.'}
          </p>
          <p className="mt-3 text-[9px] uppercase tracking-[0.14em] text-white/20">
            1280 × 720 · 30 fps · WebRTC
          </p>
        </>
      )}
    </div>
  );
}

export function StudioStage({
  status,
  remoteStream,
  localStream,
  referenceFile,
  referenceUrl,
  error,
  mirror,
  isOnline,
  elapsedSec,
  balanceCredits,
  estimatedRemainingSec,
  camera,
  showPip,
  onTogglePip,
  onToggleMirror,
  onStart,
  onStop,
  onRetry,
  onOpenNotes,
  onReconnect,
}: {
  status: LucySessionStatus;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  referenceFile?: File | null;
  referenceUrl?: string | null;
  error: LucySessionError | null;
  mirror: boolean;
  isOnline: boolean;
  elapsedSec: number;
  balanceCredits: number;
  estimatedRemainingSec: number;
  camera: {
    devices: CameraDevice[];
    selectedId: string | null;
    selectDevice: (deviceId: string) => void;
    refresh: () => void;
    error: string | null;
  };
  showPip: boolean;
  onTogglePip: () => void;
  onToggleMirror: () => void;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
  onOpenNotes: () => void;
  onReconnect: () => void;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef<HTMLDivElement>(null);

  const busy = status === 'requesting-camera' || status === 'connecting';
  const live = status === 'connected' || status === 'reconnecting';
  const hasLocal = Boolean(localStream);
  const cameraLocked = busy || live;

  useEffect(() => {
    if (!cameraOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (cameraRef.current && !cameraRef.current.contains(event.target as Node)) {
        setCameraOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCameraOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [cameraOpen]);

  const sessionAction =
    busy || live
      ? {
          label: busy ? 'Cancel' : 'Stop session',
          icon: Square,
          onClick: onStop,
          className: 'bg-[#e5484d] text-white hover:bg-[#d93d42]',
          disabled: false,
        }
      : status === 'failed'
        ? {
            label: 'Retry session',
            icon: RefreshCw,
            onClick: onRetry,
            className: 'bg-accent text-accent-contrast hover:bg-accent-strong',
            disabled: !isOnline,
          }
        : {
            label: 'Start session',
            icon: Play,
            onClick: onStart,
            className: 'bg-accent text-accent-contrast hover:bg-accent-strong',
            disabled: !isOnline,
          };

  const SessionIcon = sessionAction.icon;

  const [remoteFramesReady, setRemoteFramesReady] = useState(false);

  useEffect(() => {
    if (!remoteStream) {
      setRemoteFramesReady(false);
    }
  }, [remoteStream]);

  return (
    <section
      className="relative aspect-video h-full min-h-[220px] w-full rounded-2xl border border-white/[0.08] bg-[#07080b] shadow-panel lg:aspect-auto"
      aria-label="Lucy output stage"
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {/* Layer 1: Base preview (reference image or local camera feed) */}
        {status === 'failed' ? (
          <StagePlaceholder
            status={status}
            error={error}
            isOnline={isOnline}
            onOpenNotes={onOpenNotes}
          />
        ) : referenceUrl ? (
          <div className="absolute inset-0 overflow-hidden bg-[#07080b]">
            <img
              src={referenceUrl}
              alt={referenceFile?.name ?? 'Uploaded reference target'}
              className="size-full object-cover"
            />
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3.5 py-1 text-[11px] font-medium text-white/85 shadow-lg backdrop-blur-md">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              <span>Reference Target</span>
              <span className="text-white/30">·</span>
              <span className="text-white/60">Decart Lucy 2.5</span>
              {referenceFile ? (
                <>
                  <span className="text-white/30">·</span>
                  <span className="max-w-[180px] truncate text-white/45">{referenceFile.name}</span>
                </>
              ) : null}
            </div>
          </div>
        ) : localStream ? (
          <div className="absolute inset-0 overflow-hidden bg-[#07080b]">
            <StreamVideo stream={localStream} mirrored={mirror} label="Local camera preview" />
          </div>
        ) : !remoteStream ? (
          <StagePlaceholder
            status={status}
            error={error}
            isOnline={isOnline}
            onOpenNotes={onOpenNotes}
          />
        ) : null}

        {/* Layer 2: Transformed Decart Lucy 2.5 Realtime Output */}
        {remoteStream ? (
          <div className="absolute inset-0 z-10 overflow-hidden">
            <StreamVideo
              id="video-output"
              stream={remoteStream}
              label="Transformed Decart Lucy output"
              onFramesReady={() => setRemoteFramesReady(true)}
              className={cn(
                'size-full object-cover transition-opacity duration-300',
                remoteFramesReady ? 'opacity-100' : 'opacity-0',
              )}
            />
            {!remoteFramesReady ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
                <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/75 px-4 py-2 text-[11.5px] font-medium text-white/90 shadow-2xl backdrop-blur-md">
                  <LoaderCircle className="size-4 animate-spin text-accent" />
                  <span>Streaming Lucy 2.5 frames…</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.46),transparent_18%,transparent_68%,rgba(0,0,0,0.58))]"
          aria-hidden="true"
        />

        {busy ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-black/45 px-6 text-center backdrop-blur-[2px]">
            <LoaderCircle className="size-7 animate-spin text-accent/80" aria-hidden="true" />
            <p className="text-[12px] font-medium text-white/80">
              {status === 'requesting-camera'
                ? 'Waiting for camera permission…'
                : 'Connecting to Lucy 2.5…'}
            </p>
            <p className="max-w-[340px] text-[10px] leading-4 text-white/40">
              {status === 'requesting-camera'
                ? 'Allow camera access to begin the session.'
                : 'Requesting a short-lived token, then opening the WebRTC stream.'}
            </p>
          </div>
        ) : status === 'reconnecting' ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-black/45 px-6 text-center backdrop-blur-[2px]">
            <LoaderCircle className="size-7 animate-spin text-warning/90" aria-hidden="true" />
            <p className="text-[12px] font-medium text-white/80">Reconnecting to Lucy…</p>
            <p className="text-[10px] text-white/40">The last frame stays visible meanwhile.</p>
          </div>
        ) : null}
      </div>

      <div className="absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={sessionAction.onClick}
            disabled={sessionAction.disabled}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[11.5px] font-medium shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 disabled:cursor-not-allowed disabled:opacity-40',
              sessionAction.className,
            )}
          >
            <SessionIcon className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
            {sessionAction.label}
          </button>

          <button
            type="button"
            onClick={onTogglePip}
            disabled={!hasLocal}
            className={cn(
              'grid size-9 place-items-center rounded-xl border backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-35',
              showPip && hasLocal
                ? 'border-white/20 bg-black/60 text-white/85'
                : 'border-white/10 bg-black/40 text-white/60 hover:border-white/20 hover:bg-black/60 hover:text-white',
            )}
            aria-pressed={showPip && hasLocal}
            aria-label="Toggle camera preview"
            title={hasLocal ? 'Toggle camera preview' : 'Camera preview appears when a session starts'}
          >
            <Grid2x2 className="size-4" aria-hidden="true" />
          </button>

          <div className="relative" ref={cameraRef}>
            <button
              type="button"
              onClick={() => setCameraOpen((current) => !current)}
              className="grid size-9 place-items-center rounded-xl border border-white/10 bg-black/40 text-white/60 backdrop-blur-md transition hover:border-white/20 hover:bg-black/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-expanded={cameraOpen}
              aria-haspopup="dialog"
              aria-label="Camera settings"
              title="Camera settings"
            >
              <Camera className="size-4" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {cameraOpen ? (
                <motion.div
                  role="dialog"
                  aria-label="Camera settings"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="absolute left-0 top-full z-30 mt-2 w-[280px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#141519]/95 p-3 shadow-lift backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
                      Camera
                    </p>
                    <button
                      type="button"
                      onClick={camera.refresh}
                      className="grid size-6 place-items-center rounded-md text-white/30 transition hover:bg-white/[0.06] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      aria-label="Refresh camera list"
                      title="Refresh camera list"
                    >
                      <RefreshCw className="size-3.5" />
                    </button>
                  </div>

                  <label
                    htmlFor="studio-camera"
                    className="mt-2 block text-[9.5px] font-medium text-white/35"
                  >
                    Source
                  </label>
                  <select
                    id="studio-camera"
                    value={camera.selectedId ?? ''}
                    onChange={(event) => camera.selectDevice(event.target.value)}
                    disabled={cameraLocked}
                    className="mt-1 h-8 w-full rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 text-[10.5px] text-white/70 outline-none transition focus:border-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {camera.devices.length === 0 ? <option value="">Default camera</option> : null}
                    {camera.devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                    {camera.selectedId &&
                    !camera.devices.some((device) => device.deviceId === camera.selectedId) ? (
                      <option value={camera.selectedId}>Current camera</option>
                    ) : null}
                  </select>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={mirror}
                    disabled={cameraLocked}
                    onClick={onToggleMirror}
                    className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[10.5px] text-white/50 transition hover:bg-white/[0.045] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FlipHorizontal2 className="size-3.5" aria-hidden="true" />
                      Mirror preview
                    </span>
                    <span
                      className={cn(
                        'relative h-4 w-7 shrink-0 rounded-full transition-colors',
                        mirror ? 'bg-accent/80' : 'bg-white/10',
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 size-3 rounded-full bg-white transition-all',
                          mirror ? 'left-3.5' : 'left-0.5',
                        )}
                      />
                    </span>
                  </button>

                  <p className="mt-2 text-[9px] leading-4 text-white/26">
                    {camera.error ??
                      (cameraLocked
                        ? 'Stop the session to change camera settings.'
                        : 'Device labels appear after the first camera grant.')}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {!isOnline ? (
            <button
              type="button"
              onClick={onReconnect}
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-negative/25 bg-negative/[0.1] px-2.5 text-[10px] font-medium text-negative backdrop-blur-md transition hover:bg-negative/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-negative/40"
              title="Reconnect workspace"
            >
              <WifiOff className="size-3" aria-hidden="true" />
              Offline · Reconnect
            </button>
          ) : null}

          <Link
            to="/wallet"
            className="hidden h-7 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 text-[10px] font-medium text-white/70 backdrop-blur-md transition hover:border-white/20 hover:bg-black/60 hover:text-white sm:inline-flex"
            title={`Wallet · ${formatCredits(balanceCredits)} credits (~${formatDuration(estimatedRemainingSec)} at 4 cr/sec)`}
          >
            <WalletCards className="size-3 text-accent/80" aria-hidden="true" />
            {formatCredits(balanceCredits)} cr
          </Link>

          <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 text-[10px] font-medium text-white/75 backdrop-blur-md">
            <Sparkles className="size-3 text-accent/80" aria-hidden="true" />
            AI Generated
          </span>

          <span
            className="hidden shrink-0 items-center gap-1.5 text-white/85 sm:inline-flex"
            title="Powered by Decart Lucy 2.5"
          >
            <span className="text-[17px] font-medium tracking-[-0.045em]">decart</span>
            <span className="grid size-4 place-items-center rounded-full border border-white/20">
              <Plus className="size-2.5" aria-hidden="true" />
            </span>
          </span>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-20 sm:bottom-4 sm:left-4">
        <span className="inline-flex h-7 items-center gap-2 rounded-full border border-white/10 bg-black/45 px-2.5 text-[9.5px] font-medium text-white/65 backdrop-blur-md">
          <span
            className={cn(
              'size-1.5 rounded-full',
              live ? 'animate-soft-pulse bg-[#e5484d]' : 'bg-white/25',
            )}
            aria-hidden="true"
          />
          {live
            ? (remoteStream ? `Decart Lucy 2.5 Live · ${formatClock(elapsedSec)}` : `Connecting · ${formatClock(elapsedSec)}`)
            : (referenceUrl ? 'Reference Target Ready' : 'Preview')}
          <span className="text-white/18">·</span>
          720p 30fps
        </span>
      </div>

      {showPip && localStream && (remoteStream || referenceUrl) ? (
        <div
          className={cn(
            'absolute bottom-3 right-3 z-20 h-[92px] w-[124px] overflow-hidden rounded-xl border bg-black/60 shadow-[0_14px_36px_-14px_rgba(0,0,0,0.9)] sm:bottom-4 sm:right-4 sm:h-[110px] sm:w-[148px]',
            live ? 'border-[#e5484d]/60 ring-1 ring-[#e5484d]/25' : 'border-white/20',
          )}
        >
          <StreamVideo stream={localStream} mirrored={mirror} label="Local webcam preview" />
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),transparent_35%,rgba(0,0,0,0.4))]"
            aria-hidden="true"
          />
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/70 backdrop-blur-sm">
            <Camera className="size-2.5" aria-hidden="true" />
            Webcam
          </span>
        </div>
      ) : null}
    </section>
  );
}
