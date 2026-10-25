import { cn } from '@/lib/utils';

export function Progress({
  value,
  max = 100,
  label,
  tone = 'accent',
  className,
}: {
  value: number;
  max?: number;
  label: string;
  tone?: 'accent' | 'positive' | 'warning';
  className?: string;
}) {
  const safeMax = max <= 0 ? 100 : max;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const tones = {
    accent: 'bg-accent/85',
    positive: 'bg-positive/80',
    warning: 'bg-warning/80',
  };

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.round(value)}
      className={cn('h-1 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/30">{label}</p>
      <p className="mt-1.5 truncate text-[17px] font-medium tracking-[-0.02em] text-white/90 tabular-nums">
        {value}
      </p>
      {detail ? <p className="mt-0.5 text-[11px] text-white/33">{detail}</p> : null}
    </div>
  );
}

export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-white/[0.09] bg-white/[0.04] px-1 font-sans text-[9.5px] font-medium text-white/35">
      {children}
    </kbd>
  );
}
