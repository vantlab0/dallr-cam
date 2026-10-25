import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReferenceUpload({
  file,
  onChange,
  disabled,
  live = false,
  pending = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled: boolean;
  live?: boolean;
  pending?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const acceptFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError('Use a PNG, JPEG or WebP image.');
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError('Image must be 8 MB or smaller.');
      return;
    }
    setError(null);
    onChange(candidate);
  };

  return (
    <Card className="p-3.5">
      <CardHeader
        title="Reference image"
        icon={<ImagePlus className="size-3.5" />}
        action={
          file ? (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setError(null);
              }}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-white/32 transition hover:bg-negative/[0.07] hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-30"
            >
              <Trash2 className="size-2.5" aria-hidden="true" />
              Remove
            </button>
          ) : (
            <span className="text-[9px] uppercase tracking-[0.12em] text-white/22">Optional</span>
          )
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          acceptFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {file && previewUrl ? (
        <div className="mt-3">
          <div className="group relative overflow-hidden rounded-lg border border-white/[0.07] bg-black/30">
            <img
              src={previewUrl}
              alt={`Reference preview: ${file.name}`}
              className="h-[118px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.55))]" />
            <div className="absolute inset-x-2.5 bottom-2 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium text-white/80">{file.name}</p>
                <p className="text-[9px] text-white/40">{formatSize(file.size)}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 shrink-0 bg-black/30 px-2 text-[9.5px]"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                Replace
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-[1.5] text-white/28">
            {pending
              ? 'Applying this reference to the live session…'
              : live
                ? 'Applied to the live session and uploaded to Decart for inference. Dallr does not store it.'
                : 'Uploaded to Decart when you start a session. Dallr does not store it.'}
          </p>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            acceptFile(event.dataTransfer.files[0]);
          }}
          className={cn(
            'mt-3 flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40',
            dragging
              ? 'border-accent/40 bg-accent/[0.055]'
              : 'border-white/[0.1] bg-black/[0.12] hover:border-white/[0.18] hover:bg-white/[0.025]',
          )}
        >
          <span className="grid size-8 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/35">
            <Upload className="size-3.5" aria-hidden="true" />
          </span>
          <span className="mt-2 text-[10.5px] font-medium text-white/55">
            Drop an image here
          </span>
          <span className="mt-0.5 text-[9.5px] text-white/28">PNG, JPEG or WebP · up to 8 MB</span>
        </button>
      )}

      {error ? (
        <p className="mt-2 text-[10.5px] text-negative" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
