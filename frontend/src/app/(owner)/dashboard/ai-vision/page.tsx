"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Scan, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  BrainCircuit, 
  Maximize2,
  Camera,
  History,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

export default function AiVision() {
  const { showToast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setActiveAnalysis(null);
    }
  };

  const startAnalysis = async () => {
    if (!selectedFile) {
      showToast('info', 'No Image', 'Please capture or upload a vehicle photo first.');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    // Simulated UI progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => Math.min(prev + 5, 95));
    }, 100);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('carId', '1-A-2024'); // Defaulting for demo

      const response = await api.post('/ai-vision/analyze', formData);
      const result = response.data;
      
      clearInterval(progressInterval);
      setScanProgress(100);
      
      setTimeout(() => {
        setIsScanning(false);
        setActiveAnalysis(result);
        showToast('success', 'Neural Scan Complete', `Detected ${result.detections.length} anomalies with ${result.integrityScore}% integrity.`);
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      setIsScanning(false);
      showToast('danger', 'Inference Error', 'The Vision Transformer failed to process the request.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Neural Vision <span className="text-primary">AI</span></h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
            <BrainCircuit className="w-3 h-3 text-primary animate-pulse" />
            Vision Transformer Model v4.2 Online
          </p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            id="ai-upload" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
          <Button variant="outline" onClick={() => document.getElementById('ai-upload')?.click()}>
            <Camera className="w-4 h-4 mr-2" />
            Capture Image
          </Button>
          <Button onClick={startAnalysis} disabled={isScanning || !selectedFile}>
            <Scan className="w-4 h-4 mr-2" />
            Initialize Scan
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Scanner View */}
        <div className="lg:col-span-8 space-y-6">
           <Card padding="none" className="relative aspect-video overflow-hidden group bg-black/40 border-white/5 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
              
              {/* Car Image Preview */}
              <div className="absolute inset-0 flex items-center justify-center">
                 {previewUrl ? (
                   <img src={previewUrl} alt="Vehicle Preview" className="w-full h-full object-cover opacity-60" />
                 ) : (
                   <>
                     <div className="text-[120px] filter blur-sm grayscale opacity-20">🚗</div>
                     <p className="absolute text-[10px] font-black text-white/10 uppercase tracking-[1em] select-none">Waiting for Visual Feed</p>
                   </>
                 )}
              </div>

              {/* Scanning Overlay */}
              <AnimatePresence>
                {isScanning && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute inset-0 z-20"
                   >
                      <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(168,85,247,1)] z-30" style={{ top: `${scanProgress}%` }} />
                      <div className="absolute inset-0 bg-primary/5 backdrop-grayscale-[0.5]" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                         <p className="text-4xl font-black text-white italic tracking-tighter">{scanProgress}%</p>
                         <p className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] mt-2">Analyzing Geometry</p>
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>

              {/* Detection Markers */}
              {activeAnalysis && !isScanning && activeAnalysis.detections.map((dmg: any, i: number) => (
                <div 
                  key={i}
                  className={cn(
                    "absolute border-2 animate-pulse z-30 flex items-center justify-center rounded-lg",
                    dmg.severity === 'MEDIUM' ? 'border-amber-500' : 'border-danger'
                  )}
                  style={{ 
                    left: `${(dmg.coordinates.x / 800) * 100}%`, 
                    top: `${(dmg.coordinates.y / 450) * 100}%`,
                    width: '60px',
                    height: '60px'
                  }}
                >
                   <span className={cn(
                     "text-[8px] font-black px-1 rounded uppercase",
                     dmg.severity === 'MEDIUM' ? 'text-amber-500 bg-amber-500/10' : 'text-danger bg-danger/10'
                   )}>{dmg.type}</span>
                </div>
              ))}

              <div className="absolute bottom-6 left-6 z-20">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20 backdrop-blur-md">
                       <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-white uppercase tracking-widest">Asset Identification</p>
                       <p className="text-sm font-bold text-white/60">Dacia Logan • PL-12345-A-1</p>
                    </div>
                 </div>
              </div>
           </Card>

           <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} variant="flat" className="aspect-square flex items-center justify-center group cursor-pointer hover:bg-white/5 transition-all border border-white/5">
                   <Maximize2 className="w-4 h-4 text-white/10 group-hover:text-primary transition-all" />
                </Card>
              ))}
           </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="border-white/5 shadow-2xl">
              <CardHeader>
                 <CardTitle className="uppercase tracking-tighter italic">Analysis Results</CardTitle>
              </CardHeader>
              <div className="space-y-6">
                 {activeAnalysis ? (
                    <>
                      {activeAnalysis.detections.map((dmg: any, i: number) => (
                         <div key={i} className="p-4 glass rounded-2xl border-white/5 space-y-3">
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", dmg.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-danger')} />
                                  <span className="text-xs font-black text-white uppercase tracking-tight">{dmg.type}</span>
                               </div>
                               <span className="text-[9px] font-black text-white/20 uppercase bg-white/5 px-2 py-0.5 rounded">{Math.round(dmg.confidence * 100)}% CONF</span>
                            </div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{dmg.location}</p>
                            <Button variant="ghost" size="sm" className="w-full h-8 text-[9px] font-black tracking-widest">Mark for Repair</Button>
                         </div>
                      ))}
                      <div className="pt-4 border-t border-white/5">
                         <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                            <span className="text-white/20">Overall Integrity</span>
                            <span className={cn(activeAnalysis.integrityScore < 80 ? "text-danger" : "text-success")}>{activeAnalysis.integrityScore}%</span>
                         </div>
                         <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", activeAnalysis.integrityScore < 80 ? "bg-danger" : "bg-success")} style={{ width: `${activeAnalysis.integrityScore}%` }} />
                         </div>
                      </div>
                    </>
                 ) : (
                    <div className="py-12 text-center">
                       <BrainCircuit className="w-12 h-12 text-white/5 mx-auto mb-4" />
                       <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No Active Inference</p>
                    </div>
                 )}
              </div>
           </Card>

           <Card className="bg-primary/5 border-primary/20">
              <CardTitle className="text-primary text-[10px] uppercase tracking-[0.2em] mb-4">Neural Log</CardTitle>
              <div className="space-y-4">
                 {[
                   { event: 'Geometry Scan Success', time: '1m ago' },
                   { event: 'Comparing vs Base Mesh', time: '2m ago' },
                   { event: 'Depth Mapping Active', time: 'Now' },
                 ].map((log, i) => (
                   <div key={i} className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                      <span className="text-white/60">{log.event}</span>
                      <span className="text-white/20">{log.time}</span>
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
