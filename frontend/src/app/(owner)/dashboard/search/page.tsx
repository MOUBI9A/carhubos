'use client';

import { useTranslations } from 'next-intl';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  SearchX,
  Car,
  Users,
  Calendar,
  Loader2,
  ArrowRight,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import { CarPhoto, AgencyImage } from '@/components/ui/AgencyImage';
import { EmptyState } from '@/components/ui/EmptyState';
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
  MAINTENANCE: 'text-warning bg-warning/10 border-warning/20',
  OUT_OF_SERVICE: 'text-danger bg-danger/10 border-danger/20',
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'text-text-muted bg-surface-raised border-hairline',
  APPROVED: 'text-info bg-info/10 border-info/20',
  ACTIVE: 'text-success bg-success/10 border-success/20',
  COMPLETED: 'text-text-faint bg-surface border-hairline',
  CANCELLED: 'text-danger bg-danger/10 border-danger/20',
};

const CATEGORIES = [
  { id: 'all', label: 'All results' },
  { id: 'cars', label: 'Fleet' },
  { id: 'customers', label: 'Clients' },
  { id: 'bookings', label: 'Bookings' },
];

export default function SearchPage() {
  const t = useTranslations('ownerPages');
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
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {t('searchEngine')}
        </h1>
        <p className="text-sm text-text-muted">
          Search across fleet, clients, and bookings in real time
        </p>
      </div>

      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 start-5 flex items-center pointer-events-none">
          {isSearching
            ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
            : <Search className="w-4 h-4 text-text-faint group-focus-within:text-primary transition-colors" />
          }
        </div>
        <input
          className="w-full h-14 ps-12 pe-12 bg-surface border border-hairline rounded-2xl text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
          placeholder="Search by name, plate, ID, or booking status..."
          value={query}
          onChange={handleQueryChange}
          autoFocus
        />
        {query && (
          <button
            className="absolute inset-y-0 end-5 flex items-center text-text-faint hover:text-foreground transition-colors"
            onClick={() => { setQuery(''); setResults(null); }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border',
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-surface text-text-muted border-hairline hover:text-foreground'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!query || query.length < 2 ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
          <div>
            <p className="text-sm font-medium text-text-muted">Type at least 2 characters to search</p>
            <p className="mt-1 text-xs text-text-faint">Searches cars, customers, and bookings simultaneously</p>
          </div>
        </Card>
      ) : isSearching ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : totalShown === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching results"
          description={`No matches found for "${query}" in ${activeCategory === 'all' ? 'any category' : activeCategory}.`}
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(''); setResults(null); }}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Summary */}
          <div className="flex items-center justify-between px-1">
            <span className="eyebrow">
              {totalShown} result{totalShown !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </span>
          </div>

          {/* Cars section */}
          {displayedCars.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Car className="w-4 h-4 text-text-muted" />
                <h2 className="text-sm font-semibold text-foreground">Fleet</h2>
                <div className="flex-1 h-px bg-hairline" />
                <span className="text-xs font-mono tabular text-text-faint">{displayedCars.length}</span>
              </div>
              {displayedCars.map((car) => (
                <Card
                  key={car.id}
                  className="group cursor-pointer hover:border-primary/30 transition-all duration-300"
                  onClick={() => router.push(`/dashboard/fleet/${car.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 shrink-0">
                      <CarPhoto alt={`${car.brand} ${car.model}`} rounded="rounded-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-foreground truncate">{car.brand} {car.model}</h3>
                        <Badge variant="outline" className={CAR_STATUS_COLOR[car.status] || 'text-text-muted bg-surface border-hairline'}>
                          {car.status.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        <span className="font-mono tabular">{car.licensePlate}</span> · <span className="font-mono tabular">{car.pricePerDay.toLocaleString()}</span> MAD/day
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Customers section */}
          {displayedCustomers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-text-muted" />
                <h2 className="text-sm font-semibold text-foreground">Clients</h2>
                <div className="flex-1 h-px bg-hairline" />
                <span className="text-xs font-mono tabular text-text-faint">{displayedCustomers.length}</span>
              </div>
              {displayedCustomers.map((customer) => (
                <Card
                  key={customer.id}
                  className="group cursor-pointer hover:border-primary/30 transition-all duration-300"
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={`${customer.firstName} ${customer.lastName}`} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {customer.firstName} {customer.lastName}
                        </h3>
                        {customer.status === 'BLACKLISTED' && (
                          <Badge variant="destructive">Blacklisted</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {customer.phone} · <span className="font-mono tabular">{customer.identityNumber}</span>
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Bookings section */}
          {displayedBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-text-muted" />
                <h2 className="text-sm font-semibold text-foreground">Bookings</h2>
                <div className="flex-1 h-px bg-hairline" />
                <span className="text-xs font-mono tabular text-text-faint">{displayedBookings.length}</span>
              </div>
              {displayedBookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="group cursor-pointer hover:border-primary/30 transition-all duration-300"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={booking.customer ? `${booking.customer.firstName} ${booking.customer.lastName}` : undefined}
                      size={44}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-foreground font-mono tabular truncate">
                          {booking.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <Badge variant="outline" className={BOOKING_STATUS_COLOR[booking.status] || 'text-text-muted bg-surface border-hairline'}>
                          {booking.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 truncate">
                        {booking.customer ? `${booking.customer.firstName} ${booking.customer.lastName}` : 'Unknown'} •&nbsp;
                        {booking.car ? `${booking.car.brand} ${booking.car.model}` : 'N/A'} •&nbsp;
                        <span className="font-mono tabular">{booking.totalPrice.toLocaleString()}</span> MAD
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
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
