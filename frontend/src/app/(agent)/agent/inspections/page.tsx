"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  CheckCircle2, 
  Camera, 
  ShieldCheck, 
  History, 
  ArrowRight,
  Zap,
  Info,
  Car as CarIcon,
  Plus,
  Trash2,
  FileText,
  AlertTriangle
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';

export default function Inspections() {
  const { showToast } = useToast();
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const [inspections, setInspections] = useState([
    { id: 1, car: 'Dacia Logan', plate: '12345-A-1', type: 'PRE-RENTAL', status: 'COMPLETED', time: '10:15 AM', agent: 'Khalid', damages: 0 },
    { id: 2, car: 'Renault Clio', plate: '98765-B-4', type: 'POST-RENTAL', status: 'PENDING', time: 'Due Now', agent: 'Sarah', damages: 2 },
  ]);

  const handleStartInspection = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Form Initialized', 'Visual audit protocol started for asset.');
    setIsInspectionModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase tracking-tight">Asset Health Checks</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">Forensic Quality Control & Damage Registry</p>
        </div>
        <Button onClick={() => setIsInspectionModalOpen(true)}>
          <Camera className="w-4 h-4 mr-2" />
          Initialize Check
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="flat" className="p-4 text-center group hover:bg-primary/5 transition-colors border border-white/5 cursor-pointer">
           <p className="text-2xl font-black text-white">{inspections.length}</p>
           <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Total Logs</p>
        </Card>
        <Card variant="flat" className="p-4 text-center group hover:bg-success/5 transition-colors border border-white/5 cursor-pointer">
           <p className="text-2xl font-black text-success">1</p>
           <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Clean Status</p>
        </Card>
        <Card variant="flat" className="p-4 text-center ring-1 ring-danger/20 bg-danger/5 group hover:bg-danger/10 transition-colors cursor-pointer">
           <p className="text-2xl font-black text-danger">1</p>
           <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Damage Alerts</p>
        </Card>
        <Card variant="flat" className="p-4 text-center group hover:bg-white/10 transition-colors border border-white/5 cursor-pointer">
           <p className="text-2xl font-black text-primary">12m</p>
           <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Avg Lead Time</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <CardHeader className="px-0">
          <CardTitle>Digital Audit Registry</CardTitle>
        </CardHeader>
        
        {inspections.map((item) => (
          <Card key={item.id} variant="outline" className="flex items-center justify-between group hover:border-primary/50 transition-all">
            <div className="flex items-center gap-6">
               <div className={cn(
                 "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 border",
                 item.status === 'COMPLETED' ? 'bg-success/10 text-success border-success/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
               )}>
                 <ShieldCheck className="w-6 h-6" />
               </div>
               <div>
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-white uppercase tracking-tight">{item.car}</h4>
                    <span className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded-sm tracking-widest text-white/40">{item.plate}</span>
                  </div>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-tight mt-0.5">{item.type} • Agent: {item.agent}</p>
               </div>
            </div>

            <div className="flex items-center gap-8">
               {item.damages > 0 && (
                 <div className="hidden lg:flex items-center gap-2 bg-danger/10 px-3 py-1 rounded-full border border-danger/20">
                    <AlertTriangle className="w-3 h-3 text-danger" />
                    <span className="text-[9px] font-black text-danger uppercase">{item.damages} DAMAGES</span>
                 </div>
               )}
               <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Validity</p>
                  <p className={cn(
                    "text-xs font-bold",
                    item.status === 'COMPLETED' ? 'text-success' : 'text-amber-500'
                  )}>{item.status}</p>
               </div>
               <Button size="sm" variant={item.status === 'COMPLETED' ? 'outline' : 'primary'} onClick={() => item.status === 'COMPLETED' ? setSelectedReport(item) : showToast('info', 'Resuming Form', 'Loading cached visual data...')}>
                  {item.status === 'COMPLETED' ? 'Review Trace' : 'Resume'}
                  <ArrowRight className="ml-2 w-3 h-3" />
               </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
         <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
               <CardTitle className="text-primary text-xs uppercase">Quality Control Protocol</CardTitle>
               <p className="text-[11px] text-white/60 leading-relaxed mt-1 italic">
                 "Digital inspections with biometric verification protect agency assets. Ensure 360° coverage for every checkout to automate insurance claims."
               </p>
            </div>
         </div>
      </Card>

      {/* Inspection Modal */}
      <Modal
        isOpen={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        title="Initialize Visual Audit"
        description="Select vehicle and check type"
      >
        <form onSubmit={handleStartInspection} className="space-y-6">
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Target Asset</p>
              <div className="relative">
                 <CarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                 <select required className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-white outline-none appearance-none focus:border-primary transition-colors">
                    <option>Dacia Logan (12345-A-1)</option>
                    <option>Renault Clio (98765-B-4)</option>
                    <option>Range Rover (55555-D-7)</option>
                 </select>
              </div>
           </div>
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Audit Protocol</p>
              <div className="grid grid-cols-2 gap-4">
                 <label className="cursor-pointer group">
                    <input type="radio" name="checkType" value="PRE" defaultChecked className="sr-only peer" />
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-center peer-checked:border-primary peer-checked:bg-primary/10 transition-all group-hover:border-white/20">
                       <h5 className="text-xs font-black text-white uppercase">Pre-Rental</h5>
                       <p className="text-[9px] text-white/40 mt-1 uppercase font-bold">Checkout</p>
                    </div>
                 </label>
                 <label className="cursor-pointer group">
                    <input type="radio" name="checkType" value="POST" className="sr-only peer" />
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-center peer-checked:border-primary peer-checked:bg-primary/10 transition-all group-hover:border-white/20">
                       <h5 className="text-xs font-black text-white uppercase">Post-Rental</h5>
                       <p className="text-[9px] text-white/40 mt-1 uppercase font-bold">Check-in</p>
                    </div>
                 </label>
              </div>
           </div>
           <div className="p-4 glass-card border-primary/20 flex items-center gap-3">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-bold text-white/60 uppercase">GPS tagging and temporal watermarking will be enabled.</p>
           </div>
           <Button type="submit" className="w-full">Launch Forensic Form</Button>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Inspection Review"
        description={`${selectedReport?.car} • ${selectedReport?.type}`}
      >
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="aspect-video bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
                   <Camera className="w-6 h-6 text-white/5" />
                </div>
              ))}
           </div>
           <div className="p-4 glass-card border-white/10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Internal Note</p>
              <p className="text-xs text-white/80 leading-relaxed font-medium">Vehicle returned in pristine condition. All safety equipment verified. Fuel level: 8/8.</p>
           </div>
           <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedReport(null)}>Close</Button>
              <Button className="flex-1">
                 <FileText className="w-4 h-4 mr-2" />
                 Get PDF Report
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );
}
