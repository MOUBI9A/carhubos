"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    prevFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element (or the dialog itself) once painted.
    const focusTimer = setTimeout(() => {
      const el = dialogRef.current;
      if (!el) return;
      const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE);
      (focusables[0] ?? el).focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      // Trap Tab focus within the dialog.
      const el = dialogRef.current;
      if (!el) return;
      const focusables = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (f) => f.offsetParent !== null,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = 'unset';
      // Restore focus to whatever opened the dialog.
      prevFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full glass rounded-[2rem] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden focus:outline-none',
          sizes[size],
        )}
      >
        <div className="p-8 pb-0 flex items-start justify-between">
          <div>
            <h2 id={titleId} className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-text-muted text-xs font-normal mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 hover:bg-surface-raised rounded-full transition-colors text-text-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5 text-text-muted hover:text-foreground transition-colors" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto">{children}</div>

        {footer && (
          <div className="p-6 bg-surface-raised/40 border-t border-hairline flex items-center justify-end gap-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
