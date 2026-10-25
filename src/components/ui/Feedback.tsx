import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw, WifiOff, type LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.09] bg-black/[0.12] px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/40">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <h3 className="mt-3.5 text-[13px] font-medium text-white/80">{title}</h3>
      <p className="mt-1.5 max-w-[340px] text-[12px] leading-[1.55] text-white/38">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  offline = false,
  className,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  offline?: boolean;
  className?: string;
}) {
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-negative/[0.16] bg-negative/[0.035] px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <span className="grid size-10 place-items-center rounded-xl border border-negative/20 bg-negative/[0.08] text-negative">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <h3 className="mt-3.5 text-[13px] font-medium text-white/85">{title}</h3>
      <p className="mt-1.5 max-w-[360px] text-[12px] leading-[1.55] text-white/40">{description}</p>
      {onRetry ? (
        <Button size="sm" variant="secondary" icon={RefreshCw} className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export type NoticeTone = 'info' | 'warning' | 'error' | 'accent' | 'neutral';

const noticeStyles: Record<NoticeTone, string> = {
  info: 'border-white/[0.07] bg-white/[0.03] text-white/50',
  warning: 'border-warning/[0.18] bg-warning/[0.05] text-warning/90',
  error: 'border-negative/[0.18] bg-negative/[0.05] text-negative/90',
  accent: 'border-accent/[0.18] bg-accent/[0.05] text-accent/90',
  neutral: 'border-white/[0.06] bg-black/10 text-white/42',
};

export function InlineNotice({
  tone = 'info',
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  tone?: NoticeTone;
  icon?: LucideIcon;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-[11.5px] leading-[1.5]',
        noticeStyles[tone],
        className,
      )}
    >
      {Icon ? <Icon className="mt-px size-3.5 shrink-0" aria-hidden="true" /> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium text-white/75">{title}</p> : null}
        <div className={cn(title && 'mt-0.5 text-white/38')}>{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'block animate-shimmer rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_25%,rgba(255,255,255,0.075)_50%,rgba(255,255,255,0.035)_75%)] bg-[length:200%_100%]',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function PageLoading({ rows = 4, label = 'Loading workspace data' }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-white/[0.05] px-4 py-4 last:border-b-0"
          >
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-[38%]" />
              <Skeleton className="h-2.5 w-[22%]" />
            </div>
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
