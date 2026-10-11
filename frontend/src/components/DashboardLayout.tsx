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
  const { user, role, isLoading } = useAuth();
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
    } else if (user?.isVerified === false) {
      router.push('/verify-email');
    } else if (role === 'OWNER' && user?.onboardingStatus !== 'COMPLETED') {
      router.push('/onboarding');
    } else if (allow && !allow.includes(role)) {
      router.push(HOME_BY_ROLE[role] ?? '/login');
    }
  }, [user, role, isLoading, allow, router]);

  const blocked =
    (!role && !isLoading) ||
    (!!allow && !!role && !allow.includes(role)) ||
    user?.isVerified === false ||
    (role === 'OWNER' && user?.onboardingStatus !== 'COMPLETED');

  if (isLoading || blocked) {
    return (
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Placeholder sidebar skeleton for immediate layout paint */}
        <div className="hidden lg:flex w-64 flex-col border-r border-hairline bg-surface/50 p-6 space-y-6">
          <div className="h-8 w-28 bg-surface-raised rounded-lg animate-pulse" />
          <div className="space-y-3 pt-4">
            <div className="h-9 w-full bg-surface-raised rounded-lg animate-pulse" />
            <div className="h-9 w-full bg-surface-raised rounded-lg animate-pulse" />
            <div className="h-9 w-full bg-surface-raised rounded-lg animate-pulse" />
            <div className="h-9 w-full bg-surface-raised rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-6 lg:p-8 space-y-6">
          <div className="h-10 w-48 bg-surface-raised rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-28 bg-surface-raised rounded-xl animate-pulse" />
            <div className="h-28 bg-surface-raised rounded-xl animate-pulse" />
            <div className="h-28 bg-surface-raised rounded-xl animate-pulse" />
            <div className="h-28 bg-surface-raised rounded-xl animate-pulse" />
          </div>
          <div className="h-64 bg-surface-raised rounded-xl animate-pulse" />
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
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile top bar with hamburger */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-16 px-4 bg-surface border-b border-hairline">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label={tc('openMenu')}
          className="p-2 -ms-2 rounded-lg text-text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-base font-medium tracking-tight text-foreground">
          {tc('brand')}<span className="text-text-faint">OS</span>
        </span>
      </header>

      <main className="lg:ms-64 p-4 lg:p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
