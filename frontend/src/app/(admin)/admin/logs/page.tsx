"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { AlertTriangle, History, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';

interface PlatformAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  agency: { id: string; name: string } | null;
  actor: { id: string; name: string; role: string };
}

/* Tint derived from the real action string — not an invented taxonomy.
   Destructive/impersonation actions read as a warning; creations as neutral
   success; everything else (provisioning, subscription changes) as system. */
function tintFor(action: string): string {
  if (action.includes('DELETE') || action.includes('IMPERSONATE') || action.includes('BLACKLIST')) {
    return 'bg-danger/10 text-danger';
  }
  if (action.startsWith('CREATE')) {
    return 'bg-success/10 text-success';
  }
  return 'bg-info/10 text-info';
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const t = useTranslations('adminPages');
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setIsLoadingMore(true); else setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/saas-admin/audit-logs', {
        params: { page: targetPage, pageSize: PAGE_SIZE },
      });
      setLogs((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load the audit trail.');
    } finally {
      if (append) setIsLoadingMore(false); else setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, false);
  }, [load]);

  const hasMore = logs.length < total;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('auditLogs')}</h1>
          <p className="text-sm text-text-muted mt-1">Platform forensic trace and history</p>
        </div>
        <Button variant="outline" onClick={() => load(1, false)} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 me-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </header>

      {error ? (
        <Card className="flex items-center gap-3 border-danger/30 bg-danger/5">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : isLoading ? (
        <Card padding="none" className="overflow-hidden">
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title="No audit activity yet"
            description="Platform-wide events (provisioning, impersonation, blacklist actions, bookings) will appear here as they happen."
          />
        </Card>
      ) : (
        <>
          <Card padding="none" className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-hairline">
                  <TableHead className="eyebrow text-start ps-6 pe-2 h-11">Actor</TableHead>
                  <TableHead className="eyebrow text-start px-2 h-11">Action</TableHead>
                  <TableHead className="eyebrow text-start px-2 h-11">Agency</TableHead>
                  <TableHead className="eyebrow text-start px-2 h-11">Type</TableHead>
                  <TableHead className="eyebrow text-start px-2 h-11 pe-6">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-hairline">
                    <TableCell className="ps-6 pe-2 py-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={log.actor.name} size={24} />
                        <span className="text-[13px] font-medium text-foreground">{log.actor.name}</span>
                        <span className="text-[11px] text-text-faint">({log.actor.role})</span>
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-[13px] text-text-muted font-mono tabular">
                      {log.action.replace(/_/g, ' ').toLowerCase()}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-[13px] text-text-muted">
                      {log.agency?.name ?? '—'}
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', tintFor(log.action))}>
                        {log.entityType}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-3 pe-6 font-mono tabular text-xs text-text-muted">
                      {formatRelative(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => load(page + 1, true)} disabled={isLoadingMore}>
                {isLoadingMore ? 'Loading…' : 'Load Older Logs'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
