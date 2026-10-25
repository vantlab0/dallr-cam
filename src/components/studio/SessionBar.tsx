import { CircleStop, Coins, Hourglass, Play, RefreshCw, Timer, WifiOff } from 'lucide-react';
import type { LucySessionError, LucySessionStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatClock, formatCredits, formatCreditsDecimal, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

export function SessionBar({
  status,
  elapsedSec,
  creditsUsed,
  estimatedRemainingSec,
  usageRatePerMin,
  isOnline,
  lastRun,
  error,
  onStart,
  onStop,
  onRetry,
}: {
  status: LucySessionStatus;
  elapsedSec: number;
  creditsUsed: number;
  estimatedRemainingSec: number;
  usageRatePerMin: number;
  isOnline: boolean;
  lastRun: { durationSec: number; credits: number } | null;
  error: LucySessionError | null;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
}) {
  const live = status === 'connected' || status === 'reconnecting';
  const starting = status === 'requesting-camera' || status === 'connecting';
  const failed = status === 'failed';

  const statusLabel: Record<LucySessionStatus, string> = {
    idle: lastRun ? 'Last session ended' : 'Ready to start',
    'requesting-camera': 'Waiting for camera permission…',
    connecting: 'Connecting to Lucy 2.5…',
    connected: 'Lucy 2.5 live',
    reconnecting: 'Reconnecting to Lucy…',
    failed: error?.title ?? 'Session failed',
    stopped: 'Session ended',
  };

  const subtitle = starting
    ? 'Camera access is requested only when a session starts.'
    : live
      ? 'Camera → Decart over WebRTC · no wallet deductions'
      : failed
        ? 'Review the error and retry when ready.'
        : isOnline
          ? 'Camera starts when you press Start.'
          : 'Reconnect before starting a session.';

  return (
    <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {starting ? (
            <Button
              size="lg"
              variant="danger"
              icon={CircleStop}
              onClick={onStop}
              className="min-w-[132px] shadow-none"
            >
              Cancel
            </Button>
          ) : live ? (
            <Button
              size="lg"
              variant="danger"
              icon={CircleStop}
              onClick={onStop}
              className="min-w-[132px] shadow-none"
            >
              End session
            </Button>
          ) : failed ? (
            <Button
              size="lg"
              variant="primary"
              icon={RefreshCw}
              onClick={onRetry}
              disabled={!isOnline}
              className="min-w-[132px]"
            >
              Retry session
            </Button>
          ) : (
            <Button
              size="lg"
              variant="primary"
              icon={Play}
              onClick={onStart}
              disabled={!isOnline}
              className="min-w-[132px]"
            >
              Start session
            </Button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  status === 'connected'
                    ? 'animate-soft-pulse bg-positive'
                    : status === 'reconnecting'
                      ? 'animate-soft-pulse bg-warning'
                      : starting
                        ? 'bg-accent/70'
                        : failed
                          ? 'bg-negative'
                          : 'bg-white/20',
                )}
                aria-hidden="true"
              />
              <p className="truncate text-[11.5px] font-medium text-white/70">
                {statusLabel[status]}
              </p>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-white/28">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          <div className="min-w-[86px] px-3 first:pl-0">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/25">
              <Timer className="size-2.5" aria-hidden="true" />
              Elapsed
            </p>
            <p className="mt-1 text-[14px] font-medium tabular-nums text-white/85">
              {formatClock(live || lastRun ? elapsedSec : 0)}
            </p>
          </div>
          <div className="min-w-[92px] px-3">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/25">
              <Coins className="size-2.5" aria-hidden="true" />
              Est. credits
            </p>
            <p className="mt-1 text-[14px] font-medium tabular-nums text-white/85">
              {formatCreditsDecimal(creditsUsed)}
            </p>
          </div>
          <div className="min-w-[98px] pl-3 pr-0">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/25">
              <Hourglass className="size-2.5" aria-hidden="true" />
              Time left
            </p>
            <p className="mt-1 text-[14px] font-medium tabular-nums text-white/85">
              {formatDuration(estimatedRemainingSec)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 xl:justify-end">
          <Badge tone={isOnline ? 'neutral' : 'negative'} dot>
            {isOnline ? `Lucy 2.5 · ${formatCredits(usageRatePerMin)} cr/min demo` : 'Offline'}
          </Badge>
          {!isOnline ? <WifiOff className="size-3.5 text-negative/70" aria-hidden="true" /> : null}
        </div>
      </div>
    </section>
  );
}
