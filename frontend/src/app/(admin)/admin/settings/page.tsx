"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Settings, Shield, Globe, Bell, Database, Lock } from 'lucide-react';

export default function RootSettings() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-black tracking-tighter text-white">Platform Settings</h1>
        <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">Global Configuration & Governance</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Core System</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Maintenance Mode</p>
                <p className="text-[10px] text-white/40 font-medium">Block all non-admin access</p>
              </div>
              <div className="w-12 h-6 bg-white/5 rounded-full relative cursor-pointer border border-white/10">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white/20 rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Public Registration</p>
                <p className="text-[10px] text-white/40 font-medium">Allow new agencies to sign up</p>
              </div>
              <div className="w-12 h-6 bg-primary/20 rounded-full relative cursor-pointer border border-primary/20">
                <div className="absolute right-1 top-1 w-4 h-4 bg-primary rounded-full" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <CardTitle>Security & Auth</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-6">
             <div className="space-y-2">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global Password Policy</p>
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary/50 transition-colors">
                   <option>Strict (12+ chars, special)</option>
                   <option>Moderate (8+ chars)</option>
                </select>
             </div>
             <Button variant="outline" className="w-full">Manage API Keys</Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <CardTitle>Infrastructure</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4">
             <div className="p-4 glass-card flex items-center justify-between">
                <div>
                   <p className="text-xs font-bold text-white">Database Health</p>
                   <p className="text-[10px] text-success font-black uppercase">Healthy (2ms Latency)</p>
                </div>
                <Button variant="ghost" size="sm">Optimize</Button>
             </div>
             <Button variant="outline" className="w-full">Flush Global Cache</Button>
          </div>
        </Card>

        <Card className="border-danger/20 bg-danger/5">
           <CardHeader>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                   <Lock className="w-5 h-5 text-danger" />
                </div>
                <CardTitle className="text-danger">Danger Zone</CardTitle>
             </div>
           </CardHeader>
           <p className="text-xs text-white/40 leading-relaxed mb-6">
              Critical platform actions that cannot be undone. Handle with forensic precision.
           </p>
           <Button variant="danger" className="w-full">Hard Reset All Tenants</Button>
        </Card>
      </div>
    </div>
  );
}
