"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Navigation,
  MapPin,
  Activity,
  Car,
  ShieldCheck,
  Zap,
  Layers,
  Search,
  Maximize2,
  Minimize2,
  Signal,
  Wind
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function FleetMap() {
  const { showToast } = useToast();
  const [selectedCar, setSelectedCar] = useState<any>(null);

  const ghostCars = [
    { id: 1, name: 'Range Rover', status: 'IN_MOTION', speed: '82 km/h', location: 'Casablanca Port', fuel: '75%', color: 'text-primary' },
    { id: 2, name: 'Dacia Logan', status: 'IDLE', speed: '0 km/h', location: 'Maarif Center', fuel: '40%', color: 'text-success' },
    { id: 3, name: 'Renault Clio', status: 'IN_MOTION', speed: '45 km/h', location: 'Airport Road', fuel: '10%', color: 'text-danger' },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Fleet map</h1>
          <p className="mt-1.5 flex items-center gap-2 eyebrow">
            <Signal className="w-3 h-3 text-success" />
            Live telemetry · <span className="font-mono tabular">14</span> active nodes
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-hairline bg-surface p-1">
           <button className="rounded-lg px-5 py-1.5 text-xs font-medium bg-primary text-primary-foreground transition-all">Satellite</button>
           <button className="rounded-lg px-5 py-1.5 text-xs font-medium text-text-muted hover:text-foreground transition-all">Heatmap</button>
        </div>
      </header>

      <div className="flex-1 flex gap-8">
        {/* The "Map" Visualizer */}
        <Card padding="none" className="flex-1 relative overflow-hidden bg-background shadow-2xl group">
           {/* Abstract Map Grid Lines */}
           <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--color-hairline) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--color-hairline) 1px, transparent 1px), linear-gradient(90deg, var(--color-hairline) 1px, transparent 1px)', backgroundSize: '100px 100px' }} />

           {/* Floating Car Nodes */}
           {ghostCars.map((car, i) => (
              <motion.div
                key={car.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.2 }}
                onClick={() => setSelectedCar(car)}
                className="absolute cursor-pointer group/node z-20"
                style={{ top: `${20 + i * 25}%`, left: `${30 + i * 20}%` }}
              >
                 <div className={cn("w-4 h-4 rounded-full border-2 border-cream relative transition-all", car.status === 'IN_MOTION' ? 'bg-primary' : 'bg-success')}>
                    <div className="absolute bottom-full start-1/2 -translate-x-1/2 mb-3 bg-surface-raised text-foreground border border-hairline text-[10px] font-medium px-2 py-1 rounded-lg opacity-0 group-hover/node:opacity-100 transition-all whitespace-nowrap shadow-soft">
                       {car.name} · <span className="font-mono tabular">{car.speed}</span>
                    </div>
                 </div>
              </motion.div>
           ))}

           {/* Map Controls */}
           <div className="absolute bottom-6 end-6 flex flex-col gap-2 z-30">
              <button className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-surface-raised transition-all"><Maximize2 className="w-4 h-4 text-text-muted" /></button>
              <button className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-surface-raised transition-all"><Minimize2 className="w-4 h-4 text-text-muted" /></button>
           </div>

           {/* Legend */}
           <div className="absolute top-6 start-6 z-30">
              <Card className="p-4">
                 <div className="space-y-3">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-primary" />
                       <span className="eyebrow">Active rental</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-success" />
                       <span className="eyebrow">Idle fleet</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-danger" />
                       <span className="eyebrow">Critical alert</span>
                    </div>
                 </div>
              </Card>
           </div>
        </Card>

        {/* Dynamic Telemetry Sidebar */}
        <div className="w-96 flex flex-col gap-8">
           <Card className="flex-1 flex flex-col">
              <CardHeader className="flex-row items-center justify-between">
                 <CardTitle>Live telemetry</CardTitle>
                 <Activity className="w-4 h-4 text-text-faint" />
              </CardHeader>
              <div className="flex-1 space-y-6 overflow-y-auto pe-2 custom-scrollbar">
                 {ghostCars.map(car => (
                    <div
                      key={car.id}
                      onClick={() => setSelectedCar(car)}
                      className={cn(
                        "p-5 rounded-2xl border transition-all cursor-pointer group",
                        selectedCar?.id === car.id ? "bg-surface-raised border-primary" : "bg-surface border-hairline hover:bg-surface-raised"
                      )}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{car.name}</h4>
                             <p className="eyebrow mt-0.5">{car.location}</p>
                          </div>
                          <div className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", car.status === 'IN_MOTION' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20')}>
                             {car.status.replace('_', ' ').toLowerCase()}
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 border-t border-hairline pt-4">
                          <div>
                             <p className="eyebrow">Speed</p>
                             <p className="text-sm font-mono tabular text-foreground">{car.speed}</p>
                          </div>
                          <div className="text-right">
                             <p className="eyebrow">Energy</p>
                             <p className={cn("text-sm font-mono tabular", car.fuel === '10%' ? 'text-danger' : 'text-foreground')}>{car.fuel}</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </Card>

           {/* AI Insight Mini-Widget */}
           <Card className="p-5">
              <div className="flex items-start gap-4">
                 <Zap className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
                 <div>
                    <p className="eyebrow">Prediction</p>
                    <p className="text-xs text-text-muted leading-relaxed mt-2">
                       Vehicle <span className="font-mono tabular text-foreground">#Clio-987</span> is entering a high-traffic zone. ETA delay projected: **14 mins**.
                    </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
