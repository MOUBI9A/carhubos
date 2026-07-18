"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Sidebar } from './Sidebar';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

// Where to send a signed-in user who lands on an area their role can't access.
const HOME_BY_ROLE: Record<string, string> = {
  ROOT_ADMIN: '/admin',
  OWNER: '/dashboard',
  MANAGER: '/dashboard',
  AGENT: '/agent',
  RENTER: '/portal',
};

export function DashboardLayout({
  children,
  allow,
}: {
  children: React.ReactNode;
  /** If set, only these roles may view this area; others are sent to their own home. */
  allow?: string[];
}) {
  const { role, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tc = useTranslations('common');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (isLoading) return;
    if (!role) {
      router.push('/login');
    } else if (allow && !allow.includes(role)) {
      router.push(HOME_BY_ROLE[role] ?? '/login');
    }
  }, [role, isLoading, allow, router]);

  const blocked = !!allow && !!role && !allow.includes(role);

  if (isLoading || !role || blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-hairline flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ImpersonationBanner />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile top bar with hamburger */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-16 px-4 glass border-b border-hairline">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label={tc('openMenu')}
          className="p-2 -ms-2 rounded-lg text-text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          {tc('brand')}<span className="text-text-faint">OS</span>
        </span>
      </header>

      <main className="lg:ms-64 p-4 lg:p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
