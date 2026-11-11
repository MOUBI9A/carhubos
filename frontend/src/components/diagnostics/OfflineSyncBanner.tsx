'use client';

import React, { useState, useEffect } from 'react';
import { GarageOfflineBuffer } from './offlineBuffer';

export function OfflineSyncBanner({
  onSyncTriggered,
}: {
  onSyncTriggered?: () => Promise<void> | void;
}) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    setPendingCount(GarageOfflineBuffer.getSyncQueue().length);

    const handleOnline = () => {
      setIsOnline(true);
      setPendingCount(GarageOfflineBuffer.getSyncQueue().length);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setPendingCount(GarageOfflineBuffer.getSyncQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setPendingCount(GarageOfflineBuffer.getSyncQueue().length);
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (onSyncTriggered) {
        await onSyncTriggered();
      }
      setPendingCount(GarageOfflineBuffer.getSyncQueue().length);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and no pending items, return minimal or null state
  if (isOnline && pendingCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 rounded-full w-fit">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Garage Cloud: Live Connected</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-sm font-sans transition-all ${
        !isOnline
          ? 'bg-amber-950/70 border-amber-800/80 text-amber-200'
          : 'bg-blue-950/60 border-blue-800/80 text-blue-200'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            !isOnline ? 'bg-amber-500 animate-pulse' : 'bg-blue-400 animate-ping'
          }`}
        />
        <div>
          <span className="font-semibold tracking-wide">
            {!isOnline ? 'Offline Garage Network Buffer' : 'Cloud Sync Pending'}
          </span>
          <span className="ml-2 text-xs opacity-85">
            {!isOnline
              ? `Diagnostic drafts and notes are buffered locally (${pendingCount} queued).`
              : `${pendingCount} buffered action(s) ready for synchronization.`}
          </span>
        </div>
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition disabled:opacity-50"
        >
          {isSyncing ? 'Synchronizing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );
}
