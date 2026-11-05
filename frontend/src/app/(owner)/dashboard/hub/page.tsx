"use client";

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  Search,
  Car,
  ShieldCheck,
  Zap,
  Users,
  BarChart3,
  Plus,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  SearchX,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Combobox } from '@/components/ui/Combobox';
import { CarPhoto } from '@/components/ui/AgencyImage';
import { Badge } from '@/components/ui/badge';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useHubDiscover, useListOnHub, type HubListing } from './useHub';
import { useFleet } from '../fleet/useFleet';

export default function HubPage() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-fleet'>('marketplace');
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCarId, setSelectedCarId] = useState('');
  const [newListingRate, setNewListingRate] = useState('');

  const { data: listings, isLoading, error, refetch } = useHubDiscover();
  const { data: fleet, isLoading: isFleetLoading } = useFleet();
  const listMutation = useListOnHub();

  // Idle (AVAILABLE) cars from this agency's own fleet — the only ones it makes
  // sense to release for B2B liquidity. This is a UX narrowing, not the source
  // of truth: the backend independently rejects a car that's already listed
  // (409) or that doesn't belong to this agency (404).
  const availableCars = useMemo(
    () => (fleet ?? []).filter((c) => c.status === 'AVAILABLE'),
    [fleet],
  );
  const carOptions = useMemo(
    () =>
      availableCars.map((c) => ({
        id: c.id,
        label: `${c.brand} ${c.model} (${c.year})`,
        sublabel: `${c.licensePlate} • ${c.pricePerDay.toLocaleString()} MAD/day`,
      })),
    [availableCars],
  );

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) =>
      `${l.car.brand} ${l.car.model} ${l.agency.name} ${l.agency.city}`
        .toLowerCase()
        .includes(q),
    );
  }, [listings, query]);

  // Real aggregates derived from the actual discover feed — no fabricated KPIs.
  const stats = useMemo(() => {
    const all = listings ?? [];
    const agencyCount = new Set(all.map((l) => l.agencyId)).size;
    const avgRate = all.length
      ? Math.round(all.reduce((s, l) => s + l.dailyRateB2B, 0) / all.length)
      : 0;
    const totalValue = all.reduce((s, l) => s + l.dailyRateB2B, 0);
    return { activeListings: all.length, agencyCount, avgRate, totalValue };
  }, [listings]);

  const closeListingModal = () => {
    setIsListingModalOpen(false);
    setSelectedCarId('');
    setNewListingRate('');
  };

  const handleListVehicle = () => {
    if (!selectedCarId) {
      showToast('danger', 'Vehicle required', 'Select which car to release on the hub.');
      return;
    }
    const rate = Number(newListingRate);
    if (!newListingRate || !Number.isFinite(rate) || rate <= 0) {
      showToast('danger', 'Input Required', 'Please enter a valid daily rate');
      return;
    }
    listMutation.mutate(
      { carId: selectedCarId, b2bRate: rate },
      {
        onSuccess: () => {
          closeListingModal();
          showToast('success', 'Listed on hub', 'Your vehicle is now visible to the B2B network.');
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || 'Failed to list vehicle on the hub';
          showToast('danger', 'Listing failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
        },
      },
    );
  };

  const handleRequest = (listing: HubListing) => {
    // No B2B request endpoint exists yet (hub module only exposes POST
    // /hub/list and GET /hub/discover) — pending a product/backend decision.
    // Stay honest instead of claiming a request was sent.
    showToast(
      'info',
      'Not available yet',
      `B2B requests aren’t built yet — nothing was sent to ${listing.agency.name}.`,
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">Hub offline</p>
          <p className="text-sm text-text-muted mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 me-2" /> Reconnect
        </Button>
      </div>
    );
  }

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
          <Button onClick={() => setIsListingModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            List on hub
          </Button>
        </div>
      </header>

      {/* Stats row — real aggregates over the discover feed */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Active listings', value: stats.activeListings.toLocaleString(), icon: Car },
            { label: 'Network agencies', value: stats.agencyCount.toLocaleString(), icon: Users },
            { label: 'Avg daily rate', value: stats.avgRate.toLocaleString(), unit: 'MAD', icon: BarChart3 },
            { label: 'Listed daily value', value: stats.totalValue.toLocaleString(), unit: 'MAD', icon: Zap },
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
      )}

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

      {activeTab === 'my-fleet' ? (
        // No endpoint returns "this agency's own hub listings" today:
        // GET /hub/discover deliberately excludes the caller's own agency (it's
        // a cross-agency marketplace feed), and GET /cars doesn't include each
        // car's hubListing status. Rather than fabricate this tab's contents,
        // say so plainly — same honesty bar as the B2B-request toast above.
        <EmptyState
          icon={Car}
          title="Not available yet"
          description="Viewing your own hub listings needs a small backend addition — GET /hub/discover only returns other agencies' listings by design. Nothing is faked here in the meantime."
        />
      ) : (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search enterprise network (model, agency, location)..."
              className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (listings?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Car}
              title="No listings on the network yet"
              description="No other agency has released a vehicle to the B2B hub. Check back later, or list one of your own idle cars to get the network started."
            />
          ) : filteredListings.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matching results"
              description="No listings match your search. Try a different model, agency or city."
              action={
                <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {filteredListings.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card padding="none" className="group h-full overflow-hidden">
                    <CarPhoto
                      src={listing.car.imageUrl}
                      alt={`${listing.car.brand} ${listing.car.model}`}
                      plate={listing.car.licensePlate}
                      price={`${listing.dailyRateB2B.toLocaleString()} MAD/day`}
                      rounded="rounded-none"
                    />
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="eyebrow">{listing.car.year}</p>
                          <h3 className="mt-0.5 truncate font-semibold tracking-tight text-foreground">
                            {listing.car.brand} {listing.car.model}
                          </h3>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          <span className="me-1 w-1.5 h-1.5 rounded-full bg-success" />
                          Available
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 border-t border-hairline pt-4">
                        <div className="w-8 h-8 rounded-full bg-surface-raised border border-hairline flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4 text-text-muted" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{listing.agency.name}</p>
                          <p className="truncate text-[11px] text-text-faint">{listing.agency.city}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 group/btn" onClick={() => handleRequest(listing)}>
                          Request
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List on Hub Modal */}
      <Modal
        isOpen={isListingModalOpen}
        onClose={closeListingModal}
        title="List fleet on hub"
        description="Release your idle fleet for B2B liquidity"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="eyebrow px-1">Select vehicle</label>
              <Combobox
                options={carOptions}
                value={selectedCarId}
                onChange={setSelectedCarId}
                placeholder={isFleetLoading ? 'Loading vehicles…' : 'Select vehicle...'}
                emptyText={
                  isFleetLoading
                    ? 'Loading vehicles…'
                    : 'No available vehicles — everything is rented, in maintenance, or out of service'
                }
                icon={<Car className="w-4 h-4" />}
              />
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
            <Button variant="ghost" onClick={closeListingModal}>Cancel</Button>
            <Button className="px-10" onClick={handleListVehicle} isLoading={listMutation.isPending}>
              Confirm listing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
