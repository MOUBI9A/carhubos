import React from 'react';
import { Car, Image as ImageIcon, MapPin, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type Slot = 'hero' | 'car' | 'agency' | 'empty' | 'generic';

const SLOT_GLYPH: Record<Slot, React.ElementType> = {
  hero: KeyRound,
  car: Car,
  agency: MapPin,
  empty: ImageIcon,
  generic: ImageIcon,
};

/**
 * The single imagery swap-slot (Phase 12). Real agency/renter uploads win via
 * `src` (warm-graded so mixed sources cohere); otherwise a warm graphite
 * placeholder with a faint on-brand glyph is shown — never a blank grey box.
 * Every photographic surface in the product goes through this so real photos can
 * be dropped in later without touching layout. `overlay` renders chrome on top
 * (e.g. a plate/price scrim on car cards).
 */
export function AgencyImage({
  src,
  alt,
  slot = 'generic',
  ratio = '16 / 9',
  rounded = 'rounded-xl',
  className,
  overlay,
  fill = false,
}: {
  src?: string | null;
  alt: string;
  slot?: Slot;
  ratio?: string;
  rounded?: string;
  className?: string;
  overlay?: React.ReactNode;
  /** Fill the parent (h-full w-full) instead of using an aspect ratio. */
  fill?: boolean;
}) {
  const Glyph = SLOT_GLYPH[slot];
  return (
    <div
      className={cn('relative overflow-hidden bg-surface-raised', fill && 'h-full w-full', rounded, className)}
      style={fill ? undefined : { aspectRatio: ratio }}
    >
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            style={{ filter: 'saturate(0.92) contrast(1.03) brightness(0.97)' }}
          />
          {/* Shared warm "golden-hour" grade so every source reads as one set. */}
          <div className="absolute inset-0 pointer-events-none bg-[hsl(34_50%_24%)]/12 mix-blend-overlay" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Warm mesh placeholder */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(120% 90% at 20% 0%, hsl(40 30% 22% / 0.5), transparent 55%), radial-gradient(120% 90% at 100% 100%, hsl(266 30% 22% / 0.35), transparent 55%)',
            }}
          />
          <Glyph className="relative w-8 h-8 text-cream/20" strokeWidth={1.25} />
        </div>
      )}
      {overlay}
    </div>
  );
}

/**
 * Fleet/booking car photo — the car is the hero of the card. 3:2, plate/price
 * scrim baked in. `plate` and `price` render over a bottom gradient in mono.
 */
export function CarPhoto({
  src,
  alt,
  plate,
  price,
  className,
  rounded = 'rounded-xl',
}: {
  src?: string | null;
  alt: string;
  plate?: string;
  price?: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <AgencyImage
      src={src}
      alt={alt}
      slot="car"
      ratio="3 / 2"
      rounded={rounded}
      className={className}
      overlay={
        (plate || price) && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 bg-gradient-to-t from-[hsl(30_12%_4%)]/85 to-transparent">
            {plate && (
              <span className="font-mono text-[11px] font-medium text-cream/90 tracking-wider">
                <bdi dir="ltr">{plate}</bdi>
              </span>
            )}
            {price && (
              <span className="font-mono text-xs font-semibold text-cream">{price}</span>
            )}
          </div>
        )
      }
    />
  );
}
