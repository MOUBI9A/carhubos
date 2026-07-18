"use client";

import React, { useState } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Sticky warning bar shown whenever the founder is impersonating a tenant user.
 * Renders nothing for a normal session. "Exit" restores the founder's own
 * session via the AuthContext.
 */
export function ImpersonationBanner() {
  const { user, exitImpersonation } = useAuth();
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
    <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 bg-amber-500 text-black text-xs font-bold">
      <ShieldAlert className="w-4 h-4 shrink-0" />
      <span className="truncate">
        Support mode — viewing as{' '}
        <span className="font-black">{user.name}</span>
        <span className="hidden sm:inline"> ({user.email})</span>
      </span>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/85 text-white font-bold hover:bg-black transition-colors disabled:opacity-60"
      >
        <LogOut className="w-3.5 h-3.5" />
        {exiting ? 'Exiting…' : 'Exit'}
      </button>
    </div>
  );
}
