import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-contrast hover:bg-accent-strong active:bg-accent-strong shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset]',
  secondary:
    'border border-white/[0.09] bg-white/[0.055] text-white/85 hover:border-white/[0.14] hover:bg-white/[0.09]',
  ghost: 'text-white/55 hover:bg-white/[0.06] hover:text-white/90',
  subtle: 'bg-white/[0.04] text-white/65 hover:bg-white/[0.075] hover:text-white/90',
  danger:
    'border border-negative/25 bg-negative/[0.09] text-negative hover:border-negative/40 hover:bg-negative/[0.14]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-[12px]',
  md: 'h-9 gap-2 rounded-[10px] px-3.5 text-[12.5px]',
  lg: 'h-10 gap-2 rounded-[11px] px-4 text-[13px]',
  icon: 'size-9 rounded-[10px]',
  'icon-sm': 'size-8 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,color,opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-40 active:translate-y-px',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className={cn(size === 'sm' ? 'size-3.5' : 'size-4', 'shrink-0')} aria-hidden="true" />
      ) : null}
      {children}
      {IconRight ? <IconRight className="size-3.5 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}
