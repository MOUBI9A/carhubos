"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Sticky warning bar shown whenever the founder is impersonating a tenant user.
 * Renders nothing for a normal session. "Exit" restores the founder's own
 * session via the AuthContext.
 */
export function ImpersonationBanner() {
  const { user, exitImpersonation } = useAuth();
  const t = useTranslations('common');
  const [exiting, setExiting] = useState(false);

  if (!user?.isImpersonated) return null;

  const handleExit = async () => {
    setExiting(true);
    try {
      await exitImpersonation();
    } catch {
      setExiting(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 bg-warning text-foreground text-xs font-medium border-b border-warning/30">
      <ShieldAlert className="w-4 h-4 shrink-0 text-foreground" />
      <span className="truncate text-foreground">
        {t('supportMode')}{' '}
        <span className="font-semibold text-foreground">{user.name}</span>
        <span className="hidden sm:inline text-foreground/80"> ({user.email})</span>
      </span>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface text-foreground font-semibold hover:bg-surface-raised border border-hairline transition-colors disabled:opacity-60"
      >
        <LogOut className="w-3.5 h-3.5 text-text-muted" />
        {exiting ? t('exiting') : t('exit')}
      </button>
    </div>
  );
}
