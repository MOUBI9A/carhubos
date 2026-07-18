import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The brass "wax seal" trust mark (Phase 12) — the one ceremonial use of metal,
 * for verified identities / completed hand-overs. Used sparingly.
 */
export function TrustSeal({
  size = 44,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full border border-metal/60 text-metal', className)}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(120% 120% at 30% 20%, hsl(44 40% 24% / 0.6), hsl(38 30% 12% / 0.4))',
      }}
      aria-label={label ?? 'Verified'}
      title={label ?? 'Verified'}
    >
      <ShieldCheck style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.75} />
    </span>
  );
}

/**
 * Brass "seal" divider — a hairline with a centered diamond, marking a premium
 * or trust section break. Uses the `.seal-rule` utility from globals.css.
 */
export function SealDivider({ className }: { className?: string }) {
  return (
    <div className={cn('seal-rule', className)} aria-hidden>
      <span className="w-1.5 h-1.5 rotate-45 bg-metal shrink-0" />
    </div>
  );
}
