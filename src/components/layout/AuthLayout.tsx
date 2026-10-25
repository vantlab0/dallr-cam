import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-ink-950 px-5 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 size-[480px] rounded-full bg-[radial-gradient(circle,rgb(var(--accent)/0.08),transparent_65%)] blur-2xl" />
      </div>

      <div className="relative w-full max-w-[360px]">
        <div className="mb-8 flex justify-center">
          <Link to="/sign-in" aria-label="Dallr Studio">
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 backdrop-blur-md">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent/80">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1.5 text-xl font-medium tracking-tight text-white/95">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-xs text-white/40">{description}</p>
          )}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-5 text-center text-xs text-white/40">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
