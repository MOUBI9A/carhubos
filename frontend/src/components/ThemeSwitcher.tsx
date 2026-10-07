"use client";

import React from 'react';
import { useTheme, type AppTheme } from '@/lib/contexts/ThemeContext';
import { Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type Props = {
  className?: string;
  variant?: 'compact' | 'pills';
};

export function ThemeSwitcher({ className, variant = 'compact' }: Props) {
  const { theme, setTheme, toggleTheme, themeConfig } = useTheme();
  const t = useTranslations('theme');

  if (variant === 'pills') {
    return (
      <div
        role="group"
        aria-label={t('label')}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-hairline bg-surface-raised p-1 shadow-sm',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('fider')}
          aria-pressed={theme === 'fider'}
          title={t('fiderDescription')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all',
            theme === 'fider'
              ? 'bg-cream text-background shadow-xs font-bold'
              : 'text-text-muted hover:text-foreground hover:bg-white/[0.04]',
          )}
        >
          <Sparkles className="w-3 h-3 text-metal" />
          <span>Fider Lux</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('titan')}
          aria-pressed={theme === 'titan'}
          title={t('titanDescription')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all',
            theme === 'titan'
              ? 'bg-primary text-white shadow-xs font-bold ring-1 ring-primary/40'
              : 'text-text-muted hover:text-foreground hover:bg-white/[0.04]',
          )}
        >
          <Zap className="w-3 h-3 text-primary" />
          <span>Titan Cyber</span>
        </button>
      </div>
    );
  }

  // Compact toggle button (icon + badge)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t('current', { name: themeConfig.name })}
      title={t('switchTo', { name: theme === 'fider' ? 'Titan Cyber' : 'Fider Lux' })}
      className={cn(
        'group relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-hairline bg-surface-raised hover:bg-surface text-foreground transition-all active:scale-95',
        className,
      )}
    >
      {theme === 'fider' ? (
        <>
          <Sparkles className="w-3.5 h-3.5 text-metal transition-transform group-hover:scale-110" />
          <span className="text-[11px] font-medium hidden sm:inline">Lux</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-metal/15 text-metal border border-metal/30 uppercase tracking-wider">
            {themeConfig.badge}
          </span>
        </>
      ) : (
        <>
          <Zap className="w-3.5 h-3.5 text-primary transition-transform group-hover:scale-110" />
          <span className="text-[11px] font-medium hidden sm:inline">Titan</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 uppercase tracking-wider">
            {themeConfig.badge}
          </span>
        </>
      )}
    </button>
  );
}
