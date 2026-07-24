'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  ShieldCheck,
  Activity,
  FileText,
  PieChart,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';

const REPORTS = [
  {
    id: 'pl-statement',
    title: 'P&L statement',
    description: 'A clear view of revenue, COGS and operating expenses.',
    icon: TrendingUp,
  },
  {
    id: 'fleet-depreciation',
    title: 'Fleet depreciation',
    description: 'Asset value tracking and tax-ready depreciation.',
    icon: Activity,
  },
  {
    id: 'staff-efficiency',
    title: 'Staff efficiency',
    description: 'Productivity metrics and KPI summaries per team member.',
    icon: Users,
  },
  {
    id: 'compliance-audit',
    title: 'Compliance audit',
    description: 'Regulatory check for fleet documents and legal liability.',
    icon: ShieldCheck,
  },
];

/**
 * Report generation has no backend at all yet (no endpoint assembles a P&L
 * statement, depreciation schedule, staff KPI summary, or compliance audit,
 * and there's nowhere real PDFs would be stored to list a history from).
 * This used to fake a progress bar + a "Report generated" card with a
 * Download button that did nothing — same honesty bar as the Hub page's
 * "My fleet listings" tab: say so plainly rather than fabricate it.
 */
export default function ReportsPage() {
  const t = useTranslations('ownerPages');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Intelligence hub</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('reportFactory')}</h1>
        <p className="text-sm text-text-muted max-w-2xl">
          Institutional reports generated from your live ERP data — coming soon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {REPORTS.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full flex flex-col opacity-80" padding="lg">
              <div className="w-12 h-12 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center mb-4">
                <report.icon className="w-6 h-6 text-text-muted" strokeWidth={1.5} />
              </div>

              <div className="space-y-2 flex-grow">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">{report.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {report.description}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-hairline">
                <Badge variant="outline">Not available yet</Badge>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent generation history</CardTitle>
              <CardDescription>Your last generated reports</CardDescription>
            </div>
          </CardHeader>
          <EmptyState
            icon={FileText}
            title="Not available yet"
            description="No report has ever been generated for real — there's no backend endpoint to assemble one yet, and nowhere a real file would be stored to list here."
          />
        </Card>

        <Card>
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center">
              <PieChart className="w-6 h-6 text-text-muted" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">Automated scheduling</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Configure institutional reports to be automatically delivered to your stakeholder board every month.
              </p>
            </div>
            <Badge variant="outline">Not available yet</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
