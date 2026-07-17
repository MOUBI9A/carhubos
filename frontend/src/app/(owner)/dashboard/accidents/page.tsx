"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { 
  AlertOctagon, 
  Camera, 
  FileText, 
  Users, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Search,
  Filter,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Hammer,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';

const INITIAL_ACCIDENTS = [
  {
    id: 'ACC-2024-001',
    vehicle: 'Dacia Logan',
    plate: '12345-A-1',
    date: 'Mar 12, 2024',
    severity: 'CRITICAL',
    status: 'Investigation',
    description: 'Frontal collision at intersection. Airbags deployed.',
    claimStatus: 1, // 0: Filed, 1: Investigation, 2: Quote, 3: Payment
  },
  {
    id: 'ACC-2024-002',
    vehicle: 'Renault Clio',
    plate: '98765-B-4',
    date: 'Feb 28, 2024',
    severity: 'MEDIUM',
    status: 'Repair Quote',
    description: 'Rear bumper damage during parking maneuver.',
    claimStatus: 2,
  },
  {
    id: 'ACC-2024-003',
    vehicle: 'Hyundai i10',
    plate: '54321-C-7',
    date: 'Feb 15, 2024',
    severity: 'LOW',
    status: 'Payment',
    description: 'Scratched side door. Vandalism suspected.',
    claimStatus: 3,
  }
];

const CLAIM_STEPS = [
  { label: 'Claim Filed', icon: FileText },
  { label: 'Investigation', icon: ShieldAlert },
  { label: 'Repair Quote', icon: Hammer },
  { label: 'Payment', icon: CreditCard },
];

