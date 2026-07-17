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

const REPORTS = [
  {
    id: 'pl-statement',
    title: 'P&L Statement',
    description: 'Deep dive into revenue, COGS, and operational expenses.',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    id: 'fleet-depreciation',
    title: 'Fleet Depreciation',
    description: 'Real-time asset value tracking and forensic tax mapping.',
    icon: Activity,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    id: 'staff-efficiency',
    title: 'Staff Efficiency',
    description: 'Granular productivity metrics and KPI audit reports.',
    icon: Users,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    id: 'compliance-audit',
    title: 'Compliance Audit',
    description: 'Regulatory check for fleet documents and legal liability.',
    icon: ShieldCheck,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
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
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 bg-primary rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Intelligence Hub</span>
        </div>
        <h1 className="text-4xl">Institutional <span className="text-white/40">Report Factory</span></h1>
        <p className="text-white/40 text-sm max-w-2xl font-medium">
          Generate high-fidelity business audits and institutional reports. 
          Our forensic engine processes real-time ERP data for deep strategic insights.
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
              className="relative overflow-hidden group cursor-pointer hover:border-primary/30 h-full flex flex-col"
              padding="lg"
            >
              <div className={`w-12 h-12 rounded-xl ${report.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                <report.icon className={`w-6 h-6 ${report.color}`} />
              </div>
              
              <div className="space-y-2 flex-grow">
                <h3 className="text-lg font-black">{report.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed font-medium italic">
                  "{report.description}"
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <Badge variant="outline" className="bg-white/5 border-none text-[9px] uppercase tracking-tighter">Forensic Ready</Badge>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="p-0 h-auto group-hover:text-primary transition-colors"
                  onClick={() => handleGenerate(report.id)}
                >
                  <span className="mr-2">Generate</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Decorative background element */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none">
                <report.icon size={120} />
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <Card className="w-full max-w-md border-primary/20 bg-card/80 shadow-2xl shadow-primary/10" padding="lg">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                    <motion.div 
                      className="absolute inset-0 rounded-full border-t-4 border-primary"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <motion.div 
                    className="absolute -top-1 -right-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <div className="bg-primary px-2 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-lg">Processing</div>
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl">Institutional <span className="text-primary">PDF</span> Factory</h2>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
                    Assembling Forensic Audit: {REPORTS.find(r => r.id === selectedReport)?.title}
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-white/40">
                    <span>Compiling Data</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 py-2 px-4 rounded-lg bg-white/5 border border-white/5 w-full overflow-hidden">
                   <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#050505] flex items-center justify-center">
                           <div className="w-3 h-3 rounded-full bg-primary/40 animate-pulse" />
                        </div>
                      ))}
                   </div>
                   <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Encrypting report layers...</p>
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
            className="fixed bottom-8 right-8 z-50"
          >
            <div className="glass px-6 py-4 rounded-2xl flex items-center gap-4 border-emerald-500/30 shadow-2xl shadow-emerald-500/10">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase text-white">Report Generated</span>
                <span className="text-[10px] text-white/40 font-medium">Institutional audit is ready for download.</span>
              </div>
              <Button size="sm" className="ml-4 bg-emerald-500 hover:bg-emerald-600">
                <Download className="w-3 h-3 mr-2" />
                Download
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        <Card className="lg:col-span-2 border-white/5" variant="flat">
          <CardHeader>
             <div>
               <CardTitle>Recent Generation History</CardTitle>
               <CardDescription>Last 5 forensic audits generated</CardDescription>
             </div>
             <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <div className="space-y-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                       <FileText className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                       <div className="text-xs font-black uppercase tracking-tight">Q{i} Forensic P&L Audit</div>
                       <div className="text-[10px] text-white/30 font-bold">2 days ago • 14.2 MB • PDF</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] uppercase border-white/10 text-white/40">Owner Access</Badge>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                       <Download className="w-4 h-4 text-white/40" />
                    </Button>
                 </div>
               </div>
             ))}
          </div>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <PieChart className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase italic tracking-tighter">Automated Scheduling</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Configure institutional reports to be automatically delivered to your stakeholder board every month.
              </p>
            </div>
            <Button className="w-full btn-primary-infinity">Configure Schedule</Button>
            <div className="pt-4 border-t border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-white/40">Board Members</span>
                <span className="text-[10px] font-black uppercase text-primary">3 Active</span>
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#080808]" />
                ))}
                <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-[#080808] flex items-center justify-center text-[10px] font-bold">+</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
