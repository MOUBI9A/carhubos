"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Car, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#enterprise', label: 'Enterprise' },
  { href: '#pricing', label: 'Pricing' },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 scrim">
      <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
        <Link href="/landing" onClick={close} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised border border-hairline">
            <Car className="h-5 w-5 text-metal" strokeWidth={1.75} />
          </div>
          <span className="font-display text-lg text-foreground">Fider</span>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-text-muted hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">Get started</Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="md:hidden p-2 -me-2 rounded-lg text-text-muted hover:text-foreground hover:bg-surface transition-colors"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden border-t border-hairline scrim animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className="py-3.5 text-base font-medium text-text-muted hover:text-foreground border-b border-hairline transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-5">
              <Link href="/login" onClick={close}>
                <Button variant="outline" className="w-full">Log in</Button>
              </Link>
              <Link href="/signup" onClick={close}>
                <Button variant="primary" className="w-full">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
