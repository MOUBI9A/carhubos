import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ 
  children, 
  className, 
  variant = 'default',
  padding = 'md',
  onClick,
  style
}: CardProps) {
  const variants = {
    default: 'glass shadow-soft',
    outline: 'border border-hairline bg-transparent',
    flat: 'bg-surface border-none'
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div 
      onClick={onClick}
      style={style}
      className={cn(
        'rounded-2xl transition-all duration-300',
        variants[variant],
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}



export function CardHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <h3 className={cn('text-[15px] font-semibold tracking-tight text-foreground', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <p className={cn('text-[11px] font-semibold text-text-faint uppercase tracking-[0.08em]', className)}>
      {children}
    </p>
  );
}
