"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { AgencyImage, CarPhoto } from '@/components/ui/AgencyImage';
import { SealDivider } from '@/components/ui/Seal';
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
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      {/* Agency Header */}
      <div className="mb-14 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Storefront hero photography (real photo swaps in via src later) */}
        <AgencyImage
          slot="agency"
          alt={`${AGENCY_DATA.name} storefront`}
          ratio="21 / 9"
          rounded="rounded-3xl"
          className="shadow-soft mb-8"
        />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <Badge variant="trust">Verified agency</Badge>
                 <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                    <span className="font-mono tabular text-sm font-semibold text-foreground">{AGENCY_DATA.rating}</span>
                    <span className="text-xs text-text-faint">({AGENCY_DATA.reviews} reviews)</span>
                 </div>
              </div>
              <h1 className="display text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-4">{AGENCY_DATA.name}</h1>
              <p className="flex items-center gap-2 text-text-muted text-sm">
                <MapPin className="w-4 h-4 text-text-faint" strokeWidth={1.5} />
                {AGENCY_DATA.location}
              </p>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-end hidden md:block">
                 <p className="eyebrow mb-1">Ecosystem powered by</p>
                 <p className="font-display text-lg text-foreground">Fider</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised border border-hairline">
                 <ShieldCheck className="w-6 h-6 text-text-muted" strokeWidth={1.5} />
              </div>
           </div>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        {AGENCY_DATA.fleet.map((car, i) => (
          <Card key={i} padding="none" className="group h-full overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-1000" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="p-6 md:p-8">
              {/* Car photo — first-class hero of the card */}
              <CarPhoto
                alt={car.name}
                plate={car.category}
                price={`${car.price} MAD`}
                rounded="rounded-2xl"
                className="mb-6 transition-transform duration-700 group-hover:scale-[1.01]"
              />

              <div className="flex justify-between items-start gap-4 mb-6">
                 <div>
                    <p className="eyebrow mb-2">{car.category}</p>
                    <h3 className="text-2xl font-semibold text-foreground leading-tight">{car.name}</h3>
                 </div>
                 {car.tag && (
                    <Badge variant="secondary" className="shrink-0">{car.tag}</Badge>
                 )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                 <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-raised border border-hairline">
                    <Users className="w-4 h-4 text-text-faint" strokeWidth={1.5} />
                    <span className="text-xs text-text-muted">{car.passengers} seats</span>
                 </div>
                 <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-raised border border-hairline">
                    <Fuel className="w-4 h-4 text-text-faint" strokeWidth={1.5} />
                    <span className="text-xs text-text-muted">{car.fuel}</span>
                 </div>
                 <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-raised border border-hairline">
                    <Settings className="w-4 h-4 text-text-faint" strokeWidth={1.5} />
                    <span className="text-xs text-text-muted">{car.transmission}</span>
                 </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 border-t border-hairline">
                 <div>
                    <p className="eyebrow mb-1">Price per day</p>
                    <p className="font-mono tabular text-2xl font-semibold text-foreground">{car.price} <span className="text-sm text-text-faint">MAD</span></p>
                 </div>
                 <Button variant="primary" size="lg" className="group">
                    Start booking
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Trust Section */}
      <section>
         <Card padding="lg" className="text-center relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
               <p className="eyebrow mb-4">Security protocol</p>
               <h2 className="display text-3xl md:text-4xl text-foreground mb-6">Seamless booking with the Fider Trust Vault.</h2>
               <SealDivider className="max-w-xs mx-auto mb-8" />
               <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                  {[
                    { label: 'Instant ID scan', icon: Zap },
                    { label: 'Secure escrow', icon: ShieldCheck },
                    { label: 'Digital constat', icon: CheckCircle2 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                       <item.icon className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
                       <span className="text-sm text-text-muted">{item.label}</span>
                    </div>
                  ))}
               </div>
            </div>
         </Card>
      </section>
    </div>
  );
}
