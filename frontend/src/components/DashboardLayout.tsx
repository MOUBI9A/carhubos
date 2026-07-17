"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';

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
        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center animate-pulse">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