export default function AccidentsPage() {
  const { showToast } = useToast();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [accidents, setAccidents] = useState(INITIAL_ACCIDENTS);
  const [selectedAccident, setSelectedAccident] = useState<any>(null);

  const handleReportIncident = (e: React.FormEvent) => {
    e.preventDefault();
    const newAccident = {
      id: `ACC-2024-00${accidents.length + 1}`,
      vehicle: 'Reported Vehicle',
      plate: 'PENDING',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      severity: 'CRITICAL',
      status: 'Claim Filed',
      description: 'New incident report submitted for investigation.',
      claimStatus: 0,
    };
    setAccidents([newAccident, ...accidents]);
    setIsReportModalOpen(false);
    showToast('success', 'Protocol Initiated', 'Incident report has been serialized and dispatched.');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-success/20 text-success border-success/20';
      case 'MEDIUM': return 'bg-amber-500/20 text-amber-500 border-amber-500/20';
      case 'CRITICAL': return 'bg-danger/20 text-danger border-danger/20';
      default: return 'bg-white/10 text-white border-white/10';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Accident Dossier</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
          <ShieldAlert className="w-3 h-3 text-danger" />
          Active Incident Protocols: {accidents.length}
          </p>
          </div>
          <Button onClick={() => setIsReportModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Report New Incident
          </Button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Incident List */}
          <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-4">
           <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input className="w-full bg-white/5 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white outline-none focus:border-primary/50 transition-all uppercase tracking-widest" placeholder="Search Dossier..." />
           </div>
           <Button variant="ghost" size="sm" className="ml-4">
              <Filter className="w-4 h-4 mr-2" />
              Filter
           </Button>
          </div>

          {accidents.map((accident) => (

            <Card 
              key={accident.id} 
              className={cn(
                "group cursor-pointer hover:ring-1 ring-white/10 transition-all overflow-hidden",
                selectedAccident?.id === accident.id && "ring-primary/50 bg-primary/[0.02]"
              )}
              onClick={() => setSelectedAccident(accident)}
            >
              <div className="p-6 flex items-center gap-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-500",
                  getSeverityColor(accident.severity)
                )}>
                  <AlertOctagon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">{accident.vehicle}</h3>
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-[0.2em] py-0", getSeverityColor(accident.severity))}>
                      {accident.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black text-white/40 uppercase tracking-widest">
                    <span>{accident.plate}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{accident.date}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{accident.status}</p>
                   <ChevronRight className="w-4 h-4 text-white/20 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Claim Tracker Panel */}
        <div className="lg:col-span-5">
           {selectedAccident ? (
             <Card className="sticky top-24 border-primary/20 bg-primary/[0.02] animate-in fade-in slide-in-from-right-4 duration-500">
                <CardHeader>
                   <div className="flex justify-between items-start mb-6">
                      <div>
                         <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">{selectedAccident.id}</CardTitle>
                         <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-primary">Protocol Active</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-[9px] uppercase font-black" onClick={() => showToast('info', 'Exporting...', 'Generating incident dossier PDF.')}>Export PDF</Button>
                   </div>
                   
                   <p className="text-sm font-bold text-white/70 leading-relaxed mb-8 border-l-2 border-primary/30 pl-4 py-1 italic">
                     "{selectedAccident.description}"
                   </p>

                   <div className="space-y-8">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Insurance Claim Progress</h4>
                      
                      <div className="relative">
                         {/* Progress Line */}
                         <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-white/5" />
                         <div 
                           className="absolute left-[19px] top-0 w-[2px] bg-primary transition-all duration-1000" 
                           style={{ height: `${(selectedAccident.claimStatus / (CLAIM_STEPS.length - 1)) * 100}%` }}
                         />

                         <div className="space-y-10 relative">
                            {CLAIM_STEPS.map((step, idx) => {
                               const isActive = idx <= selectedAccident.claimStatus;
                               const isCurrent = idx === selectedAccident.claimStatus;
                               const StepIcon = step.icon;
                               
                               return (
                                 <div key={idx} className="flex items-center gap-6">
                                    <div className={cn(
                                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
                                      isActive ? "bg-primary border-primary shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-black border-white/10 text-white/20"
                                    )}>
                                       {isActive && !isCurrent ? (
                                         <CheckCircle2 className="w-5 h-5 text-white" />
                                       ) : (
                                         <StepIcon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/20")} />
                                       )}
                                    </div>
                                    <div className="flex-1">
                                       <p className={cn(
                                         "text-[11px] font-black uppercase tracking-[0.2em]",
                                         isActive ? "text-white" : "text-white/20"
                                       )}>
                                         {step.label}
                                       </p>
                                       {isCurrent && (
                                         <p className="text-[9px] font-bold text-primary uppercase mt-0.5 animate-pulse">Action Required</p>
                                       )}
                                    </div>
                                 </div>
                               );
                            })}
                         </div>
                      </div>
                   </div>

                   <div className="mt-12 space-y-3">
                      <Button className="w-full py-6 group">
                        Update Claim Status
                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                      <Button variant="ghost" className="w-full text-white/40 text-[10px] font-black uppercase tracking-widest">Mark as Resolved</Button>
                   </div>
                </CardHeader>
             </Card>
           ) : (
             <div className="h-full min-h-[400px] rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center p-8 bg-white/[0.01]">
                <ShieldCheck className="w-16 h-16 text-white/5 mb-6" />
                <h3 className="text-xl font-black text-white/20 uppercase tracking-tighter">Select an Incident</h3>
                <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] mt-2">Dossier information will be populated here</p>
             </div>
           )}
        </div>
      </div>

      {/* New Incident Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Incident Protocol"
        description="Forensic Reporting Matrix"
      >
        <div className="space-y-8">
           {/* Guided Checklist */}
           <div className="grid grid-cols-3 gap-3">
              {[
                { label: '360 Photos', icon: Camera, status: 'REQUIRED' },
                { label: 'Constat', icon: FileText, status: 'REQUIRED' },
                { label: 'Witnesses', icon: Users, status: 'OPTIONAL' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center group hover:border-primary/50 transition-all cursor-pointer">
                   <item.icon className="w-6 h-6 mx-auto mb-3 text-white/40 group-hover:text-primary transition-colors" />
                   <p className="text-[9px] font-black uppercase tracking-widest text-white mb-1">{item.label}</p>
                   <p className="text-[8px] font-bold text-white/20 uppercase">{item.status}</p>
                </div>
              ))}
           </div>

           <form className="space-y-6" onSubmit={handleReportIncident}>
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Asset in Incident</p>
                 <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white outline-none appearance-none focus:border-primary transition-all">
                    <option>Select Vehicle...</option>
                    <option>Dacia Logan (12345-A-1)</option>
                    <option>Renault Clio (98765-B-4)</option>
                 </select>
              </div>

              <div className="space-y-2">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Incident Narration</p>
                 <textarea 
                   required
                   className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all min-h-[120px]" 
                   placeholder="Describe the sequence of events..."
                 />
              </div>

              <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-start gap-4">
                 <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                 <div>
                    <p className="text-[10px] font-black text-danger uppercase tracking-widest mb-1">Guardian Alert</p>
                    <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase">Submission will trigger immediate asset lockout and insurance carrier notification.</p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <Button type="button" variant="outline" className="flex-1 py-4" onClick={() => setIsReportModalOpen(false)}>Abort</Button>
                 <Button type="submit" className="flex-1 py-4 bg-danger hover:bg-danger/80 border-none shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                   Dispatch Report
                 </Button>
              </div>
           </form>
        </div>
      </Modal>
    </div>
  );
}
