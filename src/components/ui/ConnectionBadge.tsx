import { CloudOff, LoaderCircle, Wifi } from 'lucide-react';
import { useApp } from '@/state/useApp';
import { cn } from '@/lib/utils';

export function ConnectionBadge({ compact = false }: { compact?: boolean }) {
  const { connection } = useApp();

  const config = {
    online: {
      icon: Wifi,
      label: 'Connected',
      className: 'border-positive/15 bg-positive/[0.05] text-positive/80',
      dot: 'bg-positive',
    },
    offline: {
      icon: CloudOff,
      label: 'Disconnected',
      className: 'border-negative/20 bg-negative/[0.06] text-negative/85',
      dot: 'bg-negative',
    },
    reconnecting: {
      icon: LoaderCircle,
      label: 'Reconnecting',
      className: 'border-warning/20 bg-warning/[0.06] text-warning/85',
      dot: 'bg-warning',
    },
  }[connection];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[10px] font-medium',
        config.className,
      )}
      title={`Connection status: ${config.label.toLowerCase()}`}
    >
      {connection === 'reconnecting' ? (
        <Icon className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <span className={cn('size-1.5 rounded-full', config.dot)} aria-hidden="true" />
      )}
      {!compact ? config.label : <span className="sr-only">{config.label}</span>}
    </span>
  );
}
