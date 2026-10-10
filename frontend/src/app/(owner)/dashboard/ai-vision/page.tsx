"use client";

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { Combobox } from '@/components/ui/Combobox';
import {
  Scan,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  Maximize2,
  Camera,
  Car,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useFleet } from '../fleet/useFleet';

type VisionDetection = {
  type: string;
  location: string;
  severity: string;
  confidence: number;
  coordinates: { x: number; y: number; width: number; height: number };
};

type VisionAnalysis = {
  carId: string;
  timestamp: string;
  integrityScore: number;
  detections: VisionDetection[];
  isSimulation?: boolean;
  model?: string;
  notice?: string;
};

export default function AiVision() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeAnalysis, setActiveAnalysis] = useState<VisionAnalysis | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCarId, setSelectedCarId] = useState('');

  const { data: fleet, isLoading: isFleetLoading } = useFleet();
  const carOptions = useMemo(
    () =>
      (fleet ?? []).map((c) => ({
        id: c.id,
        label: `${c.brand} ${c.model}`,
        sublabel: c.licensePlate,
      })),
    [fleet],
  );
  const selectedCar = useMemo(
    () => (fleet ?? []).find((c) => c.id === selectedCarId) ?? null,
    [fleet, selectedCarId],
  );

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
    if (!selectedCarId) {
      showToast('info', 'No Vehicle Selected', 'Choose which car this photo belongs to before scanning.');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    const progressInterval = setInterval(() => {
      setScanProgress((prev) => Math.min(prev + 5, 95));
    }, 100);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('carId', selectedCarId);

      const response = await api.post('/ai-vision/analyze', formData);
      const result = response.data as VisionAnalysis;

      clearInterval(progressInterval);
      setScanProgress(100);

      setTimeout(() => {
        setIsScanning(false);
        setActiveAnalysis(result);
        if (result.isSimulation) {
          showToast(
            'info',
            'Simulation Preview',
            'Preview complete. Damage detections are simulated; no live computer-vision model was used.',
          );
        } else {
          showToast(
            'success',
            'Vision Analysis Complete',
            `Detected ${result.detections.length} anomalies with ${result.integrityScore}% integrity.`,
          );
        }
      }, 500);
    } catch {
      clearInterval(progressInterval);
      setIsScanning(false);
      showToast('danger', 'Analysis Error', 'The image-analysis request could not be processed.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('aiVision')}</h1>
          <p className="mt-1.5 flex items-center gap-2 eyebrow">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Simulation preview — live computer vision is not connected
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-64">
            <Combobox
              options={carOptions}
              value={selectedCarId}
              onChange={setSelectedCarId}
              placeholder={isFleetLoading ? t('loadingVehicles') : t('selectVehicle')}
              emptyText={isFleetLoading ? t('loadingVehicles') : t('noVehiclesFleet')}
              icon={<Car className="w-4 h-4" />}
            />
          </div>
          <input
            type="file"
            id="ai-upload"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <Button variant="outline" onClick={() => document.getElementById('ai-upload')?.click()}>
            <Camera className="w-4 h-4 me-2" />
            {t('captureImage')}
          </Button>
          <Button onClick={startAnalysis} disabled={isScanning || !selectedFile || !selectedCarId}>
            <Scan className="w-4 h-4 me-2" />
            Run Preview
          </Button>
        </div>
      </header>

      {activeAnalysis?.isSimulation && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <strong>Simulation Preview.</strong>{' '}
          {activeAnalysis.notice ?? 'These detections are simulated and must not be used as a real damage assessment.'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Card padding="none" className="relative aspect-video overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
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
                      {t('waitingForImage')}
                    </p>
                  }
                />
              )}
            </div>

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
                    <p className="eyebrow text-primary mt-2">Running preview simulation</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {activeAnalysis && !isScanning && activeAnalysis.detections.map((dmg, i) => (
              <div
                key={i}
                className={cn(
                  'absolute border-2 animate-pulse z-30 flex items-center justify-center rounded-lg',
                  dmg.severity === 'MEDIUM' ? 'border-warning' : 'border-danger',
                )}
                style={{
                  left: `${(dmg.coordinates.x / 800) * 100}%`,
                  top: `${(dmg.coordinates.y / 450) * 100}%`,
                  width: '60px',
                  height: '60px',
                }}
              >
                <span
                  className={cn(
                    'eyebrow rounded-md px-1.5 py-0.5',
                    dmg.severity === 'MEDIUM' ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10',
                  )}
                >
                  {dmg.type}
                </span>
              </div>
            ))}

            {selectedCar && (
              <div className="absolute bottom-6 start-6 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-raised flex items-center justify-center border border-hairline">
                    <ShieldCheck className="w-4 h-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="eyebrow">{t('assetIdentification')}</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {selectedCar.brand} {selectedCar.model}{' '}
                      <span className="text-text-faint">·</span>{' '}
                      <span className="font-mono tabular text-text-muted">{selectedCar.licensePlate}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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

        <div className="lg:col-span-4 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('analysisResults')}</CardTitle>
            </CardHeader>
            <div className="space-y-6">
              {activeAnalysis ? (
                <>
                  {activeAnalysis.detections.map((dmg, i) => (
                    <div key={i} className="p-4 bg-surface-raised rounded-2xl border border-hairline space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', dmg.severity === 'MEDIUM' ? 'bg-warning' : 'bg-danger')} />
                          <span className="text-xs font-semibold text-foreground">{dmg.type}</span>
                        </div>
                        <span className="eyebrow rounded-md border border-hairline bg-surface px-2 py-0.5">
                          {activeAnalysis.isSimulation ? 'simulated' : `${Math.round(dmg.confidence * 100)}% conf`}
                        </span>
                      </div>
                      <p className="eyebrow">{dmg.location}</p>
                      <Button variant="ghost" size="sm" className="w-full" disabled={activeAnalysis.isSimulation}>
                        {activeAnalysis.isSimulation ? 'Preview only' : t('markForRepair')}
                      </Button>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-hairline">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="eyebrow">{activeAnalysis.isSimulation ? 'Simulated integrity' : t('overallIntegrity')}</span>
                      <span
                        className={cn(
                          'flex items-center gap-1 text-sm font-semibold font-mono tabular',
                          activeAnalysis.integrityScore < 80 ? 'text-danger' : 'text-success',
                        )}
                      >
                        {activeAnalysis.integrityScore < 80 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {activeAnalysis.integrityScore}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-1000', activeAnalysis.integrityScore < 80 ? 'bg-danger' : 'bg-success')}
                        style={{ width: `${activeAnalysis.integrityScore}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center mx-auto mb-4">
                    <BrainCircuit className="w-6 h-6 text-text-faint" strokeWidth={1.25} />
                  </div>
                  <p className="eyebrow">{t('noActiveScan')}</p>
                  <p className="mt-1.5 text-xs text-text-muted max-w-[220px] mx-auto">
                    Upload a vehicle photo to run the simulation preview.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview status</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-xs text-text-muted">
              <p>Mode: simulation only</p>
              <p>Live CV provider: not configured</p>
              <p>Production damage decisions: disabled</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
