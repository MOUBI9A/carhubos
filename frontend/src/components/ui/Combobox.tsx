"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
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
 * Accessible, searchable single-select styled with Fider Lux tokens.
 * Renders its dropdown absolutely inside a relative wrapper so it works within
 * the booking Modal's scroll container. Keyboard: ↑/↓ move, Enter select,
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
  const comboboxId = useId();
  const listboxId = `${comboboxId}-listbox`;
  const optionId = (id: string) => `${comboboxId}-opt-${id}`;
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
        role="combobox"
        id={comboboxId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && filtered[highlight] ? optionId(filtered[highlight].id) : undefined}
        className={cn(
          'w-full flex items-center gap-3 bg-surface border rounded-2xl px-4 py-4 text-left outline-none transition-all shadow-inner',
          open ? 'border-primary ring-1 ring-primary/20' : 'border-hairline hover:border-hairline/80',
          disabled && 'opacity-50 pointer-events-none',
        )}
      >
        {icon && <span className="text-text-muted shrink-0">{icon}</span>}
        <span className="flex-1 min-w-0 truncate text-sm font-medium">
          {selected ? (
            <span className="text-foreground">
              {selected.label}
              {selected.sublabel && (
                <span className="text-text-muted"> • {selected.sublabel}</span>
              )}
            </span>
          ) : (
            <span className="text-text-faint">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-muted shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { y: -6, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={reduce ? {} : { y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full rounded-2xl border border-hairline bg-surface backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-hairline">
              <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Type to filter..."
                className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-text-faint"
              />
            </div>

            <ul
              id={listboxId}
              ref={listRef}
              role="listbox"
              className="max-h-56 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs font-normal text-text-muted">
                  {emptyText}
                </li>
              ) : (
                filtered.map((o, i) => {
                  const isSel = o.id === value;
                  const isHi = i === highlight;
                  return (
                    <li
                      key={o.id}
                      id={optionId(o.id)}
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => commit(o.id)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                        isHi ? 'bg-primary/15' : 'hover:bg-surface-raised',
                      )}
                    >
                      <span className="flex-1 min-w-0 truncate">
                        <span className="text-sm font-medium text-foreground">
                          {o.label}
                        </span>
                        {o.sublabel && (
                          <span className="text-xs text-text-muted">
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
              <div className="border-t border-hairline p-2">{footer}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
