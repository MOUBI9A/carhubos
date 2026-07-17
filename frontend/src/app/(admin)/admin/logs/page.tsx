"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Shield, User, Clock, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AuditLogs() {
  const logs = [
    { id: 1, actor: 'SuperAdmin', action: 'Provisioned Agency', target: 'City Drive Tangier', time: '2m ago', type: 'SYSTEM' },
    { id: 2, actor: 'AgencyOwner (Impersonated)', action: 'Deleted Vehicle', target: 'Dacia Logan #12', time: '15m ago', type: 'DANGER' },
    { id: 3, actor: 'SuperAdmin', action: 'Changed Subscription', target: 'Sahara Fleet (PRO -> BIZ)', time: '1h ago', type: 'FINANCE' },
    { id: 4, actor: 'System', action: 'Global Backup Completed', target: 'PostgreSQL Root', time: '3h ago', type: 'SUCCESS' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">Audit Logs</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">Platform Forensic Trace & History</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Search Logs
          </Button>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </header>

      <Card padding="none" className="overflow-hidden">
        <div className="divide-y divide-white/5">
          {logs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-white/5 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  log.type === 'DANGER' ? 'bg-danger/10 text-danger' : 
                  log.type === 'SUCCESS' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                )}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{log.actor}</span>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">—</span>
                    <span className="text-sm font-medium text-white/60">{log.action}</span>
                  </div>
                  <p className="text-[10px] font-bold text-primary/60 uppercase mt-0.5 tracking-tight">Target: {log.target}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-bold text-white/40">{log.time}</p>
                  <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">Audited Trace</p>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  View Diff
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" size="sm">Load Older Logs</Button>
      </div>
    </div>
  );
}
