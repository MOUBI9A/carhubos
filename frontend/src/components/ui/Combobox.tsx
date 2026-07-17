"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  /** Optional node pinned under the option list (e.g. a "+ Walk-in" action). */
  footer?: React.ReactNode;
  /** Optional leading icon rendered inside the trigger. */
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible, searchable single-select styled like the app's native select
 * boxes (glass field, rounded-2xl, font-black micro voice). Renders its
 * dropdown absolutely inside a relative wrapper so it works within the
 * booking Modal's scroll container. Keyboard: ↑/↓ move, Enter select,
 * Esc close, type-to-filter (matches label + sublabel).
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  emptyText = 'No matches',
  footer,
  icon,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus the search field when opening; reset highlight to selected/first.
  useEffect(() => {
    if (open) {
      setQuery('');
      const idx = Math.max(
        0,
        options.findIndex((o) => o.id === value),
      );
      setHighlight(idx === -1 ? 0 : idx);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, options, value]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.children[highlight] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const commit = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault();
        commit(filtered[highlight].id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full flex items-center gap-3 bg-white/5 border rounded-2xl px-4 py-4 text-left outline-none transition-all shadow-inner',
          open ? 'border-primary' : 'border-white/10 hover:border-white/20',
          disabled && 'opacity-50 pointer-events-none',
        )}
      >
        {icon && <span className="text-white/20 shrink-0">{icon}</span>}
        <span className="flex-1 min-w-0 truncate text-sm font-bold">
          {selected ? (
            <span className="text-white">
              {selected.label}
              {selected.sublabel && (
                <span className="text-white/30"> • {selected.sublabel}</span>
              )}
            </span>
          ) : (
            <span className="text-white/30">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-white/30 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            // Deliberately do NOT animate opacity: the panel must stay fully
            // opaque so the form behind never bleeds through (and it can't get
            // stuck translucent if rAF is throttled). Only the slide animates.
            initial={reduce ? false : { y: -6, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={reduce ? {} : { y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{ backgroundColor: 'rgba(9, 12, 20, 0.98)' }}
            className="absolute z-50 mt-2 w-full rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
              <Search className="w-3.5 h-3.5 text-white/20 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Type to filter..."
                className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/20"
              />
            </div>

            <ul
              ref={listRef}
              role="listbox"
              className="max-h-56 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-[10px] font-black text-white/20 uppercase tracking-widest">
                  {emptyText}
                </li>
              ) : (
                filtered.map((o, i) => {
                  const isSel = o.id === value;
                  const isHi = i === highlight;
                  return (
                    <li
                      key={o.id}
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => commit(o.id)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                        isHi ? 'bg-primary/15' : 'hover:bg-white/5',
                      )}
                    >
                      <span className="flex-1 min-w-0 truncate">
                        <span className="text-sm font-bold text-white">
                          {o.label}
                        </span>
                        {o.sublabel && (
                          <span className="text-[11px] font-bold text-white/30">
                            {' '}
                            • {o.sublabel}
                          </span>
                        )}
                      </span>
                      {isSel && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            {footer && (
              <div className="border-t border-white/5 p-2">{footer}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
