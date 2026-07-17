'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  CheckCircle2, 
  Upload, 
  Camera, 
  Fuel, 
  Gauge, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GuidedActionProps {
  task: any;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function GuidedAction({ task, isOpen, onClose, onComplete }: GuidedActionProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const renderPrepFlow = () => (
    <div className="space-y-6 py-4">
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
              <Fuel size={24} />
            </div>
            <div className="flex-1">
              <Label className="text-[10px] font-black uppercase text-slate-400">Fuel Level (8/8)</Label>
              <div className="flex gap-1 mt-2">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className={`h-6 flex-1 rounded-sm border ${i <= 6 ? 'bg-blue-500 border-blue-600' : 'bg-white border-slate-200'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
              <Gauge size={24} />
            </div>
            <div className="flex-1">
              <Label className="text-[10px] font-black uppercase text-slate-400">Current Mileage</Label>
              <Input type="number" defaultValue="12500" className="bg-white border-none font-black h-8" />
            </div>
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
          <div className="bg-slate-900 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
               <Car size={300} className="text-white" />
            </div>
            <h4 className="text-white font-black text-xs uppercase mb-4 relative z-10">Damage Visualizer</h4>
            <div className="grid grid-cols-2 gap-4 relative z-10">
               <div className="p-3 bg-white/10 border border-white/20 rounded-xl text-white text-[10px] font-bold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                  Rear Bumper Scratch
               </div>
               <div className="p-3 bg-white/10 border border-white/20 rounded-xl text-white text-[10px] font-bold flex items-center gap-2 opacity-40">
                  + Add Damage Spot
               </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[4/3] bg-slate-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-slate-400">
              <Camera size={24} />
              <span className="text-[8px] font-black uppercase mt-1">Upload Proof</span>
            </div>
            <div className="aspect-[4/3] bg-slate-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-slate-400">
              <Camera size={24} />
              <span className="text-[8px] font-black uppercase mt-1">Interior Proof</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDocsFlow = () => (
    <div className="space-y-6 py-4">
      <div className="p-8 border-2 border-dashed border-blue-200 rounded-[32px] bg-blue-50/50 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-blue-100 mb-6">
          <Upload size={32} />
        </div>
        <h4 className="font-black text-slate-900">Upload Digital Copy</h4>
        <p className="text-xs text-slate-500 max-w-[200px] mt-2 font-medium">Scan or take a photo of the Customer ID (CIN/Passport)</p>
        <Button className="mt-8 bg-slate-900 rounded-full px-8 font-black uppercase text-[10px] tracking-widest">Select Files</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-[40px] border-none shadow-2xl p-8 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              {task?.type === 'PREP' ? <Car size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <Badge className="bg-blue-600 text-white border-none text-[9px] font-black uppercase mb-1">
                Guided Action
              </Badge>
              <DialogTitle className="text-xl font-black text-slate-900 leading-tight">
                {task?.title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-slate-500 font-medium text-sm">
            Blueprint Pillar D: Guided employee workflow to ensure data integrity.
          </DialogDescription>
        </DialogHeader>

        {task?.type === 'PREP' ? renderPrepFlow() : renderDocsFlow()}

        <DialogFooter className="mt-8">
          <div className="flex items-center justify-between w-full">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
               {task?.type === 'PREP' ? `Step ${step} of 2` : 'Requirement Met'}
             </p>
             <div className="flex gap-2">
               <Button variant="ghost" onClick={onClose} className="font-bold text-slate-400">Cancel</Button>
               {task?.type === 'PREP' && step === 1 ? (
                 <Button onClick={() => setStep(2)} className="bg-blue-600 rounded-2xl px-6 font-bold group">
                   Next Step
                   <ChevronRight size={18} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                 </Button>
               ) : (
                 <Button onClick={onComplete} className="bg-slate-900 rounded-2xl px-6 font-black uppercase text-[10px] tracking-widest">
                   Confirm & Close
                 </Button>
               )}
             </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
