import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[11px] border border-white/10 bg-[linear-gradient(150deg,rgba(255,255,255,0.16),rgba(255,255,255,0.02))]',
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(var(--accent)/0.35),transparent_65%)]" />
      <svg viewBox="0 0 24 24" className="relative size-[19px] text-accent" fill="none">
        <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.15" opacity="0.5" />
        <path
          d="M5.6 9.4A7.25 7.25 0 0 1 15.5 4.9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M18.4 14.6A7.25 7.25 0 0 1 8.5 19.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.15" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!compact ? (
        <div className="min-w-0">
          <p className="font-display text-[21px] leading-none tracking-[0.01em] text-white/95">
            Dallr
          </p>
          <p className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.24em] text-white/35">
            Lucy 2.5 Studio
          </p>
        </div>
      ) : null}
    </div>
  );
}
