import { getInitials } from '@/lib/format';
import { cn } from '@/lib/utils';

const gradients = [
  'from-[#6674d8] to-[#9d6ad1]',
  'from-[#3d7f7a] to-[#6aa78e]',
  'from-[#a26b4d] to-[#c99a6b]',
  'from-[#6d5b9c] to-[#a06f9e]',
  'from-[#4f739b] to-[#719dbb]',
];

function hashName(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const gradient = gradients[hashName(name) % gradients.length] ?? gradients[0];
  const sizes = {
    xs: 'size-6 rounded-md text-[9px]',
    sm: 'size-7 rounded-lg text-[10px]',
    md: 'size-8 rounded-[9px] text-[11px]',
    lg: 'size-11 rounded-xl text-[14px]',
    xl: 'size-16 rounded-[18px] text-[20px]',
  };

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br font-semibold tracking-wide text-white/90 ring-1 ring-white/10',
        gradient,
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.22),transparent_55%)]" />
      <span className="relative">{getInitials(name)}</span>
    </span>
  );
}
