"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { History, Calendar, MapPin, Receipt, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RentalHistory() {
  const history = [
    { id: 1, car: 'Dacia Logan', dates: 'Mar 10 - Mar 15, 2026', total: 1500, agency: 'CIG CAR Casablanca', status: 'COMPLETED' },
    { id: 2, car: 'Renault Clio', dates: 'Feb 05 - Feb 08, 2026', total: 1050, agency: 'Atlas Rentals Marrakech', status: 'COMPLETED' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-black tracking-tighter text-white">Rental History</h1>
        <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">Your Journey Ledger & Receipts</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {history.map((item) => (
          <Card key={item.id} variant="outline" className="flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">
                 🚗
               </div>
               <div>
                  <h4 className="font-bold text-lg text-white">{item.car}</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                    <div className="flex items-center gap-1.5">
                       <MapPin className="w-3 h-3 text-white/20" />
                       <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.agency}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <Calendar className="w-3 h-3 text-white/20" />
                       <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.dates}</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-12 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
               <div className="text-left md:text-right">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Paid</p>
                  <p className="text-lg font-black text-white">{item.total} MAD</p>
               </div>
               <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <Receipt className="w-3.5 h-3.5 mr-2" />
                    Invoice
                  </Button>
                  <Button size="sm">Rent Again</Button>
               </div>
            </div>
          </Card>
        ))}

        {history.length === 0 && (
           <Card variant="flat" className="py-24 text-center">
              <History className="w-16 h-16 text-white/5 mx-auto mb-4" />
              <h3 className="font-bold text-white/40 uppercase tracking-widest">No history found</h3>
              <p className="text-xs text-white/20 mt-1">Your completed rentals will appear here.</p>
           </Card>
        )}
      </div>

      <Card className="bg-emerald-500/5 border-emerald-500/20">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
               <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
               <h4 className="text-sm font-black text-white uppercase tracking-tight">Loyalty Impact</h4>
               <p className="text-xs text-white/60 mt-1 leading-relaxed">
                 You have completed <span className="text-white font-bold">2 rentals</span>. Your next rental will earn you <span className="text-success font-bold">Gold Status</span> with a 5% permanent discount.
               </p>
            </div>
         </div>
      </Card>
    </div>
  );
}
