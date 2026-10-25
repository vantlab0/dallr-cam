import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToastMessage, ToastTone } from '@/types';
import { ToastContext } from './toast-context';

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} satisfies Record<ToastTone, typeof Info>;

const toastAccents: Record<ToastTone, string> = {
  success: 'text-positive',
  error: 'text-negative',
  info: 'text-accent',
};

let toastSequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({
      tone = 'info',
      title,
      description,
    }: {
      tone?: ToastTone;
      title: string;
      description?: string;
    }) => {
      toastSequence += 1;
      const id = `toast_${toastSequence}`;
      setToasts((current) => [...current.slice(-3), { id, tone, title, description }]);
      const timer = window.setTimeout(() => dismissToast(id), 4_800);
      timers.current.set(id, timer);
      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, pushToast, dismissToast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2.5"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toastIcons[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/[0.08] bg-ink-800/95 p-3.5 shadow-lift backdrop-blur-xl"
                role="status"
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', toastAccents[toast.tone])} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-5 text-white/90">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-[12px] leading-[1.45] text-white/50">
                      {toast.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="-m-1 rounded-md p-1 text-white/35 transition hover:bg-white/5 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  aria-label="Dismiss notification"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
