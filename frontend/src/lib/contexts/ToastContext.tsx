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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className={cn(
                "glass p-5 rounded-2xl flex gap-4 shadow-2xl relative overflow-hidden",
                "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
                toast.type === 'danger' ? 'before:bg-danger' : 
                toast.type === 'success' ? 'before:bg-success' : 
                toast.type === 'warning' ? 'before:bg-amber-500' : 'before:bg-primary'
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  toast.type === 'danger' ? 'bg-danger/10 text-danger' : 
                  toast.type === 'success' ? 'bg-success/10 text-success' : 
                  toast.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                )}>
                  {toast.type === 'danger' && <AlertTriangle className="w-5 h-5" />}
                  {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                  {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                  {toast.type === 'info' && <Info className="w-5 h-5" />}
                  {toast.type === 'pulse' && <Zap className="w-5 h-5 animate-pulse" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{toast.title}</h4>
                  <p className="text-xs text-white/60 mt-0.5 leading-relaxed font-medium">{toast.message}</p>
                </div>
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-white/5 rounded-lg transition-colors h-fit"
                >
                  <X className="w-4 h-4 text-white/20" />
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
