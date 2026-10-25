import { Check } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { PRESETS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export function PresetGallery({
  activePresetId,
  onSelect,
  disabled,
  live = false,
}: {
  activePresetId: string | null;
  onSelect: (presetId: string) => void;
  disabled: boolean;
  live?: boolean;
}) {
  return (
    <Card className="p-3.5">
      <CardHeader
        title="Presets"
        icon={<span className="text-[10px] font-semibold">Aa</span>}
        action={<span className="text-[9px] uppercase tracking-[0.12em] text-white/22">Prompt presets</span>}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => {
          const active = preset.id === activePresetId;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(preset.id)}
              className={cn(
                'group overflow-hidden rounded-[9px] border p-0.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 disabled:pointer-events-none disabled:opacity-45',
                active
                  ? 'border-accent/35 bg-accent/[0.055]'
                  : 'border-white/[0.06] bg-white/[0.015] hover:border-white/[0.13] hover:bg-white/[0.035]',
              )}
            >
              <span
                className={cn(
                  'relative block aspect-[16/10] w-full overflow-hidden rounded-[7px] bg-gradient-to-br',
                  preset.gradient,
                )}
              >
                <span
                  className={cn(
                    'absolute -right-2 -top-3 size-12 rounded-full opacity-70 blur-xl transition-transform duration-300 group-hover:scale-125',
                    preset.glow,
                  )}
                  aria-hidden="true"
                />
                <span
                  className="absolute bottom-0 left-1/2 h-[74%] w-[48%] -translate-x-1/2 rounded-t-[46%] bg-black/25"
                  aria-hidden="true"
                />
                <span
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),transparent_35%,rgba(0,0,0,0.22))]"
                  aria-hidden="true"
                />
                <span
                  className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.55)_0.6px,transparent_0.6px)] [background-size:4px_4px]"
                  aria-hidden="true"
                />
                {active ? (
                  <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-accent text-accent-contrast shadow-sm">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : null}
              </span>
              <span className="flex items-center justify-between gap-1 px-1.5 pb-1 pt-1.5">
                <span className="truncate text-[10px] font-medium text-white/65 group-hover:text-white/85">
                  {preset.name}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[9.5px] leading-[1.5] text-white/24">
        Preset prompts are examples. Selecting one updates the prompt
        {live ? ' and applies it to the live session.' : ' when you start a session.'}
      </p>
    </Card>
  );
}
