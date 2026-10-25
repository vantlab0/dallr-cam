import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ImagePlus,
  Info,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import type { LucySessionError, LucySessionStatus } from '@/types';
import { LogoMark } from '@/components/ui/Logo';
import { formatCredits, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

const MAX_LENGTH = 600;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const LUCY_EDIT_TYPES = [
  { label: 'Character swap', prompt: 'Substitute the character in the video with the person in the reference image.' },
  { label: 'Virtual try-on', prompt: 'Swap the clothing and accessories with the outfit in the reference image.' },
  { label: 'Background', prompt: "Change the background environment to a serene neon-lit cyberpunk cityscape at night." },
  { label: 'Style', prompt: 'Cinematic 35mm film aesthetic, warm rich contrast, Kodak Portra tones, 8k portrait lighting.' },
  { label: 'Add / Replace', prompt: 'Add sleek black sunglasses and replace the background wall with modern concrete.' },
  { label: 'Remove', prompt: 'Clean removal of all background clutter and unwanted objects with natural reconstruction.' },
  { label: 'Visual effects', prompt: 'Add dynamic glowing neon ember particles, subtle atmospheric haze and volumetric lighting.' },
] as const;

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

export function StudioPromptPanel({
  prompt,
  onPromptChange,
  promptError,
  referenceFile,
  referenceUrl: externalReferenceUrl,
  onReferenceChange,
  status,
  disabled,
  live,
  pending,
  updateError,
  isOnline,
  balanceCredits,
  estimatedRemainingSec,
  onStart,
  onApplyPrompt,
  onOpenNotes,
  onOpenNav,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  promptError?: string;
  referenceFile: File | null;
  referenceUrl?: string | null;
  onReferenceChange: (file: File | null) => void;
  status: LucySessionStatus;
  disabled: boolean;
  live: boolean;
  pending: boolean;
  updateError: LucySessionError | null;
  isOnline: boolean;
  balanceCredits: number;
  estimatedRemainingSec: number;
  onStart: () => void;
  onApplyPrompt: () => void;
  onOpenNotes: () => void;
  onOpenNav: () => void;
}) {
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localReferenceUrl = useObjectUrl(referenceFile);
  const activeReferenceUrl = externalReferenceUrl ?? localReferenceUrl;

  const busy = status === 'requesting-camera' || status === 'connecting';
  const submitDisabled = disabled || !prompt.trim() || !isOnline;
  const showPending = pending || busy;

  useEffect(() => {
    if (!referenceFile) setReferenceError(null);
  }, [referenceFile]);

  const acceptFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setReferenceError('Use a PNG, JPEG or WebP image.');
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setReferenceError('Image must be 8 MB or smaller.');
      return;
    }
    setReferenceError(null);
    onReferenceChange(candidate);
  };

  const handleSubmit = () => {
    if (submitDisabled) return;
    if (live) onApplyPrompt();
    else onStart();
  };

  const submitTitle = !isOnline
    ? 'Reconnect before starting a session'
    : busy
      ? 'Connecting to Lucy…'
      : live
        ? 'Apply this prompt to the live session'
        : 'Start a session with this prompt';

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col rounded-2xl border bg-[#15161a] p-3 shadow-panel transition-colors',
        isDragging
          ? 'border-accent/40 bg-[#15161a]/90'
          : 'border-white/[0.07]',
      )}
      aria-label="Prompt and transformation controls"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        acceptFile(event.dataTransfer.files?.[0]);
      }}
    >
      <header className="flex items-center justify-between gap-3 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenNav}
            className="rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Open navigation"
            title="Open navigation"
          >
            <LogoMark className="size-7" />
          </button>
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-white/90">Prompt</span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[10px] text-white/30"
            title="Lucy 2.5 · 1280 × 720 · 30 fps"
          >
            <Zap className="size-3" aria-hidden="true" />
            30 fps
          </span>
          <button
            type="button"
            onClick={onOpenNotes}
            className="grid size-6 place-items-center rounded-md text-white/30 transition hover:bg-white/[0.05] hover:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Open session setup and integration notes"
            title="Session setup"
          >
            <Info className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <textarea
          id="transform-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value.slice(0, MAX_LENGTH))}
          disabled={disabled}
          spellCheck
          placeholder="Describe the look, lighting and material qualities…"
          aria-label="Transformation prompt"
          aria-invalid={Boolean(promptError)}
          aria-describedby={promptError ? 'transform-prompt-error' : undefined}
          className={cn(
            'min-h-[140px] w-full flex-1 resize-none bg-transparent px-0.5 py-1 text-[16px] leading-[1.55] tracking-[-0.01em] text-white/90 outline-none placeholder:text-white/22 disabled:cursor-not-allowed disabled:opacity-50',
            promptError && 'text-negative/90',
          )}
        />
        {promptError ? (
          <p id="transform-prompt-error" className="mt-1 text-[10.5px] text-negative" role="alert">
            {promptError}
          </p>
        ) : null}

        <div className="mt-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
              <Sparkles className="size-2.5 text-accent" aria-hidden="true" />
              Edit Types:
            </span>
            {LUCY_EDIT_TYPES.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={disabled}
                onClick={() => onPromptChange(item.prompt)}
                className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-white/55 transition hover:border-accent/40 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40"
                title={`Set prompt: ${item.prompt}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {updateError ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/[0.055] px-2.5 py-2 text-[10px] leading-[1.45] text-warning/80">
            <TriangleAlert className="mt-px size-3 shrink-0" aria-hidden="true" />
            <p className="min-w-0">
              <span className="font-medium text-warning">{updateError.title}.</span>{' '}
              <span className="text-warning/65">{updateError.message}</span>
            </p>
          </div>
        ) : null}

        {referenceError ? (
          <p className="px-0.5 text-[10px] text-negative" role="alert">
            {referenceError}
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={(event) => {
            acceptFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        {/* Prominent Reference Image Card */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
              <ImagePlus className="size-3.5 text-accent" aria-hidden="true" />
              Reference Image
            </span>
            <span className="text-[10px] text-white/35">Decart Lucy 2.5 Target</span>
          </div>

          {referenceFile ? (
            <div className="flex items-center gap-3 rounded-lg border border-accent/25 bg-accent/[0.035] p-2.5">
              {activeReferenceUrl ? (
                <img
                  src={activeReferenceUrl}
                  alt="Reference thumbnail"
                  className="size-12 shrink-0 rounded-md object-cover ring-1 ring-white/10"
                />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-white/[0.06] text-accent">
                  <ImagePlus className="size-5" aria-hidden="true" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-medium text-white/90" title={referenceFile.name}>
                  {referenceFile.name}
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">
                  {formatSize(referenceFile.size)} · <span className="font-medium text-accent/80">Active Target</span>
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/70 transition hover:bg-white/[0.12] hover:text-white"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onReferenceChange(null);
                      setReferenceError(null);
                    }}
                    className="rounded bg-negative/[0.08] px-2 py-0.5 text-[10px] font-medium text-negative/75 transition hover:bg-negative/[0.16] hover:text-negative"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'group flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.14] bg-white/[0.015] py-3 text-center transition hover:border-accent/40 hover:bg-accent/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40',
                isDragging && 'border-accent/60 bg-accent/[0.06]',
              )}
            >
              <div className="grid size-8 place-items-center rounded-full bg-white/[0.05] text-white/50 transition group-hover:scale-105 group-hover:bg-accent/15 group-hover:text-accent">
                <ImagePlus className="size-4" aria-hidden="true" />
              </div>
              <p className="mt-1.5 text-[11.5px] font-medium text-white/75 group-hover:text-white">
                Upload Target Reference Image
              </p>
              <p className="mt-0.5 text-[9.5px] text-white/35">
                PNG, JPG or WebP · Drag & drop or click to browse
              </p>
            </button>
          )}
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={submitDisabled}
            onClick={handleSubmit}
            className="flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[12px] font-semibold text-accent-contrast shadow-[0_8px_24px_-10px_rgb(var(--accent)/0.7)] transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
            aria-label={live ? 'Apply prompt' : 'Start session'}
            title={submitTitle}
          >
            {showPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                <span>{busy ? 'Connecting to Lucy…' : 'Applying…'}</span>
              </>
            ) : (
              <>
                <ArrowUp className="size-4" strokeWidth={2.4} aria-hidden="true" />
                <span>{live ? 'Apply Prompt to Stream' : 'Start Session'}</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5 text-[9px] text-white/22">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'size-1 rounded-full',
                live ? 'bg-positive' : 'bg-white/20',
              )}
              aria-hidden="true"
            />
            <span className="truncate">
              {live ? (pending ? 'Applying to Lucy…' : 'Live · changes apply automatically') : 'Autosaved locally'}
            </span>
          </span>
          <Link
            to="/wallet"
            className="inline-flex shrink-0 items-center gap-1 text-white/40 transition hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            title={`Wallet · ${formatCredits(balanceCredits)} credits remaining (4 cr/sec during live rendering)`}
          >
            <span className="font-medium text-accent/80">{formatCredits(balanceCredits)} cr</span>
            <span className="text-white/20">·</span>
            <span>{formatDuration(estimatedRemainingSec)}</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
