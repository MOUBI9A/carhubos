"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const roleConfigs = {
  ROOT_ADMIN: [
    { label: 'Global Pulse', href: '/admin', icon: LayoutDashboard },
    { label: 'Infra Pulse', href: '/admin/pulse', icon: Activity },
    { label: 'Provision Tenant', href: '/admin/provision', icon: Plus },
    { label: 'Agencies', href: '/admin/agencies', icon: ShieldCheck },
    { label: 'Audit Logs', href: '/admin/logs', icon: FileText },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  OWNER: [
    { label: 'Titan ERP Console', href: '/dashboard/erp', icon: BarChart3 },
    { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Report Factory', href: '/dashboard/reports', icon: FileText },
    { label: 'Fleet Guardian', href: '/dashboard/fleet', icon: Car },
    { label: 'Visual Scheduler', href: '/dashboard/bookings', icon: Calendar },
    { label: 'Customer CRM', href: '/dashboard/customers', icon: Users },
    { label: 'Guardian Vault', href: '/dashboard/vault', icon: ShieldCheck },
    { label: 'B2B Hub', href: '/dashboard/hub', icon: Globe },
    { label: 'Accident Dossier', href: '/dashboard/accidents', icon: AlertTriangle },
    { label: 'Financial Brain', href: '/dashboard/finance', icon: TrendingUp },
    { label: 'Waitlist', href: '/dashboard/waitlist', icon: History },
    { label: 'Blacklist', href: '/dashboard/blacklist', icon: Ban },
    { label: 'Global Search', href: '/dashboard/search', icon: Search },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  MANAGER: [
    { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Fleet Guardian', href: '/dashboard/fleet', icon: Car },
    { label: 'Visual Scheduler', href: '/dashboard/bookings', icon: Calendar },
    { label: 'Customer CRM', href: '/dashboard/customers', icon: Users },
    { label: 'Waitlist', href: '/dashboard/waitlist', icon: History },
    { label: 'Blacklist', href: '/dashboard/blacklist', icon: Ban },
    { label: 'Global Search', href: '/dashboard/search', icon: Search },
  ],
  AGENT: [
    { label: 'Operations', href: '/agent', icon: LayoutDashboard },
    { label: 'Task Board', href: '/agent/tasks', icon: FileText },
    { label: 'Inspections', href: '/agent/inspections', icon: ShieldCheck },
  ],
  RENTER: [
    { label: 'My Vault', href: '/portal', icon: ShieldCheck },
    { label: 'Book Car', href: '/portal/book', icon: Car },
    { label: 'History', href: '/portal/history', icon: History },
  ],
};

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { role, logout, user } = useAuth();
  const pathname = usePathname();

  if (!role) return null;

  const navItems = roleConfigs[role as keyof typeof roleConfigs] || [];

  return (
    <aside
      className={cn(
        "w-64 h-screen glass border-r border-white/10 flex flex-col fixed left-0 top-0 z-50 transform transition-transform duration-300 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="p-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-primary">
            Fider<span className="text-white">OS</span>
          </h1>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
            Fider Edition
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden -mr-2 -mt-1 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
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
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                isActive ? "text-white" : "text-primary"
              )} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="glass-card p-4 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{user?.name?.[0] || 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-white/40 font-bold uppercase truncate">{role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
