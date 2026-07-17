'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Car,
  Users,
  Calendar,
  Loader2,
  ArrowRight,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToast } from '@/lib/contexts/ToastContext';

interface SearchResults {
  cars: Array<{
    id: string;
    brand: string;
    model: string;
    licensePlate: string;
    status: string;
    pricePerDay: number;
  }>;
  customers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    identityNumber: string;
    status: string;
  }>;
  bookings: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    car?: { brand: string; model: string; licensePlate: string };
    customer?: { firstName: string; lastName: string };
  }>;
  total: number;
}

const CAR_STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'text-success bg-success/10 border-success/20',
  RENTED: 'text-primary bg-primary/10 border-primary/20',
  MAINTENANCE: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  OUT_OF_SERVICE: 'text-danger bg-danger/10 border-danger/20',
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'text-white/60 bg-white/10 border-white/20',
  APPROVED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  ACTIVE: 'text-success bg-success/10 border-success/20',
  COMPLETED: 'text-white/40 bg-white/5 border-white/10',
  CANCELLED: 'text-danger bg-danger/10 border-danger/20',
};

const CATEGORIES = [
  { id: 'all', label: 'All Results' },
  { id: 'cars', label: 'Fleet' },
  { id: 'customers', label: 'Clients' },
  { id: 'bookings', label: 'Bookings' },
];

export default function SearchPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q.trim())}`);
      setResults(res.data);
    } catch (err: any) {
      showToast('danger', 'Search Failed', 'Could not connect to search engine.');
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [showToast]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(val), 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Compute displayed results based on activeCategory
  const displayedCars = (activeCategory === 'all' || activeCategory === 'cars') ? (results?.cars ?? []) : [];
  const displayedCustomers = (activeCategory === 'all' || activeCategory === 'customers') ? (results?.customers ?? []) : [];
  const displayedBookings = (activeCategory === 'all' || activeCategory === 'bookings') ? (results?.bookings ?? []) : [];
  const totalShown = displayedCars.length + displayedCustomers.length + displayedBookings.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 bg-primary rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Forensic Engine</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase">
          Global <span className="text-white/40">Search</span>
        </h1>
        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
          Search across fleet, clients, and bookings in real-time
        </p>
      </div>

      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          {isSearching
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : <Search className="w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
          }
        </div>
        <input
          className="w-full h-16 pl-14 pr-14 bg-white/5 border border-white/10 rounded-2xl text-base font-bold text-white outline-none focus:border-primary/40 transition-all placeholder:text-white/20"
          placeholder="Search by name, plate, ID, or booking status..."
          value={query}
          onChange={handleQueryChange}
          autoFocus
        />
        {query && (
          <button
            className="absolute inset-y-0 right-5 flex items-center text-white/20 hover:text-white transition-colors"
            onClick={() => { setQuery(''); setResults(null); }}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
              activeCategory === cat.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!query || query.length < 2 ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center">
            <Search className="w-10 h-10 text-white/10" />
          </div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Type at least 2 characters to search</p>
          <p className="text-[9px] text-white/10">Searches cars, customers, and bookings simultaneously</p>
        </div>
      ) : isSearching ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : totalShown === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
            <Search className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="text-sm font-black text-white/40 uppercase">No Records Found</h3>
          <p className="text-xs text-white/20 max-w-xs mx-auto text-center">
            No matches found for &ldquo;{query}&rdquo; in {activeCategory === 'all' ? 'any category' : activeCategory}.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setQuery(''); setResults(null); }}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">
              {totalShown} Result{totalShown !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </span>
          </div>

          {/* Cars section */}
          {displayedCars.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Car className="w-4 h-4 text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white/60">Fleet</h2>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[9px] font-black text-white/20">{displayedCars.length}</span>
              </div>
              {displayedCars.map((car) => (
                <Card
                  key={car.id}
                  className="group cursor-pointer hover:border-primary/30 border-white/5 transition-all duration-300"
                  onClick={() => router.push(`/dashboard/fleet/${car.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Car className="w-6 h-6 text-white/40 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black text-white/90 uppercase">{car.brand} {car.model}</h3>
                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest', CAR_STATUS_COLOR[car.status] || 'text-white/40 bg-white/5 border-white/10')}>
                          {car.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/30 font-medium mt-0.5">
                        {car.licensePlate} • {car.pricePerDay.toLocaleString()} MAD/day
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Customers section */}
          {displayedCustomers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-400" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white/60">Clients</h2>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[9px] font-black text-white/20">{displayedCustomers.length}</span>
              </div>
              {displayedCustomers.map((customer) => (
                <Card
                  key={customer.id}
                  className="group cursor-pointer hover:border-blue-500/30 border-white/5 transition-all duration-300"
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black text-white/90 uppercase">
                          {customer.firstName} {customer.lastName}
                        </h3>
                        {customer.status === 'BLACKLISTED' && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest text-danger bg-danger/10 border-danger/20">
                            BLACKLISTED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/30 font-medium mt-0.5">
                        {customer.phone} • {customer.identityNumber}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Bookings section */}
          {displayedBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white/60">Bookings</h2>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[9px] font-black text-white/20">{displayedBookings.length}</span>
              </div>
              {displayedBookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="group cursor-pointer hover:border-amber-500/30 border-white/5 transition-all duration-300"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                      <Calendar className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black text-white/90 uppercase font-mono">
                          {booking.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest', BOOKING_STATUS_COLOR[booking.status] || 'text-white/40 bg-white/5 border-white/10')}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/30 font-medium mt-0.5">
                        {booking.customer ? `${booking.customer.firstName} ${booking.customer.lastName}` : 'Unknown'} •&nbsp;
                        {booking.car ? `${booking.car.brand} ${booking.car.model}` : 'N/A'} •&nbsp;
                        {booking.totalPrice.toLocaleString()} MAD
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
