'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  Download, 
  PieChart, 
  Activity, 
  ChevronRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';

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
  }
];

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && progress < 100) {
      interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 15;
          return next > 100 ? 100 : next;
        });
      }, 400);
    } else if (progress >= 100) {
      setTimeout(() => {
        setIsGenerating(false);
        setCompleted(true);
        setTimeout(() => setCompleted(false), 3000);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, progress]);

  const handleGenerate = (id: string) => {
    setSelectedReport(id);
    setProgress(0);
    setIsGenerating(true);
    setCompleted(false);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Intelligence hub</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Report factory</h1>
        <p className="text-sm text-text-muted max-w-2xl">
          Generate business audits and institutional reports from your live ERP data.
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
            <Card
              className="group cursor-pointer h-full flex flex-col"
              padding="lg"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-500">
                <report.icon className="w-6 h-6 text-text-muted" strokeWidth={1.5} />
              </div>

              <div className="space-y-2 flex-grow">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">{report.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {report.description}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-hairline flex items-center justify-between">
                <Badge variant="outline">Ready</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-0 h-auto group-hover:text-primary transition-colors"
                  onClick={() => handleGenerate(report.id)}
                >
                  <span className="me-2">Generate</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-md"
          >
            <Card className="w-full max-w-md" padding="lg">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-hairline flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 rounded-full border-t-4 border-primary"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <FileText className="w-10 h-10 text-text-muted" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -end-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <Badge>Processing</Badge>
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">Generating report</h2>
                  <p className="eyebrow">
                    Assembling {REPORTS.find(r => r.id === selectedReport)?.title}
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <div className="flex justify-between eyebrow">
                    <span>Compiling data</span>
                    <span className="font-mono tabular">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 py-2 px-4 rounded-lg bg-surface border border-hairline w-full overflow-hidden">
                   <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full bg-surface-raised border-2 border-background flex items-center justify-center">
                           <div className="w-3 h-3 rounded-full bg-text-faint/40" />
                        </div>
                      ))}
                   </div>
                   <p className="eyebrow">Finalizing report layers</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {completed && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 end-8 z-50"
          >
            <div className="glass px-6 py-4 rounded-2xl flex items-center gap-4 border border-success/30 shadow-soft">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Report generated</span>
                <span className="text-xs text-text-muted">Your report is ready to download.</span>
              </div>
              <Button size="sm" className="ms-4">
                <Download className="w-3 h-3 me-2" />
                Download
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        <Card className="lg:col-span-2">
          <CardHeader>
             <div>
               <CardTitle>Recent generation history</CardTitle>
               <CardDescription>Your last generated reports</CardDescription>
             </div>
             <Button variant="ghost" size="sm">View all</Button>
          </CardHeader>
          <div className="space-y-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-surface-raised transition-colors border border-transparent">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-raised flex items-center justify-center">
                       <FileText className="w-5 h-5 text-text-muted" />
                    </div>
                    <div>
                       <div className="text-sm font-medium text-foreground">Q{i} P&amp;L statement</div>
                       <div className="text-xs text-text-faint">2 days ago • <span className="font-mono tabular">14.2 MB</span> • PDF</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <Badge variant="outline">Owner access</Badge>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                       <Download className="w-4 h-4 text-text-faint" />
                    </Button>
                 </div>
               </div>
             ))}
          </div>
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
            <Button className="w-full">Configure schedule</Button>
            <div className="pt-4 border-t border-hairline">
              <div className="flex justify-between items-center mb-2">
                <span className="eyebrow">Board members</span>
                <span className="eyebrow text-text-muted">3 active</span>
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <Avatar key={i} name="" size={32} className="ring-2 ring-background" />
                ))}
                <div className="w-8 h-8 rounded-full bg-surface-raised border-2 border-background flex items-center justify-center text-xs font-medium text-text-faint">+</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
