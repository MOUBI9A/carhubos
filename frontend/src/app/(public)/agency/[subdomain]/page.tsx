"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Fuel, 
  Settings, 
  Star, 
  MapPin, 
  ShieldCheck,
  Zap,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AGENCY_DATA = {
  name: 'Atlas Premium Rentals',
  rating: 4.9,
  reviews: 1240,
  location: 'Casablanca, Finance City',
  fleet: [
    { name: 'Range Rover Velar', category: 'LUXURY', price: 2500, image: 'SUV', passengers: 5, fuel: 'Diesel', transmission: 'Auto', tag: 'Top Rated' },
    { name: 'Mercedes E-Class', category: 'PREMIUM', price: 1800, image: 'SEDAN', passengers: 5, fuel: 'Hybrid', transmission: 'Auto', tag: 'Business' },
    { name: 'Dacia Logan Stepway', category: 'ECONOMY', price: 400, image: 'COMPACT', passengers: 5, fuel: 'Diesel', transmission: 'Manual', tag: 'Best Value' },
    { name: 'Volkswagen Golf 8', category: 'COMPACT', price: 700, image: 'HATCHBACK', passengers: 5, fuel: 'Essence', transmission: 'Auto', tag: 'Popular' },
  ]
};

export default function AgencyPublicPage() {
  const params = useParams();
  const subdomain = params.subdomain;

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Agency Header */}
      <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] font-black tracking-widest uppercase">Verified Agency</Badge>
                 <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-black text-white">{AGENCY_DATA.rating}</span>
                    <span className="text-[10px] font-bold text-white/40">({AGENCY_DATA.reviews} reviews)</span>
                 </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white uppercase italic leading-none mb-4">{AGENCY_DATA.name}</h1>
              <p className="flex items-center gap-2 text-white/40 font-bold uppercase tracking-widest text-xs">
                <MapPin className="w-4 h-4 text-primary" />
                {AGENCY_DATA.location}
              </p>
           </div>
           <div className="flex gap-4">
              <div className="text-right hidden md:block">
                 <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Ecosystem Powered by</p>
                 <p className="text-sm font-black text-white uppercase italic tracking-tighter">Infinity OS</p>
              </div>
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                 <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
           </div>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        {AGENCY_DATA.fleet.map((car, i) => (
          <Card key={i} className="group overflow-hidden border-white/5 bg-white/[0.02] hover:ring-1 ring-primary/50 transition-all duration-500 animate-in fade-in slide-in-from-bottom-6 duration-1000" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="p-8">
              <div className="flex justify-between items-start mb-12">
                 <div>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-white/40 border-white/10">{car.category}</Badge>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{car.name}</h3>
                 </div>
                 {car.tag && (
                    <Badge className="bg-white/10 text-white border-white/10 text-[9px] font-black tracking-widest uppercase">{car.tag}</Badge>
                 )}
              </div>

              {/* Placeholder for Car Image */}
              <div className="h-48 w-full bg-white/[0.03] rounded-[2rem] border border-white/5 mb-8 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-700">
                 <div className="text-6xl grayscale opacity-20 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700">🚗</div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                 <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <Users className="w-4 h-4 text-white/20" />
                    <span className="text-[10px] font-black text-white uppercase">{car.passengers} seats</span>
                 </div>
                 <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <Fuel className="w-4 h-4 text-white/20" />
                    <span className="text-[10px] font-black text-white uppercase">{car.fuel}</span>
                 </div>
                 <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <Settings className="w-4 h-4 text-white/20" />
                    <span className="text-[10px] font-black text-white uppercase">{car.transmission}</span>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-white/5">
                 <div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Price per day</p>
                    <p className="text-3xl font-black text-white tracking-tighter">{car.price} <span className="text-sm text-white/40">MAD</span></p>
                 </div>
                 <Button className="h-14 px-8 text-[11px] font-black uppercase tracking-[0.2em] group">
                    Start Booking
                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                 </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Trust Section */}
      <section className="glass p-12 rounded-[3rem] border border-white/10 text-center relative overflow-hidden">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
         <div className="relative z-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6">Security Protocol</h4>
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter mb-8 max-w-2xl mx-auto">Seamless booking with the Infinity Trust Vault.</h2>
            <div className="flex flex-wrap justify-center gap-12">
               {[
                 { label: 'Instant ID Scan', icon: Zap },
                 { label: 'Secure Escrow', icon: ShieldCheck },
                 { label: 'Digital Constat', icon: CheckCircle2 },
               ].map((item, i) => (
                 <div key={i} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">{item.label}</span>
                 </div>
               ))}
            </div>
         </div>
      </section>
    </div>
  );
}
