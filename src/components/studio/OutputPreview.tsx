import { useEffect, useRef } from 'react';
import {
  ArrowUpRight,
  Image as ImageIcon,
  Sparkles,
  Terminal,
  TriangleAlert,
} from 'lucide-react';
import type { LucySessionError, LucySessionStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const modelSpec = '1280 × 720 · 30 fps';

export function OutputPreview({
  status,
  remoteStream,
  hasPrompt,
  referenceName,
  error,
  onOpenNotes,
}: {
  status: LucySessionStatus;
  remoteStream: MediaStream | null;
  hasPrompt: boolean;
  referenceName: string | null;
  error: LucySessionError | null;
  onOpenNotes: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const connecting = status === 'requesting-camera' || status === 'connecting';
  const reconnecting = status === 'reconnecting';
  const failed = status === 'failed';
  const live = status === 'connected' && remoteStream !== null;

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !remoteStream) return;

    element.srcObject = remoteStream;
    const playPromise = element.play();
    if (playPromise) {
      void playPromise.catch(() => {
        // Muted autoplay is normally allowed; the last frame remains if it is not.
      });
    }

    return () => {
      element.srcObject = null;
    };
  }, [remoteStream]);

  const badge = live
    ? { tone: 'positive' as const, label: 'Live', dot: true }
    : reconnecting
      ? { tone: 'warning' as const, label: 'Reconnecting', dot: true }
      : connecting
        ? { tone: 'accent' as const, label: 'Connecting', dot: true }
        : failed
          ? { tone: 'negative' as const, label: 'Error', dot: true }
          : status === 'stopped'
            ? { tone: 'neutral' as const, label: 'Stopped', dot: false }
            : { tone: 'neutral' as const, label: 'Ready', dot: false };

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-black/25">
      <div className="flex h-9 items-center justify-between gap-2 border-b border-white/[0.055] px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-accent/70" aria-hidden="true" />
          <span className="text-[11px] font-medium text-white/65">Lucy output</span>
          <span className="hidden text-[9px] uppercase tracking-[0.12em] text-white/22 sm:inline">
            {modelSpec}
          </span>
        </div>
        <Badge tone={badge.tone} dot={badge.dot} className="h-5 px-1.5 text-[9px]">
          {badge.label}
        </Badge>
      </div>

      <div className="relative aspect-video w-full overflow-hidden bg-[#07080b]">
        {remoteStream ? (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              aria-label="Transformed Lucy output"
              className="size-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),transparent_18%,transparent_78%,rgba(0,0,0,0.32))]" />
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2 py-0.5 backdrop-blur-sm">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  live ? 'animate-soft-pulse bg-positive' : 'bg-warning',
                )}
                aria-hidden="true"
              />
              <span className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/70">
                {live ? 'Transformed live' : 'Last frame'}
              </span>
            </div>
            <div className="absolute bottom-2 left-2.5 text-[8px] font-medium uppercase tracking-[0.14em] text-white/30">
              Decart · not recorded
            </div>
            {reconnecting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-black/45 backdrop-blur-[2px]">
                <span className="size-7 animate-spin rounded-full border border-white/15 border-t-warning/90" />
                <p className="text-[11px] font-medium text-white/75">Reconnecting to Lucy…</p>
                <p className="text-[10px] text-white/40">The last frame stays visible meanwhile.</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="relative flex size-full flex-col items-center justify-center px-6 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgb(var(--accent)/0.1),transparent_54%),radial-gradient(circle_at_74%_76%,rgba(98,171,181,0.07),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />

            {connecting ? (
              <>
                <span className="size-9 animate-spin rounded-full border border-white/10 border-t-accent/80" />
                <p className="mt-3 text-[12px] font-medium text-white/75">
                  Connecting to Lucy 2.5…
                </p>
                <p className="mt-1.5 max-w-[330px] text-[10.5px] leading-[1.55] text-white/35">
                  Requesting a short-lived token, then establishing the WebRTC stream.
                </p>
              </>
            ) : failed && error ? (
              <>
                <span className="grid size-10 place-items-center rounded-xl border border-negative/20 bg-negative/[0.07] text-negative">
                  <TriangleAlert className="size-[17px]" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[12px] font-medium text-white/78">{error.title}</p>
                <p className="mt-1.5 max-w-[350px] text-[10.5px] leading-[1.55] text-white/38">
                  {error.message}
                </p>
                {error.hint ? (
                  <p className="mt-1.5 max-w-[350px] text-[9.5px] leading-[1.5] text-white/26">
                    {error.hint}
                  </p>
                ) : null}
                {error.code.startsWith('credential-') ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 h-7 text-[10.5px]"
                    onClick={onOpenNotes}
                  >
                    Open setup
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <span className="grid size-10 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.04] text-accent/80 shadow-[0_0_0_5px_rgba(255,255,255,0.015)]">
                  <Sparkles className="size-[17px]" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[12px] font-medium text-white/75">
                  {status === 'stopped' ? 'Session ended' : 'Ready to transform'}
                </p>
                <p className="mt-1.5 max-w-[350px] text-[10.5px] leading-[1.55] text-white/35">
                  {status === 'stopped'
                    ? 'Start a new session to reconnect the camera and Lucy 2.5.'
                    : 'Your transformed camera feed will appear here once the Lucy 2.5 session is connected.'}
                </p>
              </>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[9.5px]">
              <span className="inline-flex items-center gap-1.5 text-white/30">
                <span
                  className={cn('size-1 rounded-full', hasPrompt ? 'bg-positive' : 'bg-white/20')}
                  aria-hidden="true"
                />
                Prompt {hasPrompt ? 'ready' : 'missing'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/30">
                <ImageIcon className="size-2.5" aria-hidden="true" />
                {referenceName ? 'Reference attached' : 'No reference'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/30">
                <span
                  className={cn(
                    'size-1 rounded-full',
                    status === 'connected'
                      ? 'bg-positive'
                      : failed
                        ? 'bg-negative'
                        : 'bg-white/20',
                  )}
                  aria-hidden="true"
                />
                WebRTC
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenNotes}
              className="mt-4 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-white/35 transition hover:bg-white/[0.05] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Terminal className="size-3" aria-hidden="true" />
              Integration notes
              <ArrowUpRight className="size-2.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.055] px-3 py-2">
        <p className="text-[9.5px] leading-4 text-white/28">
          {remoteStream
            ? 'Live transformed output from Decart. Dallr does not record it.'
            : 'Virtual-camera output is not installed in this build.'}
        </p>
        <button
          type="button"
          onClick={onOpenNotes}
          className="shrink-0 text-[10px] font-medium text-accent/65 transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Details
        </button>
      </div>
    </section>
  );
}
