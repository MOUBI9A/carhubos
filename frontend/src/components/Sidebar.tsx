"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  TrendingUp,
  History,
  AlertTriangle,
  Calendar,
  Globe,
  BarChart3,
  Activity,
  Plus,
  Search,
  Ban,
  X,
  UserCog,
  CreditCard,
  FolderOpen,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { role, logout, user } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  if (!role) return null;

  const roleConfigs: Record<string, NavItem[]> = {
    ROOT_ADMIN: [
      { label: t('admin.globalPulse'), href: '/admin', icon: LayoutDashboard },
      { label: t('admin.infraPulse'), href: '/admin/pulse', icon: Activity },
      { label: t('admin.provision'), href: '/admin/provision', icon: Plus },
      { label: t('admin.agencies'), href: '/admin/agencies', icon: ShieldCheck },
      { label: t('admin.auditLogs'), href: '/admin/logs', icon: FileText },
      { label: t('admin.settings'), href: '/admin/settings', icon: Settings },
    ],
    OWNER: [
      { label: t('owner.erp'), href: '/dashboard/erp', icon: BarChart3 },
      { label: t('owner.command'), href: '/dashboard', icon: LayoutDashboard },
      { label: t('owner.reports'), href: '/dashboard/reports', icon: FileText },
      { label: t('owner.fleet'), href: '/dashboard/fleet', icon: Car },
      { label: t('owner.diagnostics'), href: '/dashboard/diagnostics', icon: Wrench },
      { label: t('owner.bookings'), href: '/dashboard/bookings', icon: Calendar },
      { label: t('owner.customers'), href: '/dashboard/customers', icon: Users },
      { label: t('owner.vault'), href: '/dashboard/vault', icon: ShieldCheck },
      { label: t('owner.vaultFiles'), href: '/dashboard/vault-files', icon: FolderOpen },
      { label: t('owner.hub'), href: '/dashboard/hub', icon: Globe },
      { label: t('owner.accidents'), href: '/dashboard/accidents', icon: AlertTriangle },
      { label: t('owner.finance'), href: '/dashboard/finance', icon: TrendingUp },
      { label: t('owner.waitlist'), href: '/dashboard/waitlist', icon: History },
      { label: t('owner.blacklist'), href: '/dashboard/blacklist', icon: Ban },
      { label: t('owner.search'), href: '/dashboard/search', icon: Search },
      { label: t('owner.staff'), href: '/dashboard/staff', icon: UserCog },
      { label: t('owner.billing'), href: '/dashboard/billing', icon: CreditCard },
      { label: t('owner.settings'), href: '/dashboard/settings', icon: Settings },
    ],
    MANAGER: [
      { label: t('manager.command'), href: '/dashboard', icon: LayoutDashboard },
      { label: t('manager.fleet'), href: '/dashboard/fleet', icon: Car },
      { label: t('manager.diagnostics'), href: '/dashboard/diagnostics', icon: Wrench },
      { label: t('manager.bookings'), href: '/dashboard/bookings', icon: Calendar },
      { label: t('manager.customers'), href: '/dashboard/customers', icon: Users },
      { label: t('manager.waitlist'), href: '/dashboard/waitlist', icon: History },
      { label: t('manager.blacklist'), href: '/dashboard/blacklist', icon: Ban },
      { label: t('manager.search'), href: '/dashboard/search', icon: Search },
    ],
    AGENT: [
      { label: t('agent.operations'), href: '/agent', icon: LayoutDashboard },
      { label: t('agent.tasks'), href: '/agent/tasks', icon: FileText },
      { label: t('agent.inspections'), href: '/agent/inspections', icon: ShieldCheck },
      { label: t('agent.diagnostics'), href: '/agent/diagnostics', icon: Wrench },
    ],
    RENTER: [
      { label: t('renter.vault'), href: '/portal', icon: ShieldCheck },
      { label: t('renter.book'), href: '/portal/book', icon: Car },
      { label: t('renter.history'), href: '/portal/history', icon: History },
    ],
  };

  const navItems = roleConfigs[role] || [];

  return (
    <aside
      className={cn(
        // Logical start edge + RTL-aware off-canvas slide (Phase 7)
        "w-64 h-screen glass border-e border-hairline flex flex-col fixed start-0 top-0 z-50 transform transition-transform duration-300 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
      )}
    >
      <div className="p-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {tc('brand')}<span className="text-text-faint">OS</span>
          </h1>
          <p className="eyebrow mt-1">
            {t('edition')}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label={tc('closeMenu')}
          className="lg:hidden -me-2 -mt-1 p-1.5 rounded-lg text-text-faint hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-text-muted hover:bg-surface-raised hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-text-faint"
              )} />
              <span className="font-medium text-sm tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-hairline">
        <div className="mb-3 px-1">
          <LocaleSwitcher className="w-full justify-start text-xs" />
        </div>
        <div className="glass-card p-4 mb-4 flex items-center gap-3">
          <Avatar name={user?.name} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
            <p className="eyebrow truncate">{role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">{tc('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
