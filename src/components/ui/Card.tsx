import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.07] bg-white/[0.025] shadow-panel backdrop-blur-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.035] text-white/50">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[13px] font-medium tracking-[-0.01em] text-white/90">{title}</h2>
          {description ? (
            <p className="mt-1 text-[12px] leading-[1.5] text-white/42">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-white/[0.06]', className)} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/32',
        className,
      )}
    >
      {children}
    </p>
  );
}
