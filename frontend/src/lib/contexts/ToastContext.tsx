"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X, 
  Bell,
  Zap,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import arMessages from '../../../messages/ar.json';
import enMessages from '../../../messages/en.json';
import frMessages from '../../../messages/fr.json';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/config';

type ToastType = 'success' | 'danger' | 'warning' | 'info' | 'pulse';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_KEYS: Record<string, string> = {
  'Missing Fields': 'missingFields',
  'Registration Failed': 'registrationFailed',
  'Booking Confirmed': 'bookingConfirmed',
  'Booking Failed': 'bookingFailed',
  'All Clear': 'allClear',
  'Task Created': 'taskCreated',
  'Invalid Dates': 'invalidDates',
  'Customer Required': 'customerRequired',
  'Renter Blocked': 'renterBlocked',
  'Deploying Booking': 'deployingBooking',
  'Customer Registered': 'customerRegistered',
  'Load Failed': 'loadFailed',
  Failed: 'failed',
  'Action Failed': 'actionFailed',
  'Search Failed': 'searchFailed',
  'Input Required': 'inputRequired',
  'Listing Created': 'listingCreated',
  'B2B Request Sent': 'b2bRequestSent',
  'Contract Ready': 'contractReady',
  'Status Updated': 'statusUpdated',
  'Save Failed': 'saveFailed',
  'Update Failed': 'updateFailed',
  'Deletion Blocked': 'deleteFailed',
  'Inspection Recorded': 'inspectionRecorded',
};

const catalogs = { fr: frMessages, ar: arMessages, en: enMessages } as const;

function currentLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale;
  const value = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.split('=')[1];
  return isLocale(value) ? value : defaultLocale;
}

function translateToast(locale: Locale, text: string): string {
  const key = TOAST_KEYS[text];
  return key ? catalogs[locale].toast[key as keyof typeof frMessages.toast] : text;
}

function translateCommon(locale: Locale, key: 'close'): string {
  return catalogs[locale].common[key];
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const existing = timersRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleDismiss = useCallback((id: string, delay = 5000) => {
    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      removeToast(id);
    }, delay);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  const pauseDismiss = useCallback((id: string) => {
    const existing = timersRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const locale = currentLocale();
    setToasts((prev) => [...prev, {
      id,
      type,
      title: translateToast(locale, title),
      message,
    }]);
    scheduleDismiss(id, 5000);
  }, [scheduleDismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-8 end-8 z-[200] flex flex-col gap-4 w-full max-w-sm pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
              onMouseEnter={() => pauseDismiss(toast.id)}
              onMouseLeave={() => scheduleDismiss(toast.id, 3000)}
              onFocus={() => pauseDismiss(toast.id)}
              onBlur={() => scheduleDismiss(toast.id, 3000)}
            >
              <div className={cn(
                "glass p-5 rounded-2xl flex gap-4 shadow-2xl relative overflow-hidden",
                "before:absolute before:start-0 before:top-0 before:bottom-0 before:w-1",
                toast.type === 'danger' ? 'before:bg-danger' : 
                toast.type === 'success' ? 'before:bg-success' : 
                toast.type === 'warning' ? 'before:bg-warning' : 'before:bg-primary'
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  toast.type === 'danger' ? 'bg-danger/10 text-danger' : 
                  toast.type === 'success' ? 'bg-success/10 text-success' : 
                  toast.type === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                )}>
                  {toast.type === 'danger' && <AlertTriangle className="w-5 h-5" />}
                  {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                  {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                  {toast.type === 'info' && <Info className="w-5 h-5" />}
                  {toast.type === 'pulse' && <Zap className="w-5 h-5 animate-pulse" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground tracking-tight">{toast.title}</h4>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed font-medium">{toast.message}</p>
                </div>
                <button 
                  onClick={() => removeToast(toast.id)}
                  aria-label={translateCommon(currentLocale(), 'close')}
                  className="p-1 hover:bg-surface-raised rounded-lg transition-colors h-fit text-text-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
