import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Base shimmer block. Compose into page-specific skeleton layouts.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-surface-raised/60',
        'after:absolute after:inset-0 after:-translate-x-full',
        'after:bg-gradient-to-r after:from-transparent after:via-hairline/40 after:to-transparent',
        'after:animate-[shimmer_1.8s_infinite]',
        className,
      )}
    />
  );
}

/** Skeleton for a stat/entity card in a grid. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass rounded-2xl p-6 space-y-4', className)}>
      <div className="flex justify-between items-start">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="w-14 h-4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-2/3 h-5" />
        <Skeleton className="w-1/3 h-3" />
      </div>
      <Skeleton className="w-full h-1.5 rounded-full" />
      <div className="flex justify-between pt-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-14 h-4" />
      </div>
    </div>
  );
}

/** Skeleton rows for tables/lists. */
export function SkeletonRows({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-1/2 h-3.5" />
            <Skeleton className="w-1/3 h-2.5" />
          </div>
          <Skeleton className="w-16 h-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}
