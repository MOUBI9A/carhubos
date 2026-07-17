"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  MapPin, 
  Camera, 
  Scan,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentOperations() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">Operations</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">Daily Task Board & Logistics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Scan className="w-4 h-4 mr-2" />
            Scan Renter QR
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Inspection
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Tasks */}
        <div className="space-y-6">
          <CardHeader className="px-0">
            <div>
              <CardTitle>Priority Tasks</CardTitle>
              <CardDescription>Actions requiring immediate attention</CardDescription>
            </div>
          </CardHeader>
          
          <div className="space-y-4">
            {[
              { title: 'Pre-Rental Inspection', detail: 'Dacia Logan (12345-A-1)', time: 'Due in 15m', type: 'INSPECTION' },
              { title: 'Return Check-in', detail: 'Renault Clio (98765-B-4)', time: 'Expected 14:00', type: 'LOGISTICS' },
              { title: 'Insurance Renewal', detail: 'Vehicle #55555-D-7', time: 'High Priority', type: 'ADMIN' },
            ].map((task, i) => (
              <Card key={i} className="flex items-center justify-between group cursor-pointer border-l-4 border-l-primary hover:translate-x-1">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary/60" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{task.title}</h4>
                    <p className="text-[10px] font-bold text-white/40 uppercase">{task.detail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-primary uppercase">{task.time}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Fleet Status Shortlist */}
        <div className="space-y-6">
          <CardHeader className="px-0">
            <div>
              <CardTitle>Fleet Availability</CardTitle>
              <CardDescription>Live status of your location's cars</CardDescription>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 gap-4">
            {[
              { car: 'Dacia Logan', status: 'Available', color: 'text-success' },
              { car: 'Renault Clio', status: 'Cleaning', color: 'text-amber-500' },
              { car: 'Range Rover', status: 'In Repair', color: 'text-danger' },
              { car: 'Hyundai i20', status: 'Available', color: 'text-success' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 glass-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Car className="w-4 h-4 text-white/20" />
                  </div>
                  <span className="text-sm font-bold text-white/80">{item.car}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", item.color.replace('text', 'bg'))} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", item.color)}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Plus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function Car(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
