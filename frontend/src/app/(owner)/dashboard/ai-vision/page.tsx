"use client";

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AgencyImage } from '@/components/ui/AgencyImage';
import {
  Scan,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  Maximize2,
  Camera,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

export default function AiVision() {
  const t = useTranslations('ownerPages');
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
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('aiVision')}</h1>
          <p className="mt-1.5 flex items-center gap-2 eyebrow">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Vision model v4.2 · Online
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
            <Camera className="w-4 h-4 me-2" />
            Capture image
          </Button>
          <Button onClick={startAnalysis} disabled={isScanning || !selectedFile}>
            <Scan className="w-4 h-4 me-2" />
            Start scan
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Scanner View */}
        <div className="lg:col-span-8 space-y-6">
           <Card padding="none" className="relative aspect-video overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />

              {/* Car Image Preview */}
              <div className="absolute inset-0 flex items-center justify-center">
                 {previewUrl ? (
                   <img src={previewUrl} alt="Vehicle Preview" className="w-full h-full object-cover opacity-60" />
                 ) : (
                   <AgencyImage
                     slot="empty"
                     alt="No vehicle image captured yet"
                     fill
                     rounded="rounded-none"
                     overlay={
                       <p className="absolute inset-x-0 bottom-8 text-center text-xs font-medium text-text-faint">
                         Waiting for an image
                       </p>
                     }
                   />
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
                      <div className="absolute inset-x-0 h-0.5 bg-primary z-30" style={{ top: `${scanProgress}%` }} />
                      <div className="absolute inset-0 bg-primary/5 backdrop-grayscale-[0.5]" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                         <p className="text-4xl font-semibold tracking-tight text-foreground font-mono tabular">{scanProgress}%</p>
                         <p className="eyebrow text-primary mt-2">Analyzing geometry</p>
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
                    dmg.severity === 'MEDIUM' ? 'border-warning' : 'border-danger'
                  )}
                  style={{
                    left: `${(dmg.coordinates.x / 800) * 100}%`,
                    top: `${(dmg.coordinates.y / 450) * 100}%`,
                    width: '60px',
                    height: '60px'
                  }}
                >
                   <span className={cn(
                     "eyebrow rounded-md px-1.5 py-0.5",
                     dmg.severity === 'MEDIUM' ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10'
                   )}>{dmg.type}</span>
                </div>
              ))}

              <div className="absolute bottom-6 start-6 z-20">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-raised flex items-center justify-center border border-hairline">
                       <ShieldCheck className="w-4 h-4 text-text-muted" />
                    </div>
                    <div>
                       <p className="eyebrow">Asset identification</p>
                       <p className="mt-0.5 text-sm font-medium text-foreground">
                         Dacia Logan <span className="text-text-faint">·</span> <span className="font-mono tabular text-text-muted">PL-12345-A-1</span>
                       </p>
                    </div>
                 </div>
              </div>
           </Card>

           <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <AgencyImage
                  key={i}
                  slot="empty"
                  alt=""
                  ratio="1 / 1"
                  className="group cursor-pointer border border-hairline transition-colors hover:border-primary/30"
                  overlay={
                    <Maximize2 className="absolute inset-0 m-auto w-4 h-4 text-text-faint group-hover:text-primary transition-colors" />
                  }
                />
              ))}
           </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <Card>
              <CardHeader>
                 <CardTitle>Analysis results</CardTitle>
              </CardHeader>
              <div className="space-y-6">
                 {activeAnalysis ? (
                    <>
                      {activeAnalysis.detections.map((dmg: any, i: number) => (
                         <div key={i} className="p-4 bg-surface-raised rounded-2xl border border-hairline space-y-3">
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", dmg.severity === 'MEDIUM' ? 'bg-warning' : 'bg-danger')} />
                                  <span className="text-xs font-semibold text-foreground">{dmg.type}</span>
                               </div>
                               <span className="eyebrow rounded-md border border-hairline bg-surface px-2 py-0.5">{Math.round(dmg.confidence * 100)}% conf</span>
                            </div>
                            <p className="eyebrow">{dmg.location}</p>
                            <Button variant="ghost" size="sm" className="w-full">Mark for repair</Button>
                         </div>
                      ))}
                      <div className="pt-4 border-t border-hairline">
                         <div className="flex justify-between items-center mb-1.5">
                            <span className="eyebrow">Overall integrity</span>
                            <span className={cn("flex items-center gap-1 text-sm font-semibold font-mono tabular", activeAnalysis.integrityScore < 80 ? "text-danger" : "text-success")}>
                               {activeAnalysis.integrityScore < 80 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                               {activeAnalysis.integrityScore}%
                            </span>
                         </div>
                         <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", activeAnalysis.integrityScore < 80 ? "bg-danger" : "bg-success")} style={{ width: `${activeAnalysis.integrityScore}%` }} />
                         </div>
                      </div>
                    </>
                 ) : (
                    <div className="py-12 text-center">
                       <div className="w-14 h-14 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center mx-auto mb-4">
                          <BrainCircuit className="w-6 h-6 text-text-faint" strokeWidth={1.25} />
                       </div>
                       <p className="eyebrow">No active scan</p>
                       <p className="mt-1.5 text-xs text-text-muted max-w-[220px] mx-auto">Capture a photo and start a scan to see detected damage here.</p>
                    </div>
                 )}
              </div>
           </Card>

           <Card>
              <CardHeader>
                 <CardTitle>Neural log</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                 {[
                   { event: 'Geometry Scan Success', time: '1m ago' },
                   { event: 'Comparing vs Base Mesh', time: '2m ago' },
                   { event: 'Depth Mapping Active', time: 'Now' },
                 ].map((log, i) => (
                   <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">{log.event}</span>
                      <span className="text-text-faint">{log.time}</span>
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
