"use client";

import React from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Car, History, Shield } from 'lucide-react';

export default function RenterLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading, logout, user } = useAuth();
  const router = useRouter();

  const HOME_BY_ROLE: Record<string, string> = {
    ROOT_ADMIN: '/admin', OWNER: '/dashboard', MANAGER: '/dashboard', AGENT: '/agent', RENTER: '/portal',
  };

  React.useEffect(() => {
    if (isLoading) return;
    if (!role) {
      router.push('/login');
    } else if (role !== 'RENTER') {
      router.push(HOME_BY_ROLE[role] ?? '/login');
    }
  }, [role, isLoading, router]);

  if (isLoading || !role || role !== 'RENTER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center animate-pulse">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tighter text-primary">
              Fider<span className="text-white">OS</span>
            </h1>
            <span className="bg-primary/20 text-primary text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest">Portal</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/portal" className="text-sm font-bold text-white/60 hover:text-white transition-colors">My Vault</Link>
            <Link href="/portal/book" className="text-sm font-bold text-white/60 hover:text-white transition-colors">Book a Car</Link>
            <Link href="/portal/history" className="text-sm font-bold text-white/60 hover:text-white transition-colors">History</Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 glass-card rounded-full">
               <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                 {user?.name?.[0] || 'U'}
               </div>
               <span className="text-xs font-bold">{user?.name}</span>
            </div>
            <button onClick={logout} className="p-2 text-white/40 hover:text-danger transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
