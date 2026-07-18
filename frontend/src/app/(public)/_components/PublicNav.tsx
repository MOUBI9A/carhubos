"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Car, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#enterprise', label: 'Enterprise' },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/landing" onClick={close} className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Car className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">Fider</span>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-[11px] font-black uppercase tracking-[0.2em]">Login</Button>
          </Link>
          <Link href="/signup">
            <Button className="text-[11px] font-black uppercase tracking-[0.2em] px-6">Get Started</Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="md:hidden p-2 -mr-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="container mx-auto px-6 py-5 flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className="py-3.5 text-sm font-black uppercase tracking-[0.2em] text-white/70 hover:text-white border-b border-white/5 transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-5">
              <Link href="/login" onClick={close}>
                <Button variant="outline" className="w-full py-3 text-[11px] font-black uppercase tracking-[0.2em]">Login</Button>
              </Link>
              <Link href="/signup" onClick={close}>
                <Button className="w-full py-3 text-[11px] font-black uppercase tracking-[0.2em]">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
