"use client";

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
import { Input } from '@/components/ui/input';

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
            B2B Hub <span className="text-primary">Marketplace</span>
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2">
            Global Enterprise Network & Fleet Liquidity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="glass h-12"
            onClick={() => {}}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button 
            className="h-12 bg-primary text-white"
            onClick={() => setIsListingModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            List on Hub
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Listings', value: '1,284', icon: Car, color: 'text-primary' },
          { label: 'Network Agencies', value: '42', icon: Users, color: 'text-blue-400' },
          { label: 'Avg Daily Rate', value: '$420', icon: BarChart3, color: 'text-green-400' },
          { label: 'B2B Liquidity', value: '$4.2M', icon: Zap, color: 'text-amber-400' },
        ].map((stat, i) => (
          <Card key={i} className="glass border-white/5">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-2xl bg-white/5", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
            activeTab === 'marketplace' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white/60"
          )}
        >
          Marketplace
        </button>
        <button
          onClick={() => setActiveTab('my-fleet')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
            activeTab === 'my-fleet' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white/60"
          )}
        >
          My Fleet Listings
        </button>
      </div>

      {/* Search and results */}
      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search enterprise network (Model, Agency, Location)..." 
            className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary focus:border-primary transition-all text-sm italic"
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
              <Card className="glass-card overflow-hidden group border-white/5">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img 
                    src={car.image} 
                    alt={car.name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60" />
                  <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1 rounded-full">
                    <p className="text-[10px] font-black text-primary uppercase">Trust: {car.trustScore}</p>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{car.type}</p>
                    <h3 className="text-white font-black text-lg -mt-1 uppercase italic">{car.name}</h3>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-[11px] font-bold text-white/80 uppercase">{car.agency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-white/40 uppercase">B2B Rate</p>
                      <p className="text-xl font-black text-white italic">${car.dailyRate}<span className="text-[10px] text-white/40">/DAY</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-10 glass">
                      Details
                    </Button>
                    <Button size="sm" className="flex-1 h-10 bg-primary group/btn">
                      Request
                      <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
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
        title="List Fleet on Hub"
        description="Release your idle fleet for B2B liquidity"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">Select Vehicle</label>
              <div className="glass p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded bg-white/10 overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase italic">Ferrari F8 Tributo</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/20" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">B2B Daily Rate ($)</label>
              <Input 
                placeholder="Enter rate..." 
                className="glass h-14" 
                type="number"
                value={newListingRate}
                onChange={(e) => setNewListingRate(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-white uppercase italic">Enterprise Shield Protection</h4>
                <p className="text-[10px] text-white/50 leading-relaxed mt-1">
                  When listing on B2B Hub, your vehicle is covered by our $10M liability umbrella and smart contract insurance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsListingModalOpen(false)}>Cancel</Button>
            <Button className="bg-primary px-10" onClick={handleListVehicle}>Confirm Listing</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
