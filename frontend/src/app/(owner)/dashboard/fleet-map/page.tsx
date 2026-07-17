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
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Neural Fleet <span className="text-primary">Map</span></h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
            <Signal className="w-3 h-3 text-success animate-pulse" />
            Live IoT Telemetry: 14 Active Nodes
          </p>
        </div>
        <div className="flex gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
           <button className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-primary/20 transition-all">Satellite</button>
           <button className="px-6 py-2 text-white/40 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all">Heatmap</button>
        </div>
      </header>

      <div className="flex-1 flex gap-8">
        {/* The "Map" Visualizer */}
        <Card padding="none" className="flex-1 relative overflow-hidden bg-black/40 border-white/5 shadow-2xl group">
           {/* Abstract Map Grid Lines */}
           <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #7c3aed 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '100px 100px' }} />

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
                 <div className={cn("w-4 h-4 rounded-full border-2 border-white relative transition-all shadow-[0_0_15px_rgba(124,58,237,0.5)]", car.status === 'IN_MOTION' ? 'bg-primary' : 'bg-success')}>
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-inherit" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white text-background text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover/node:opacity-100 transition-all whitespace-nowrap shadow-2xl">
                       {car.name} • {car.speed}
                    </div>
                 </div>
              </motion.div>
           ))}

           {/* Map Controls */}
           <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30">
              <button className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"><Maximize2 className="w-4 h-4 text-white" /></button>
              <button className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"><Minimize2 className="w-4 h-4 text-white" /></button>
           </div>

           {/* Legend */}
           <div className="absolute top-6 left-6 z-30">
              <Card variant="flat" className="p-4 border-white/5 backdrop-blur-xl">
                 <div className="space-y-3">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-primary" />
                       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Active Rental</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-success" />
                       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Idle Fleet</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-danger" />
                       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Critical Alert</span>
                    </div>
                 </div>
              </Card>
           </div>
        </Card>

        {/* Dynamic Telemetry Sidebar */}
        <div className="w-96 flex flex-col gap-8">
           <Card className="flex-1 border-white/5 shadow-2xl flex flex-col">
              <CardHeader className="flex-row items-center justify-between">
                 <CardTitle className="uppercase tracking-tighter italic">Live Telemetry</CardTitle>
                 <Activity className="w-4 h-4 text-primary animate-pulse" />
              </CardHeader>
              <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                 {ghostCars.map(car => (
                    <div 
                      key={car.id}
                      onClick={() => setSelectedCar(car)}
                      className={cn(
                        "p-5 rounded-[2rem] border transition-all cursor-pointer group",
                        selectedCar?.id === car.id ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                      )}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <h4 className="font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{car.name}</h4>
                             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{car.location}</p>
                          </div>
                          <div className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border", car.status === 'IN_MOTION' ? 'bg-primary/20 text-primary border-primary/20' : 'bg-success/20 text-success border-success/20')}>
                             {car.status}
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                          <div>
                             <p className="text-[8px] font-black text-white/20 uppercase">Speed</p>
                             <p className="text-sm font-black text-white italic">{car.speed}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[8px] font-black text-white/20 uppercase">Energy</p>
                             <p className={cn("text-sm font-black italic", car.fuel === '10%' ? 'text-danger animate-pulse' : 'text-white')}>{car.fuel}</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </Card>

           {/* AI Insight Mini-Widget */}
           <Card className="bg-primary/5 border-primary/20 p-5">
              <div className="flex items-start gap-4">
                 <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5 shadow-primary" />
                 <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Neural Prediction</p>
                    <p className="text-xs text-white/60 leading-relaxed mt-2 font-medium">
                       Vehicle <span className="text-white font-black">#Clio-987</span> is entering a high-traffic zone. ETA delay projected: **14 mins**.
                    </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
