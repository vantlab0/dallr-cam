import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';

const highlights = [
  {
    icon: Camera,
    title: 'One live workspace',
    copy: 'Camera source, prompt, reference image and session controls in a single view.',
  },
  {
    icon: Layers,
    title: 'Reference-led transforms',
    copy: 'Shape the look with a prompt and a visual reference before you go live.',
  },
  {
    icon: ShieldCheck,
    title: 'Local-first by design',
    copy: 'This preview keeps demo workspace data on this device only.',
  },
];

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
    <div className="relative flex min-h-screen bg-ink-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-[10%] top-[8%] size-[560px] rounded-full bg-[radial-gradient(circle,rgb(var(--accent)/0.09),transparent_66%)] blur-2xl" />
        <div className="absolute -bottom-[24%] right-[6%] size-[520px] rounded-full bg-[radial-gradient(circle,rgba(88,166,176,0.055),transparent_70%)] blur-2xl" />
      </div>

      <aside className="relative hidden w-[46%] max-w-[620px] flex-col justify-between border-r border-white/[0.055] bg-white/[0.012] p-10 lg:flex xl:p-14">
        <Link to="/sign-in" aria-label="Dallr Studio" className="w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
          <Logo />
        </Link>

        <div className="max-w-[420px]">
          <Badge tone="accent" dot>
            Decart Lucy 2.5 · interface preview
          </Badge>
          <h1 className="mt-5 font-display text-[42px] leading-[1.08] tracking-[-0.015em] text-white/92">
            A considered studio for camera transformation.
          </h1>
          <p className="mt-4 text-[13px] leading-[1.65] text-white/42">
            Dallr brings the live session surface, reference workflow and credit controls into one
            quiet desktop workspace.
          </p>

          <ul className="mt-9 space-y-5">
            {highlights.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-px grid size-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.07] bg-white/[0.03] text-accent/80">
                  <item.icon className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-white/72">{item.title}</p>
                  <p className="mt-0.5 max-w-[340px] text-[11.5px] leading-[1.5] text-white/32">
                    {item.copy}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="max-w-[360px] text-[10.5px] leading-[1.6] text-white/22">
          This build is a product interface preview. No Decart API is connected, no video is
          processed, and no payments are collected.
        </p>
      </aside>

      <main className="relative flex w-full flex-col lg:w-[54%]">
        <div className="flex h-16 items-center justify-between px-5 sm:px-8 lg:justify-end">
          <Link to="/sign-in" className="lg:hidden" aria-label="Dallr Studio">
            <Logo />
          </Link>
          <Badge tone="neutral">Preview build · demo data</Badge>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-[380px]">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-accent/70">
              {eyebrow}
            </p>
            <h2 className="mt-2.5 text-[25px] font-medium tracking-[-0.03em] text-white/95">
              {title}
            </h2>
            <p className="mt-2 text-[12.5px] leading-[1.6] text-white/38">{description}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-5 text-[11.5px] text-white/35">{footer}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-5 pb-6 text-[10px] text-white/20 sm:px-8">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3" aria-hidden="true" />
            Dallr Studio preview
          </span>
          <span>Local demo · v0.1.0</span>
        </div>
      </main>
    </div>
  );
}
