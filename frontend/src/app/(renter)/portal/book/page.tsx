"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Calendar, MapPin, Filter, Star, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BookCar() {
  const cars = [
    { brand: 'Dacia', model: 'Logan', year: 2024, price: 300, type: 'Economy', image: '🚗' },
    { brand: 'Renault', model: 'Clio', year: 2023, price: 350, type: 'Compact', image: '🏎️' },
    { brand: 'Range Rover', model: 'Evoque', year: 2024, price: 1200, type: 'Luxury', image: 'SUV' },
    { brand: 'Hyundai', model: 'i20', year: 2023, price: 320, type: 'Economy', image: '🚗' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">Book Your Ride</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">Premium Fleet Discovery</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 glass-card">
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <MapPin className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Pickup Location</p>
              <p className="text-xs font-bold text-white">Casablanca, Morocco</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <Calendar className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Dates</p>
              <p className="text-xs font-bold text-white">May 10 - May 15</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <Filter className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Vehicle Type</p>
              <p className="text-xs font-bold text-white">All Types</p>
            </div>
          </div>
          <Button className="w-full">Search</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cars.map((car, i) => (
          <Card key={i} padding="none" className="overflow-hidden group hover:translate-y-[-4px]">
            <div className="h-40 bg-white/5 flex items-center justify-center text-4xl group-hover:bg-primary/5 transition-colors">
              {car.image}
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-lg font-black text-white">{car.brand} {car.model}</h3>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{car.type}</span>
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase mb-6">{car.year} Model</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <p className="text-xl font-black text-white">{car.price} <span className="text-[10px] text-white/40">MAD/DAY</span></p>
                </div>
                <Button size="sm">Book Now</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="glass-card p-6 flex items-start gap-4 border-primary/20 bg-primary/5">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-tight">Dynamic Pricing Active</h4>
          <p className="text-xs text-white/60 mt-1 leading-relaxed">
            Prices are currently optimized based on high weekend demand. Book now to lock in these rates.
          </p>
        </div>
      </div>
    </div>
  );
}
