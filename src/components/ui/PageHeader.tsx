import type { ReactNode } from 'react';
import { Eyebrow } from './Card';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <div className="flex items-center gap-2.5">
          <h1 className="text-[22px] font-medium tracking-[-0.025em] text-white/95">{title}</h1>
          {meta}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-[620px] text-[12.5px] leading-[1.55] text-white/40">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
