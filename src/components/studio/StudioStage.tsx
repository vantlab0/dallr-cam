import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  Camera,
  FlipHorizontal2,
  Grid2x2,
  ImagePlus,
  LoaderCircle,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Tv,
  Video,
  WalletCards,
  WifiOff,
  X,
} from 'lucide-react';
import type { CameraDevice, LucySessionError, LucySessionStatus } from '@/types';
import { formatClock, formatCredits, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import {
  isPictureInPictureSupported,
  openVirtualCamProjector,
  toggleVirtualCamPip,
} from '@/services/camera/virtualCamera';

function StreamVideo({
  stream,
  mirrored = false,
  label,
  id,
  className,
  onFramesReady,
  onPipChange,
}: {
  stream: MediaStream;
  mirrored?: boolean;
  label: string;
  id?: string;
  className?: string;
  onFramesReady?: () => void;
  onPipChange?: (active: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onFramesReadyRef = useRef(onFramesReady);
  onFramesReadyRef.current = onFramesReady;
  const onPipChangeRef = useRef(onPipChange);
  onPipChangeRef.current = onPipChange;

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

    element.muted = true;
    element.defaultMuted = true;
    element.playsInline = true;
    element.autoplay = true;

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

    const handleEnterPip = () => onPipChangeRef.current?.(true);
    const handleLeavePip = () => onPipChangeRef.current?.(false);

    tryPlay();

    element.addEventListener('loadedmetadata', handleFrame);
    element.addEventListener('loadeddata', handleFrame);
    element.addEventListener('canplay', handleFrame);
    element.addEventListener('playing', handleFrame);
    element.addEventListener('timeupdate', handleFrame);
    element.addEventListener('enterpictureinpicture', handleEnterPip);
    element.addEventListener('leavepictureinpicture', handleLeavePip);
    stream.addEventListener('addtrack', tryPlay);

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.addEventListener('unmute', tryPlay);
    });

    const handleUserGesture = () => {
      if (element && (element.paused || element.readyState < 2)) {
        tryPlay();
      }
    };
    window.addEventListener('click', handleUserGesture, { once: true });
    window.addEventListener('keydown', handleUserGesture, { once: true });

    return () => {
      element.removeEventListener('loadedmetadata', handleFrame);
      element.removeEventListener('loadeddata', handleFrame);
      element.removeEventListener('canplay', handleFrame);
      element.removeEventListener('playing', handleFrame);
      element.removeEventListener('timeupdate', handleFrame);
      element.removeEventListener('enterpictureinpicture', handleEnterPip);
      element.removeEventListener('leavepictureinpicture', handleLeavePip);
      stream.removeEventListener('addtrack', tryPlay);
      videoTracks.forEach((track) => {
        track.removeEventListener('unmute', tryPlay);
      });
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
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
}: {
  status: LucySessionStatus;
  error: LucySessionError | null;
  isOnline: boolean;
}) {
  return (
    <div
      role="region"
      aria-label="Lucy standby stage"
      className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
    >
      {error ? (
        <div className="z-30 max-w-[420px] rounded-2xl border border-red-500/20 bg-[#160b0d]/95 p-5 shadow-2xl backdrop-blur-xl">
          <span className="mx-auto grid size-10 place-items-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-400">
            <X className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-[13px] font-semibold text-white/90">{error.title}</p>
          <p className="mt-1.5 text-[11px] leading-[1.5] text-white/60">{error.message}</p>
          {error.hint ? (
            <p className="mt-2.5 rounded-lg border border-white/[0.08] bg-black/40 p-2 text-[10px] leading-relaxed text-accent/90">
              💡 {error.hint}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <span className="grid size-12 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-accent/80 shadow-[0_0_0_8px_rgba(255,255,255,0.015)]">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-[14px] font-medium text-white/85">
            {status === 'stopped' ? 'Session ended' : 'Decart Lucy 2.5'}
          </p>
          <p className="mt-1 max-w-[360px] text-[11px] leading-[1.55] text-white/35">
            {!isOnline
              ? 'Reconnect to network before starting a session.'
              : 'Enter a prompt or reference image, then start streaming.'}
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
  onReconnect,
  prompt,
  onPromptChange,
  onApplyPrompt,
  promptError,
  onReferenceChange,
  updatePending,
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
  onReconnect: () => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onApplyPrompt: () => void;
  promptError?: string;
  onReferenceChange: (file: File | null) => void;
  updatePending: boolean;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [virtualCamActive, setVirtualCamActive] = useState(false);
  const [virtualCamModalOpen, setVirtualCamModalOpen] = useState(false);
  const [remoteFramesReady, setRemoteFramesReady] = useState(false);

  const cameraRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = status === 'requesting-camera' || status === 'connecting';
  const live = status === 'connected' || status === 'reconnecting';
  const hasLocal = Boolean(localStream);
  const cameraLocked = busy || live;

  useEffect(() => {
    if (!remoteStream) {
      setRemoteFramesReady(false);
      setVirtualCamActive(false);
    }
  }, [remoteStream]);

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

  const handleToggleVirtualCam = async () => {
    if (!remoteStream) {
      setVirtualCamModalOpen(true);
      return;
    }

    const videoEl = document.getElementById('video-output') as HTMLVideoElement | null;
    if (videoEl && isPictureInPictureSupported()) {
      const active = await toggleVirtualCamPip(videoEl);
      setVirtualCamActive(active);
      if (active) {
        setVirtualCamModalOpen(true);
      }
    } else {
      const win = openVirtualCamProjector(remoteStream);
      setVirtualCamActive(Boolean(win));
      setVirtualCamModalOpen(true);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onReferenceChange(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  return (
    <section
      className="relative size-full min-h-[100dvh] overflow-hidden bg-[#060709]"
      aria-label="Dallr Fullscreen Studio Stage"
    >
      {/* ── Layer 1: Background & Camera Stage ── */}
      <div className="absolute inset-0 overflow-hidden">
        {status === 'failed' ? (
          <StagePlaceholder
            status={status}
            error={error}
            isOnline={isOnline}
          />
        ) : referenceUrl && !remoteStream ? (
          <div className="absolute inset-0 overflow-hidden bg-[#07080b]">
            <img
              src={referenceUrl}
              alt={referenceFile?.name ?? 'Uploaded reference target'}
              className="size-full object-cover"
            />
            <div className="absolute left-4 top-20 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3.5 py-1 text-[11px] font-medium text-white/85 shadow-lg backdrop-blur-md">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              <span>Reference Target Ready</span>
              {referenceFile ? (
                <>
                  <span className="text-white/30">·</span>
                  <span className="max-w-[180px] truncate text-white/50">{referenceFile.name}</span>
                </>
              ) : null}
            </div>
          </div>
        ) : localStream && !remoteStream ? (
          <div className="absolute inset-0 overflow-hidden bg-[#07080b]">
            <StreamVideo stream={localStream} mirrored={mirror} label="Local camera preview" />
          </div>
        ) : !remoteStream ? (
          <StagePlaceholder
            status={status}
            error={error}
            isOnline={isOnline}
          />
        ) : null}

        {/* ── Layer 2: Decart Lucy 2.5 Realtime Output ── */}
        {remoteStream ? (
          <div className="absolute inset-0 z-10 overflow-hidden">
            <StreamVideo
              id="video-output"
              stream={remoteStream}
              label="Decart Lucy 2.5 Live Output"
              onFramesReady={() => setRemoteFramesReady(true)}
              onPipChange={setVirtualCamActive}
              className={cn(
                'size-full object-cover transition-opacity duration-300',
                remoteFramesReady ? 'opacity-100' : 'opacity-0',
              )}
            />
            {!remoteFramesReady ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
                <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/80 px-4 py-2 text-[12px] font-medium text-white shadow-2xl backdrop-blur-md">
                  <LoaderCircle className="size-4 animate-spin text-accent" />
                  <span>Receiving Lucy 2.5 video frames…</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Subtle cinematic gradient vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-15 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]"
          aria-hidden="true"
        />

        {busy ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-black/60 px-6 text-center backdrop-blur-sm">
            <LoaderCircle className="size-8 animate-spin text-accent" aria-hidden="true" />
            <p className="text-[13px] font-medium text-white/90">
              {status === 'requesting-camera'
                ? 'Requesting camera stream…'
                : 'Connecting to Decart Lucy 2.5…'}
            </p>
            <p className="max-w-[340px] text-[10.5px] leading-relaxed text-white/45">
              Opening 720p 30fps LiveKit WebRTC pipe with metered 4 credits/sec billing.
            </p>
          </div>
        ) : status === 'reconnecting' ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-black/55 px-6 text-center backdrop-blur-sm">
            <LoaderCircle className="size-8 animate-spin text-amber-400" aria-hidden="true" />
            <p className="text-[13px] font-medium text-white/90">Reconnecting to Decart…</p>
            <p className="text-[10px] text-white/40">Holding last rendered frame.</p>
          </div>
        ) : null}
      </div>

      {/* ── Top Floating HUD ── */}
      <div className="absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-2 sm:inset-x-5 sm:top-5">
        {/* Top Left: Session Action & Camera Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sessionAction.onClick}
            disabled={sessionAction.disabled}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12px] font-semibold shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
              sessionAction.className,
            )}
          >
            <SessionIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            <span>{sessionAction.label}</span>
            {live ? (
              <span className="ml-1 rounded-full bg-black/30 px-2 py-0.5 font-mono text-[10px] tabular-nums text-white/90">
                {formatClock(elapsedSec)}
              </span>
            ) : null}
          </button>

          {/* Webcam PiP Toggle */}
          <button
            type="button"
            onClick={onTogglePip}
            disabled={!hasLocal}
            className={cn(
              'grid size-9 place-items-center rounded-full border backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-30',
              showPip && hasLocal
                ? 'border-white/25 bg-black/70 text-white'
                : 'border-white/10 bg-black/45 text-white/60 hover:bg-black/60 hover:text-white',
            )}
            title={hasLocal ? 'Toggle webcam preview PiP' : 'Webcam thumbnail available during session'}
          >
            <Grid2x2 className="size-4" />
          </button>

          {/* Camera Settings Dropdown */}
          <div className="relative" ref={cameraRef}>
            <button
              type="button"
              onClick={() => setCameraOpen((cur) => !cur)}
              className="grid size-9 place-items-center rounded-full border border-white/10 bg-black/45 text-white/65 backdrop-blur-xl transition hover:border-white/20 hover:bg-black/65 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Camera source and settings"
              aria-label="Camera settings"
            >
              <Camera className="size-4" />
            </button>

            <AnimatePresence>
              {cameraOpen ? (
                <motion.div
                  role="dialog"
                  aria-label="Camera selection"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-full z-40 mt-2 w-[270px] rounded-2xl border border-white/10 bg-[#121318]/95 p-3.5 shadow-2xl backdrop-blur-2xl"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Camera Source
                    </p>
                    <button
                      type="button"
                      onClick={camera.refresh}
                      className="grid size-6 place-items-center rounded-md text-white/40 hover:bg-white/[0.08] hover:text-white"
                      title="Refresh cameras"
                    >
                      <RefreshCw className="size-3" />
                    </button>
                  </div>

                  <select
                    id="studio-camera-select"
                    value={camera.selectedId ?? ''}
                    onChange={(e) => camera.selectDevice(e.target.value)}
                    disabled={cameraLocked}
                    className="mt-2 h-8 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] text-white outline-none focus:border-accent disabled:opacity-40"
                  >
                    {camera.devices.length === 0 ? <option value="">Default Camera</option> : null}
                    {camera.devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={mirror}
                    disabled={cameraLocked}
                    onClick={onToggleMirror}
                    className="mt-2.5 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[11px] text-white/60 hover:bg-white/[0.05]"
                  >
                    <span className="flex items-center gap-1.5">
                      <FlipHorizontal2 className="size-3.5" />
                      Mirror preview
                    </span>
                    <span
                      className={cn(
                        'h-4 w-7 rounded-full p-0.5 transition-colors',
                        mirror ? 'bg-accent' : 'bg-white/15',
                      )}
                    >
                      <span
                        className={cn(
                          'block size-3 rounded-full bg-white transition-transform',
                          mirror ? 'translate-x-3' : 'translate-x-0',
                        )}
                      />
                    </span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Top Right: Status, Wallet, Brand */}
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <button
              type="button"
              onClick={onReconnect}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 text-[10.5px] font-medium text-red-400 backdrop-blur-xl"
            >
              <WifiOff className="size-3" />
              Offline
            </button>
          ) : null}

          {/* Virtual Camera Live Badge */}
          {virtualCamActive ? (
            <button
              type="button"
              onClick={() => setVirtualCamModalOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 text-[10.5px] font-medium text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-xl"
              title="Virtual camera active · click for setup instructions"
            >
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Video className="size-3" />
              <span>Broadcast Live</span>
            </button>
          ) : null}

          {/* Credits Badge */}
          <Link
            to="/wallet"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 text-[10.5px] font-medium text-white/80 backdrop-blur-xl hover:border-white/20 hover:text-white"
            title={`Wallet: ${formatCredits(balanceCredits)} cr (~${formatDuration(estimatedRemainingSec)} remaining at 4 cr/sec)`}
          >
            <WalletCards className="size-3 text-accent" />
            <span>{formatCredits(balanceCredits)} cr</span>
          </Link>

          {/* Lucy 2.5 Resolution Pill */}
          <span className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 text-[10.5px] font-medium text-white/70 backdrop-blur-xl">
            <Sparkles className="size-3 text-accent" />
            <span>Lucy 2.5 · 720p</span>
          </span>
        </div>
      </div>

      {/* ── Corner Local Webcam PiP Preview ── */}
      {showPip && localStream && (remoteStream || referenceUrl) ? (
        <div
          className={cn(
            'absolute bottom-24 right-4 z-25 h-[95px] w-[130px] overflow-hidden rounded-xl border bg-black/75 shadow-2xl backdrop-blur-md sm:bottom-28 sm:right-6 sm:h-[115px] sm:w-[155px]',
            live ? 'border-[#e5484d]/60 ring-1 ring-[#e5484d]/30' : 'border-white/20',
          )}
        >
          <StreamVideo stream={localStream} mirrored={mirror} label="Local camera preview" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),transparent_35%,rgba(0,0,0,0.4))]" />
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-white/75 backdrop-blur-sm">
            <Camera className="size-2.5" />
            Webcam
          </span>
        </div>
      ) : null}

      {/* ── Dynamic Floating Bottom Studio Control Bar ── */}
      <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/[0.14] bg-[#0c0d12]/85 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all sm:bottom-7 max-w-[calc(100vw-24px)]">
        {/* 1. Dynamic Upload Image Button */}
        <div className="relative shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="reference-upload-input"
          />

          {referenceUrl ? (
            <div className="group relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative size-10 overflow-hidden rounded-full border-2 border-accent shadow-md transition hover:scale-105 hover:ring-2 hover:ring-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title={`Reference Target: ${referenceFile?.name ?? 'Image'}. Click to replace.`}
                aria-label="Replace reference target image"
              >
                <img
                  src={referenceUrl}
                  alt="Reference target preview"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <RefreshCw className="size-3.5 text-white" />
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReferenceChange(null);
                }}
                className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border border-white/20 bg-black/90 text-[8px] font-bold text-white/80 shadow transition hover:bg-red-500 hover:text-white"
                title="Remove reference image"
                aria-label="Remove reference image"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-white/30 hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Upload reference target image (Character swap, clothing, style)"
              aria-label="Upload reference target image"
            >
              <ImagePlus className="size-4" />
            </button>
          )}
        </div>

        {/* 2. Long Prompt Input Text Bar */}
        <div className="relative flex items-center">
          <input
            id="transform-prompt"
            type="text"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onApplyPrompt();
              }
            }}
            placeholder="Type prompt to transform camera... (e.g. 'cinematic 35mm film, neon cyberpunk')"
            className="h-10 w-[220px] rounded-full border border-white/[0.07] bg-white/[0.04] px-4 text-[12px] text-white placeholder-white/30 outline-none transition focus:border-accent/50 focus:bg-white/[0.07] sm:w-[360px] md:w-[480px] lg:w-[580px] xl:w-[660px]"
          />

          {prompt.trim() ? (
            <button
              type="button"
              onClick={onApplyPrompt}
              disabled={updatePending}
              className="absolute right-1.5 grid size-7 place-items-center rounded-full bg-accent text-accent-contrast shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Apply prompt (Enter)"
            >
              {updatePending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <ArrowUp className="size-3.5 stroke-[2.5]" />
              )}
            </button>
          ) : null}
        </div>

        {/* 3. Virtual Camera Broadcast Toggle Button */}
        <button
          type="button"
          onClick={handleToggleVirtualCam}
          className={cn(
            'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[11px] font-medium transition backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            virtualCamActive
              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.3)]'
              : 'border-white/10 bg-white/[0.05] text-white/70 hover:border-white/25 hover:bg-white/[0.09] hover:text-white',
          )}
          title="Broadcast Decart output to virtual camera for WhatsApp, Zoom, OBS"
        >
          <span
            className={cn(
              'size-2 rounded-full transition-all',
              virtualCamActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/30',
            )}
          />
          <Video className="size-3.5" />
          <span className="hidden sm:inline">
            {virtualCamActive ? 'Virtual Cam ON' : 'Virtual Cam'}
          </span>
        </button>
      </div>

      {/* Prompt Error Floating Notice */}
      {promptError ? (
        <div className="absolute bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full border border-red-500/30 bg-black/90 px-3.5 py-1 text-[11px] text-red-300 shadow-xl backdrop-blur-xl">
          {promptError}
        </div>
      ) : null}

      {/* ── Virtual Camera Setup & External Apps Guide Modal ── */}
      <Modal
        open={virtualCamModalOpen}
        onClose={() => setVirtualCamModalOpen(false)}
        title="Broadcast Decart Output to External Apps"
        description="Stream the transformed Lucy 2.5 video to WhatsApp, Zoom, OBS Studio, and Meet."
        size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              icon={Tv}
              onClick={() => {
                if (remoteStream) openVirtualCamProjector(remoteStream);
              }}
            >
              Open Clean Projector Window
            </Button>
            <Button variant="secondary" onClick={() => setVirtualCamModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Active status banner */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Video className="size-4" />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-emerald-300">
                  {remoteStream ? 'Decart 720p 30fps Output Ready' : 'Decart Session Standby'}
                </p>
                <p className="text-[10px] text-emerald-400/75">
                  {remoteStream
                    ? 'Transformed video is actively available for capture.'
                    : 'Click "Start session" to activate real-time AI video generation.'}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[9.5px] font-medium text-emerald-300">
              {virtualCamActive ? 'Active' : 'Standby'}
            </span>
          </div>

          {/* Quick instructions for WhatsApp, Zoom, OBS */}
          <div className="space-y-2.5 text-[11.5px]">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="font-semibold text-white/90">💬 WhatsApp (Desktop or Web)</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-white/55">
                <li>Start a video call in WhatsApp.</li>
                <li>
                  Click the <strong>Share screen / window</strong> button.
                </li>
                <li>
                  Select <strong>Dallr Virtual Camera</strong> (or the Picture-in-Picture window).
                </li>
                <li>WhatsApp broadcasts your live transformed Decart video stream!</li>
              </ol>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="font-semibold text-white/90">📹 Zoom, Google Meet & Teams</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-white/55">
                <li>
                  In your meeting, click <strong>Share Screen → Window</strong> → choose{' '}
                  <strong>Dallr Virtual Camera</strong>.
                </li>
                <li>
                  <em>Or</em> route via OBS Virtual Camera (below) to have Dallr appear directly as a
                  physical webcam selection!
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="font-semibold text-white/90">🎬 OBS Virtual Camera (Native Webcam in ANY App)</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-white/55">
                <li>Open OBS Studio and add a <strong>Window Capture</strong> source.</li>
                <li>Select <strong>Dallr Studio</strong> or the Clean Projector window.</li>
                <li>
                  Click <strong>Start Virtual Camera</strong> in OBS.
                </li>
                <li>Now WhatsApp, Zoom, Meet, and Discord see Decart as your real camera device!</li>
              </ol>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}
