import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const controlBase =
  'w-full rounded-[10px] border border-white/[0.08] bg-black/25 text-[13px] text-white/90 shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset] transition placeholder:text-white/25 hover:border-white/[0.12] focus:border-accent/45 focus:bg-black/30 focus:outline-none focus:ring-[3px] focus:ring-accent/[0.09] disabled:cursor-not-allowed disabled:opacity-50';

export function FormField({
  label,
  hint,
  error,
  htmlFor,
  optional,
  action,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  optional?: boolean;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={htmlFor} className="text-[11.5px] font-medium text-white/62">
            {label}
            {optional ? <span className="ml-1 text-white/28">optional</span> : null}
          </label>
          {action}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-[11.5px] leading-4 text-negative" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11.5px] leading-4 text-white/35">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(
        controlBase,
        'h-9 px-3',
        invalid && 'border-negative/45 focus:border-negative/60 focus:ring-negative/10',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        controlBase,
        'min-h-[92px] resize-y px-3 py-2.5 leading-[1.55]',
        invalid && 'border-negative/45 focus:border-negative/60 focus:ring-negative/10',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(controlBase, 'h-9 appearance-none pl-3 pr-8', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/35"
        aria-hidden="true"
      />
    </div>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  return (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 disabled:opacity-40',
        checked
          ? 'border-accent/35 bg-accent/85'
          : 'border-white/[0.09] bg-white/[0.07] hover:bg-white/[0.1]',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 size-[16px] -translate-y-1/2 rounded-full shadow-sm transition-transform duration-200',
          checked
            ? 'translate-x-[18px] bg-accent-contrast'
            : 'translate-x-[2px] bg-white/55',
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <span className="relative mt-0.5 flex">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="peer size-4 cursor-pointer appearance-none rounded-[5px] border border-white/15 bg-black/25 transition checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute left-0 top-0 size-4 p-[3px] text-accent-contrast opacity-0 transition peer-checked:opacity-100"
          aria-hidden="true"
        >
          <path
            d="M3 8.5 6.5 12 13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <label htmlFor={id} className="cursor-pointer select-none text-[12px] leading-[1.5] text-white/60">
        {label}
        {description ? <span className="mt-0.5 block text-[11px] text-white/32">{description}</span> : null}
      </label>
    </div>
  );
}
