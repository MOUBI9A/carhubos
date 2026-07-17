import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Unified empty state — used for both "no data yet" and "no results" cases.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass rounded-3xl py-16 px-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-500',
        className,
      )}
    >
      <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-white/15" />
      </div>
      <p className="text-xs font-black text-white/50 uppercase tracking-[0.2em]">{title}</p>
      {description && (
        <p className="text-[11px] font-medium text-white/25 mt-2 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
