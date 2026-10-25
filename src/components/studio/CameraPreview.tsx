import { useEffect, useRef } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import type {
  CameraDevice,
  LucySessionError,
  LucySessionStatus,
} from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Form';
import { cn } from '@/lib/utils';

function isCameraError(error: LucySessionError | null): boolean {
  return Boolean(error?.code.startsWith('camera-'));
}

export function CameraPreview({
  stream,
  devices,
  selectedDeviceId,
  onSelectDevice,
  onRefreshDevices,
  deviceError,
  status,
  error,
  mirror,
  onRetry,
}: {
  stream: MediaStream | null;
  devices: CameraDevice[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onRefreshDevices: () => void;
  deviceError: string | null;
  status: LucySessionStatus;
  error: LucySessionError | null;
  mirror: boolean;
  onRetry: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasStream = stream !== null;
  const cameraError = isCameraError(error) ? error : null;
  const busy =
    status === 'requesting-camera' ||
    status === 'connecting' ||
    status === 'connected' ||
    status === 'reconnecting';

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !stream) return;

    element.srcObject = stream;
    const playPromise = element.play();
    if (playPromise) {
      void playPromise.catch(() => {
        // A muted autoplay stream is normally allowed; the frame stays blank if not.
      });
    }

    return () => {
      element.srcObject = null;
    };
  }, [stream]);

  const statusBadge = hasStream
    ? status === 'connected'
      ? { tone: 'positive' as const, label: 'Live source', dot: true }
      : { tone: 'accent' as const, label: 'Source ready', dot: true }
    : status === 'requesting-camera'
      ? { tone: 'accent' as const, label: 'Requesting', dot: true }
      : cameraError
        ? { tone: 'negative' as const, label: 'Camera error', dot: true }
        : { tone: 'neutral' as const, label: 'Standby', dot: false };

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-black/25">
      <div className="flex h-9 items-center justify-between gap-2 border-b border-white/[0.055] px-3">
        <div className="flex items-center gap-2">
          <Camera className="size-3.5 text-white/35" aria-hidden="true" />
          <span className="text-[11px] font-medium text-white/65">Source camera</span>
        </div>
        <Badge tone={statusBadge.tone} dot={statusBadge.dot} className="h-5 px-1.5 text-[9px]">
          {statusBadge.label}
        </Badge>
      </div>

      <div className="relative aspect-video w-full overflow-hidden bg-[#08090c]">
        {hasStream ? (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              aria-label="Local camera preview"
              className={cn('size-full object-cover', mirror && 'scale-x-[-1]')}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.16),transparent_22%,transparent_72%,rgba(0,0,0,0.28))]" />
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2 py-0.5 backdrop-blur-sm">
              <span className="size-1.5 animate-soft-pulse rounded-full bg-positive" aria-hidden="true" />
              <span className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/65">
                Local preview
              </span>
            </div>
            <div className="absolute bottom-2 right-2.5 text-[8px] font-medium uppercase tracking-[0.14em] text-white/30">
              Not recorded
            </div>
          </>
        ) : status === 'requesting-camera' ? (
          <div className="flex size-full flex-col items-center justify-center gap-3">
            <span className="size-8 animate-spin rounded-full border border-white/10 border-t-accent/80" />
            <p className="text-[11px] text-white/35">Waiting for camera permission…</p>
          </div>
        ) : cameraError ? (
          <div className="flex size-full flex-col items-center justify-center px-6 text-center">
            <span className="grid size-9 place-items-center rounded-xl border border-negative/20 bg-negative/[0.07] text-negative">
              <CameraOff className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-2.5 text-[11.5px] font-medium text-white/75">{cameraError.title}</p>
            <p className="mt-1 max-w-[300px] text-[10.5px] leading-[1.5] text-white/35">
              {cameraError.message}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 h-7 text-[10.5px]"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="relative flex size-full flex-col items-center justify-center px-6 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgb(var(--accent)/0.055),transparent_60%)]" />
            <span className="grid size-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/35">
              <Camera className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-2.5 text-[11.5px] font-medium text-white/70">
              Camera starts with your session
            </p>
            <p className="mt-1 max-w-[290px] text-[10.5px] leading-[1.5] text-white/32">
              Dallr requests camera access only when you press Start. While connected, frames are
              sent to Decart for transformation and are not recorded.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.055] p-2">
        <div className="flex items-center gap-1.5">
          <Select
            aria-label="Select camera"
            value={selectedDeviceId ?? ''}
            onChange={(event) => onSelectDevice(event.target.value)}
            disabled={busy}
            className="h-7 flex-1 text-[10.5px]"
          >
            {devices.length === 0 ? <option value="">Default camera</option> : null}
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
            {selectedDeviceId && !devices.some((device) => device.deviceId === selectedDeviceId) ? (
              <option value={selectedDeviceId}>Current camera</option>
            ) : null}
          </Select>
          <Button
            size="icon-sm"
            variant="secondary"
            className="size-7 rounded-md"
            title="Refresh camera list"
            aria-label="Refresh camera list"
            onClick={onRefreshDevices}
            icon={RefreshCw}
          />
        </div>
        <p className="mt-1.5 px-0.5 text-[9px] leading-4 text-white/24">
          {busy
            ? 'Stop the session to change cameras.'
            : deviceError ?? 'Device labels appear after the first camera grant.'}
        </p>
      </div>
    </section>
  );
}
