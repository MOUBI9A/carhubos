"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Command, 
  Search, 
  Car, 
  Users, 
  TrendingUp, 
  Settings, 
  Plus, 
  FileText,
  Zap,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const toggle = useCallback(() => setIsOpen(open => !isOpen), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commands = [
    { group: 'Navigation', items: [
      { name: 'Dashboard', icon: Zap, href: '/dashboard' },
      { name: 'Fleet Guardian', icon: Car, href: '/dashboard/fleet' },
      { name: 'Financial Brain', icon: TrendingUp, href: '/dashboard/finance' },
      { name: 'Audit Logs', icon: FileText, href: '/admin/logs' },
    ]},
    { group: 'Quick Actions', items: [
      { name: 'Provision Agency', icon: Plus, href: '/admin/agencies' },
      { name: 'Log Refusal', icon: Users, href: '/dashboard/waitlist' },
      { name: 'System Settings', icon: Settings, href: '/admin/settings' },
    ]},
  ];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/60 backdrop-blur-md" 
        onClick={() => setIsOpen(false)} 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-2xl glass rounded-3xl shadow-2xl overflow-hidden border-white/20"
      >
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          <Search className="w-6 h-6 text-white/20" />
          <input 
            autoFocus
            placeholder="Type a command or search assets..." 
            className="bg-transparent border-none outline-none text-xl font-bold text-white w-full placeholder:text-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 flex items-center gap-1">
             <span className="text-[10px] font-black text-white/40 uppercase">ESC</span>
          </div>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {commands.map((group) => (
            <div key={group.group} className="mb-6 last:mb-0">
               <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4 mb-3">{group.group}</h3>
               <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        router.push(item.href);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-primary text-white/60 hover:text-white transition-all group text-left"
                    >
                      <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                      <span className="font-bold text-sm">{item.name}</span>
                      <Navigation className="ml-auto w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
               </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
           <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/40">↑↓</div>
                 <span className="text-[10px] font-bold text-white/20 uppercase">Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/40">↵</div>
                 <span className="text-[10px] font-bold text-white/20 uppercase">Select</span>
              </div>
           </div>
           <p className="text-[10px] font-black text-primary uppercase tracking-widest">Infinity OS Universal Search</p>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
