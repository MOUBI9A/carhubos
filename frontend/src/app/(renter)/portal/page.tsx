"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  ShieldCheck, 
  QrCode, 
  Car, 
  History, 
  Upload,
  CheckCircle2,
  AlertCircle,
  Zap,
  Info,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';

export default function RenterPortal() {
  const { showToast } = useToast();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form State
  const [docs, setDocs] = useState([
    { type: 'Driving License', status: 'VERIFIED', icon: CheckCircle2, color: 'text-success' },
    { type: 'National ID (CIN)', status: 'VERIFIED', icon: CheckCircle2, color: 'text-success' },
    { type: 'Passport', status: 'OPTIONAL', icon: Upload, color: 'text-white/40' },
    { type: 'Proof of Address', status: 'REQUIRED', icon: AlertCircle, color: 'text-danger' },
  ]);

  const handleDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Upload Successful', 'Document sent to verification queue.');
    setIsUploadModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase tracking-tight">My Digital Vault</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
             Fider Verified Alpha
          </p>
        </div>
        <Button onClick={() => setIsQrModalOpen(true)}>
          <QrCode className="w-4 h-4 mr-2" />
          My Badge
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Verification Card */}
        <Card className="md:col-span-1 bg-primary/5 border-primary/20 relative overflow-hidden group shadow-2xl">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="flex flex-col items-center text-center p-4 relative z-10">
            <div className="w-24 h-24 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-xl">
              <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Verified Elite</h2>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-2 mb-8 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Trust Level: 98/100</p>
            
            <div className="w-full bg-white/[0.03] p-6 rounded-3xl border border-white/5 backdrop-blur-sm group-hover:bg-white/[0.06] transition-all cursor-pointer shadow-inner" onClick={() => setIsQrModalOpen(true)}>
               <QrCode className="w-full aspect-square text-white opacity-20 group-hover:opacity-40 transition-opacity" />
               <p className="text-[9px] font-black text-white/20 uppercase mt-4 tracking-[0.2em]">Universal Handshake ID: CH-8829-X</p>
            </div>
          </div>
        </Card>

        {/* Documents */}
        <div className="md:col-span-2 space-y-8">
          <div>
            <CardHeader className="px-0">
               <CardTitle className="uppercase tracking-widest text-white/60">Verification Stack</CardTitle>
            </CardHeader>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {docs.map((doc, i) => (
                <Card key={i} variant="outline" className="flex items-center justify-between group hover:border-primary/50 hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => doc.status !== 'VERIFIED' && setIsUploadModalOpen(true)}>
                  <div className="flex items-center gap-4">
                     <div className={cn(
                       "w-10 h-10 rounded-xl flex items-center justify-center border",
                       doc.color.replace('text', 'bg').replace('/40', '/10') + "/10",
                       doc.color.replace('text', 'border') + "/20"
                     )}>
                        <doc.icon className={cn("w-5 h-5", doc.color)} />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">{doc.type}</p>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest", doc.color)}>{doc.status}</p>
                     </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-all group-hover:translate-x-1" />
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <CardHeader className="px-0">
              <CardTitle className="uppercase tracking-widest text-white/60">Loyalty Status</CardTitle>
            </CardHeader>
            <Card className="bg-emerald-500/5 border-emerald-500/20 group cursor-pointer overflow-hidden">
               <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                        <Zap className="w-6 h-6 text-success animate-pulse" />
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Road to Platinum</h4>
                        <p className="text-xs text-white/40 font-medium">1 more rental to unlock 10% lifetime discount</p>
                     </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-auto py-1 text-[9px] font-black tracking-widest text-success border border-success/20">VIEW REWARDS</Button>
               </div>
               <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-success w-[75%] shadow-[0_0_12px_rgba(34,197,94,0.4)]" />
               </div>
            </Card>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Universal Handshake"
        description="Show this to the agent for instant booking"
      >
        <div className="space-y-8 flex flex-col items-center">
           <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl">
              <QrCode className="w-64 h-64 text-background" strokeWidth={1.5} />
           </div>
           <div className="text-center space-y-2">
              <p className="text-lg font-black text-white uppercase tracking-tighter">Ahmed Renter</p>
              <p className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Verified Alpha Profile</p>
           </div>
           <div className="w-full p-4 glass rounded-2xl border-white/10 flex items-center gap-4">
              <Info className="w-5 h-5 text-white/40" />
              <p className="text-[10px] font-medium text-white/60 leading-relaxed uppercase tracking-wider">This badge expires in 5 minutes for security. Dynamic refresh enabled.</p>
           </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Verification Doc"
        description="AES-256 Cloud Encrypted Tunnel"
      >
        <form onSubmit={handleDocUpload} className="space-y-6">
           <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-12 text-center hover:border-primary/50 transition-all cursor-pointer group">
              <Upload className="w-10 h-10 text-white/20 mx-auto mb-4 group-hover:text-primary transition-all group-hover:-translate-y-1" />
              <p className="text-sm font-black text-white uppercase tracking-tighter">Drop File or Capture Photo</p>
              <p className="text-[10px] font-bold text-white/20 uppercase mt-2 tracking-widest">Supported: PDF, PNG, JPG (Max 10MB)</p>
           </div>
           <div className="p-5 glass rounded-2xl border-primary/20 bg-primary/[0.03] flex items-center gap-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <p className="text-[10px] font-bold text-white/60 uppercase leading-relaxed tracking-wide">Document will be manually audited by our compliance team within 2 hours.</p>
           </div>
           <Button type="submit" className="w-full py-4 font-black uppercase tracking-widest">Sync to Vault</Button>
        </form>
      </Modal>
    </div>
  );
}
