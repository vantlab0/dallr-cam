import { createContext } from 'react';
import type { ToastMessage, ToastTone } from '@/types';

export interface ToastContextValue {
  toasts: ToastMessage[];
  pushToast: (toast: { tone?: ToastTone; title: string; description?: string }) => string;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
