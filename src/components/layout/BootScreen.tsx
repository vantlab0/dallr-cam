import { motion } from 'framer-motion';
import { LogoMark } from '@/components/ui/Logo';

export function BootScreen() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-ink-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.045] blur-[100px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center"
      >
        <LogoMark className="size-11 rounded-[14px]" />
        <p className="mt-5 font-display text-[26px] leading-none text-white/90">Dallr</p>
        <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.26em] text-white/28">
          Lucy 2.5 Studio
        </p>
        <div className="mt-7 h-px w-32 overflow-hidden bg-white/[0.07]">
          <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgb(var(--accent)/0.7),transparent)] bg-[length:200%_100%]" />
        </div>
        <p className="mt-3 text-[10.5px] text-white/25">Preparing your workspace</p>
      </motion.div>
    </div>
  );
}
