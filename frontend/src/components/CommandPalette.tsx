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
import { useTranslations } from 'next-intl';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const t = useTranslations('command');

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
    { group: t('navigation'), items: [
      { name: t('dashboard'), icon: Zap, href: '/dashboard' },
      { name: t('fleetGuardian'), icon: Car, href: '/dashboard/fleet' },
      { name: t('financialBrain'), icon: TrendingUp, href: '/dashboard/finance' },
      { name: t('auditLogs'), icon: FileText, href: '/admin/logs' },
    ]},
    { group: t('quickActions'), items: [
      { name: t('provisionAgency'), icon: Plus, href: '/admin/agencies' },
      { name: t('logRefusal'), icon: Users, href: '/dashboard/waitlist' },
      { name: t('systemSettings'), icon: Settings, href: '/admin/settings' },
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
        className="relative w-full max-w-2xl bg-surface border border-hairline rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-hairline flex items-center gap-4">
          <Search className="w-6 h-6 text-text-muted" />
          <input 
            autoFocus
            placeholder={t('searchPlaceholder')} 
            className="bg-transparent border-none outline-none text-xl font-semibold text-foreground w-full placeholder:text-text-faint"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="bg-surface-raised border border-hairline rounded-lg px-2 py-1 flex items-center gap-1">
             <span className="text-[10px] font-medium text-text-muted uppercase">ESC</span>
          </div>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {commands.map((group) => (
            <div key={group.group} className="mb-6 last:mb-0">
               <h3 className="text-[10px] font-semibold text-text-faint uppercase tracking-wider px-4 mb-3">{group.group}</h3>
               <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        router.push(item.href);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-primary/10 text-text-muted hover:text-foreground transition-all group text-left"
                    >
                      <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                      <span className="font-medium text-sm">{item.name}</span>
                      <Navigation className="ml-auto w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
               </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-surface-raised/40 border-t border-hairline flex items-center justify-between">
           <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded bg-surface border border-hairline flex items-center justify-center text-[8px] font-medium text-text-muted">↑↓</div>
                 <span className="text-[10px] font-medium text-text-faint uppercase">{t('navigate')}</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded bg-surface border border-hairline flex items-center justify-center text-[8px] font-medium text-text-muted">↵</div>
                 <span className="text-[10px] font-medium text-text-faint uppercase">{t('select')}</span>
              </div>
           </div>
           <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">{t('universalSearch')}</p>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
