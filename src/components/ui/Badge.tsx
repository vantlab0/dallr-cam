import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'negative' | 'outline';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-white/[0.07] bg-white/[0.05] text-white/55',
  accent: 'border-accent/20 bg-accent/[0.11] text-accent',
  positive: 'border-positive/20 bg-positive/[0.09] text-positive',
  warning: 'border-warning/20 bg-warning/[0.09] text-warning',
  negative: 'border-negative/20 bg-negative/[0.09] text-negative',
  outline: 'border-white/[0.12] bg-transparent text-white/55',
};

const dots: Record<BadgeTone, string> = {
  neutral: 'bg-white/35',
  accent: 'bg-accent',
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
  outline: 'bg-white/35',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[10px] font-medium tracking-[0.01em]',
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span className={cn('size-1.5 shrink-0 rounded-full', dots[tone])} aria-hidden="true" />
      ) : null}
      {icon}
      {children}
    </span>
  );
}
