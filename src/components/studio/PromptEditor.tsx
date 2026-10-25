import { LoaderCircle, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Form';
import { cn } from '@/lib/utils';

const MAX_LENGTH = 600;

export function PromptEditor({
  value,
  onChange,
  onReset,
  error,
  presetName,
  disabled,
  live = false,
  pending = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
  error?: string;
  presetName: string | null;
  disabled: boolean;
  live?: boolean;
  pending?: boolean;
}) {
  return (
    <Card className="p-3.5">
      <CardHeader
        title="Transformation"
        icon={<Sparkles className="size-3.5" />}
        action={
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-white/32 transition hover:bg-white/[0.05] hover:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-30"
            title="Reset the prompt to the active preset"
          >
            <RotateCcw className="size-2.5" aria-hidden="true" />
            Reset
          </button>
        }
      />

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="transform-prompt" className="text-[11px] font-medium text-white/55">
            Prompt
          </label>
          <span className="text-[9.5px] text-white/25">
            {value.length}/{MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id="transform-prompt"
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, MAX_LENGTH))}
          disabled={disabled}
          invalid={Boolean(error)}
          placeholder="Describe the look, lighting and material qualities…"
          className={cn('min-h-[104px] text-[12px]', error && 'border-negative/45')}
          aria-describedby={error ? 'transform-prompt-error' : 'transform-prompt-hint'}
        />
        {error ? (
          <p id="transform-prompt-error" className="mt-1.5 text-[11px] text-negative" role="alert">
            {error}
          </p>
        ) : (
          <p id="transform-prompt-hint" className="mt-1.5 text-[10.5px] leading-[1.5] text-white/30">
            {live ? (
              <>
                Changes are sent to Lucy while the session is live.
                {presetName ? (
                  <>
                    {' '}
                    Based on <span className="text-white/50">{presetName}</span>.
                  </>
                ) : null}
              </>
            ) : presetName ? (
              <>
                Based on <span className="text-white/50">{presetName}</span>. Edits are stored on this
                device and sent when you start a session.
              </>
            ) : (
              'Edits are stored on this device and sent when you start a session.'
            )}
          </p>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] text-white/24">
          {pending ? (
            <>
              <LoaderCircle className="size-2.5 animate-spin text-accent/70" aria-hidden="true" />
              Applying to Lucy…
            </>
          ) : (
            <>
              <span
                className={cn('size-1 rounded-full', live ? 'bg-accent/80' : 'bg-positive/60')}
                aria-hidden="true"
              />
              {live ? 'Live updates on' : 'Autosaved locally'}
            </>
          )}
        </span>
        {value.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[10px]"
            onClick={() => onChange('')}
            disabled={disabled}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
