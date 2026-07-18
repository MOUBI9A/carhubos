import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Fider Lux button (Phase 12). API unchanged; only styling.
 * - primary = cream fill + graphite text (the everyday workhorse, so violet
 *   stays rare — violet only appears as the focus ring / active tab).
 * - premium = brass gradient, reserved for a few trust/upgrade moments.
 * Sentence case, no neon glow.
 */
export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-cream text-background hover:bg-white shadow-sm',
    outline: 'border border-border text-foreground hover:bg-white/[0.05]',
    danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
    ghost: 'text-text-muted hover:text-foreground hover:bg-white/[0.05]',
    premium:
      'text-background border border-metal-soft shadow-md bg-gradient-to-b from-[hsl(44_58%_64%)] to-[hsl(38_48%_48%)] hover:brightness-[1.06]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-[13px]',
    lg: 'px-7 py-3.5 text-sm',
  };

  return (
    <button
      className={cn(
        'rounded-xl font-sans font-semibold tracking-normal transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
