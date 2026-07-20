"use client";

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

/* Semantic tints for event types — violet reserved for finance/data events. */
const TYPE_TINT: Record<string, string> = {
  DANGER: 'bg-danger/10 text-danger',
  SUCCESS: 'bg-success/10 text-success',
  FINANCE: 'bg-primary/10 text-primary',
  SYSTEM: 'bg-info/10 text-info',
};

export default function AuditLogs() {
  const t = useTranslations('adminPages');
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
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('auditLogs')}</h1>
          <p className="text-sm text-text-muted mt-1">Platform forensic trace and history</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Search className="w-4 h-4 me-2" />
            Search Logs
          </Button>
          <Button variant="outline">
            <Filter className="w-4 h-4 me-2" />
            Filter
          </Button>
        </div>
      </header>

      <Card padding="none" className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-hairline">
              <TableHead className="eyebrow text-start ps-6 pe-2 h-11">Trace</TableHead>
              <TableHead className="eyebrow text-start px-2 h-11">Actor</TableHead>
              <TableHead className="eyebrow text-start px-2 h-11">Action</TableHead>
              <TableHead className="eyebrow text-start px-2 h-11">Target</TableHead>
              <TableHead className="eyebrow text-start px-2 h-11">Type</TableHead>
              <TableHead className="eyebrow text-start px-2 h-11">Time</TableHead>
              <TableHead className="h-11 pe-6"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="group border-hairline">
                <TableCell className="ps-6 pe-2 py-3 font-mono tabular text-xs text-text-faint">
                  #{String(log.id).padStart(4, '0')}
                </TableCell>
                <TableCell className="px-2 py-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={log.actor} size={24} />
                    <span className="text-[13px] font-medium text-foreground">{log.actor}</span>
                  </span>
                </TableCell>
                <TableCell className="px-2 py-3 text-[13px] text-text-muted">{log.action}</TableCell>
                <TableCell className="px-2 py-3 text-[13px] text-text-muted">{log.target}</TableCell>
                <TableCell className="px-2 py-3">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                    TYPE_TINT[log.type] ?? 'bg-surface-raised text-text-muted'
                  )}>
                    {log.type}
                  </span>
                </TableCell>
                <TableCell className="px-2 py-3 font-mono tabular text-xs text-text-muted">{log.time}</TableCell>
                <TableCell className="pe-6 py-3 text-end">
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    View Diff
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" size="sm">Load Older Logs</Button>
      </div>
    </div>
  );
}
