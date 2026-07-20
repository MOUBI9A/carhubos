"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Settings, Shield, Globe, Database, Lock, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function RootSettings() {
  const t = useTranslations('adminPages');
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-text-muted" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('settings')}</h1>
          <p className="mt-1 text-sm text-text-muted">Global configuration &amp; governance</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card padding="lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-text-muted" />
              </div>
              <div>
                <CardTitle>Core system</CardTitle>
                <CardDescription className="mt-0.5">Platform access</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="divide-y divide-hairline">
            <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">Maintenance mode</p>
                <p className="text-xs text-text-faint">Block all non-admin access</p>
              </div>
              <div className="w-12 h-6 bg-surface-raised rounded-full relative cursor-pointer border border-hairline shrink-0 transition-colors">
                <div className="absolute start-1 top-1 w-4 h-4 bg-text-faint rounded-full shadow-sm transition-transform" />
              </div>
            </div>
            <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">Public registration</p>
                <p className="text-xs text-text-faint">Allow new agencies to sign up</p>
              </div>
              <div className="w-12 h-6 bg-primary/20 rounded-full relative cursor-pointer border border-primary/20 shrink-0 transition-colors">
                <div className="absolute end-1 top-1 w-4 h-4 bg-primary rounded-full shadow-sm transition-transform" />
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-metal/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-metal" />
              </div>
              <div>
                <CardTitle>Security &amp; auth</CardTitle>
                <CardDescription className="mt-0.5">Access control</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="space-y-6">
             <div className="space-y-2">
                <p className="eyebrow text-text-faint">Global password policy</p>
                <div className="relative">
                  <select className="w-full appearance-none cursor-pointer bg-surface-raised border border-hairline rounded-xl px-4 py-3 pe-10 text-sm font-medium text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors">
                     <option>Strict (12+ chars, special)</option>
                     <option>Moderate (8+ chars)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-faint absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
             </div>
             <Button variant="outline" className="w-full">Manage API Keys</Button>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-info" />
              </div>
              <div>
                <CardTitle>Infrastructure</CardTitle>
                <CardDescription className="mt-0.5">System resources</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="space-y-4">
             <div className="p-4 glass-card flex items-center justify-between">
                <div>
                   <p className="text-sm font-medium text-foreground">Database health</p>
                   <p className="text-xs text-success">Healthy · <span className="font-mono tabular-nums">2ms</span> latency</p>
                </div>
                <Button variant="ghost" size="sm">Optimize</Button>
             </div>
             <Button variant="outline" className="w-full">Flush Global Cache</Button>
          </div>
        </Card>

        <Card padding="lg" className="border-danger/20 bg-danger/5">
           <CardHeader>
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                   <Lock className="w-5 h-5 text-danger" />
                </div>
                <CardTitle className="text-danger">Danger zone</CardTitle>
             </div>
           </CardHeader>
           <p className="text-sm text-text-muted leading-relaxed mb-6">
              Critical platform actions that cannot be undone. Handle with forensic precision.
           </p>
           <Button variant="danger" className="w-full">Hard Reset All Tenants</Button>
        </Card>
      </div>
    </div>
  );
}
