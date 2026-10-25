import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '@/lib/clipboard';
import { useToast } from '@/state/useToast';
import { cn } from '@/lib/utils';

export function CopyButton({
  value,
  label = 'Copy',
  toastTitle = 'Copied to clipboard',
  className,
}: {
  value: string;
  label?: string;
  toastTitle?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { pushToast } = useToast();

  const handleCopy = async () => {
    const success = await copyText(value);
    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
      pushToast({ tone: 'success', title: toastTitle });
    } else {
      pushToast({
        tone: 'error',
        title: 'Could not copy',
        description: 'The clipboard is unavailable in this environment.',
      });
    }
  };

  const accessibleLabel = label || 'Copy to clipboard';

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={accessibleLabel}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10.5px] font-medium text-white/35 transition hover:bg-white/[0.05] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        className,
      )}
    >
      {copied ? <Check className="size-3 text-positive" /> : <Copy className="size-3" />}
      {label ? (copied ? 'Copied' : label) : <span className="sr-only">{accessibleLabel}</span>}
    </button>
  );
}
