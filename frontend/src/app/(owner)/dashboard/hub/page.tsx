"use client";

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  Search,
  Filter,
  ArrowUpRight,
  Car,
  ShieldCheck,
  Zap,
  Users,
  BarChart3,
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AgencyImage, CarPhoto } from '@/components/ui/AgencyImage';
import { Badge } from '@/components/ui/badge';

const INITIAL_MARKETPLACE_CARS = [
  {
    id: 1,
    name: "Porsche 911 Carrera S",
    agency: "LuxDrive Dubai",
    type: "Sport",
    dailyRate: 450,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800",
    status: "Available",
    trustScore: 98
  },
  {
    id: 2,
    name: "Mercedes-Benz G63 AMG",
    agency: "Elite Rentals",
    type: "SUV",
    dailyRate: 800,
    image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&q=80&w=800",
    status: "Available",
    trustScore: 95
  },
  {
    id: 3,
    name: "Lamborghini Huracán Evo",
    agency: "SpeedX Agency",
    type: "Supercar",
    dailyRate: 1200,
    image: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&q=80&w=800",
    status: "Booked",
    trustScore: 92
  },
  {
    id: 4,
    name: "Range Rover Autobiography",
    agency: "Royal Fleet",
    type: "SUV",
    dailyRate: 550,
    image: "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&q=80&w=800",
    status: "Available",
    trustScore: 99
  }
];

export default function HubPage() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-fleet'>('marketplace');
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [marketplaceCars, setMarketplaceCars] = useState(INITIAL_MARKETPLACE_CARS);
  const [newListingRate, setNewListingRate] = useState("");

  const handleListVehicle = () => {
    if (!newListingRate) {
      showToast('danger', 'Input Required', 'Please enter a daily rate');
      return;
    }
    const newCar = {
      id: Date.now(),
      name: "Ferrari F8 Tributo",
      agency: "My Agency",
      type: "Supercar",
      dailyRate: Number(newListingRate),
      image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200",
      status: "Available",
      trustScore: 100
    };
    setMarketplaceCars([newCar, ...marketplaceCars]);
    setIsListingModalOpen(false);
    setNewListingRate("");
    showToast('success', 'Listing Created', 'Vehicle listed on the hub successfully!');
    setActiveTab('my-fleet');
  };

  const handleRequest = (car: any) => {
    showToast('success', 'B2B Request Sent', `Request sent to ${car.agency} for ${car.name}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {t('hubMarketplace')}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Global enterprise network & fleet liquidity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {}}
          >
            <Filter className="w-4 h-4 me-2" />
            Filters
          </Button>
          <Button
            onClick={() => setIsListingModalOpen(true)}
          >
            <Plus className="w-4 h-4 me-2" />
            List on hub
          </Button>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active listings', value: '1,284', icon: Car },
          { label: 'Network agencies', value: '42', icon: Users },
          { label: 'Avg daily rate', value: '420', unit: 'MAD', icon: BarChart3 },
          { label: 'B2B liquidity', value: '4.2M', unit: 'MAD', icon: Zap },
        ].map((stat, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground font-mono tabular">
                  {stat.value}
                  {stat.unit && <span className="ms-1 text-xs font-normal text-text-faint">{stat.unit}</span>}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center text-text-muted shrink-0">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-2xl w-fit border border-hairline">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={cn(
            "px-5 py-2 rounded-xl text-xs font-medium transition-all",
            activeTab === 'marketplace' ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-foreground"
          )}
        >
          Marketplace
        </button>
        <button
          onClick={() => setActiveTab('my-fleet')}
          className={cn(
            "px-5 py-2 rounded-xl text-xs font-medium transition-all",
            activeTab === 'my-fleet' ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-foreground"
          )}
        >
          My fleet listings
        </button>
      </div>

      {/* Search and results */}
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
          <input
            placeholder="Search enterprise network (model, agency, location)..."
            className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {marketplaceCars.map((car, i) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card padding="none" className="group h-full overflow-hidden">
                <CarPhoto
                  src={car.image}
                  alt={car.name}
                  price={`${car.dailyRate.toLocaleString()} MAD/day`}
                  rounded="rounded-none"
                />
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="eyebrow">{car.type}</p>
                      <h3 className="mt-0.5 truncate font-semibold tracking-tight text-foreground">{car.name}</h3>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      <span className="me-1 w-1.5 h-1.5 rounded-full bg-success" />
                      Trust <span className="ms-1 font-mono tabular">{car.trustScore}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 border-t border-hairline pt-4">
                    <div className="w-8 h-8 rounded-full bg-surface-raised border border-hairline flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-text-muted" />
                    </div>
                    <p className="truncate text-xs font-medium text-foreground">{car.agency}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Details
                    </Button>
                    <Button size="sm" className="flex-1 group/btn">
                      Request
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* List on Hub Modal */}
      <Modal
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
        title="List fleet on hub"
        description="Release your idle fleet for B2B liquidity"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="eyebrow px-1">Select vehicle</label>
              <div className="glass p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-surface-raised transition-colors">
                <div className="flex items-center gap-3">
                  <AgencyImage
                    slot="car"
                    alt="Ferrari F8 Tributo"
                    src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200"
                    ratio="3 / 2"
                    rounded="rounded-lg"
                    className="w-12"
                  />
                  <p className="text-xs font-medium text-foreground">Ferrari F8 Tributo</p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-faint" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="eyebrow px-1">B2B daily rate (MAD)</label>
              <input
                placeholder="Enter rate..."
                type="number"
                value={newListingRate}
                onChange={(e) => setNewListingRate(e.target.value)}
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
              />
            </div>
          </div>

          <Card>
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div>
                <p className="eyebrow">Enterprise shield protection</p>
                <p className="text-sm text-text-muted leading-relaxed mt-2">
                  When listing on B2B Hub, your vehicle is covered by our <span className="font-mono tabular text-foreground">10M MAD</span> liability umbrella and smart contract insurance.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsListingModalOpen(false)}>Cancel</Button>
            <Button className="px-10" onClick={handleListVehicle}>Confirm listing</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
