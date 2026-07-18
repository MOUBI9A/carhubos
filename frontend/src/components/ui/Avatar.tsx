import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Humanized avatar (Phase 12). Renders a real photo when `src` is given, else a
 * deterministic warm-graphite monogram (never a bare grey icon). `verified` adds
 * the brass trust ring. Swap-in slot: pass `src` (real agency/renter upload) to
 * replace the monogram — layout is identical either way.
 */
export function Avatar({
  name,
  src,
  size = 40,
  verified = false,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  verified?: boolean;
  className?: string;
}) {
  const label = (name || '').trim();
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '·';

  // Deterministic warm hue from the name so avatars vary but stay on-palette.
  const warmHues = [22, 30, 38, 44, 16, 50, 12];
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  const hue = warmHues[h % warmHues.length];
  const bg = `hsl(${hue} 26% 16%)`;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden ring-1 ring-hairline',
        verified && 'ring-[1.5px] ring-metal',
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={label || undefined}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          className="w-full h-full object-cover"
          style={{ filter: 'saturate(0.94) contrast(1.02)' }}
        />
      ) : (
        <span
          className="w-full h-full flex items-center justify-center font-sans font-semibold text-cream select-none"
          style={{ background: bg, fontSize: Math.round(size * 0.38) }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
