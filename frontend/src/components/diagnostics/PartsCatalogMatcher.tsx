'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  Layers,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

export interface PartItem {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  brand: string;
  tier: 'OEM_DIRECT' | 'AFTERMARKET_PREMIUM' | 'AFTERMARKET_STANDARD' | 'ECONOMY';
  oemReference: string;
  crossReferences: string[];
  compatibilityConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  compatibilityEvidence: string[];
  price: string;
  currency: string;
  availability: 'IN_STOCK' | 'AVAILABLE_24H' | 'AVAILABLE_48H' | 'ORDER_ONLY';
  supplier: string;
  warrantyMonths: number;
}

export function PartsCatalogMatcher({
  dtcCodes,
  vehicleBrand,
  vehicleModel,
  onAddPart,
  disabled,
}: {
  dtcCodes: string[];
  vehicleBrand?: string;
  vehicleModel?: string;
  onAddPart?: (part: PartItem) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [parts, setParts] = useState<PartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const searchParts = async (customQuery?: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const q = customQuery !== undefined ? customQuery : query;
      const res = await api.get<PartItem[]>('/parts/search', {
        params: {
          query: q,
          make: vehicleBrand,
          model: vehicleModel,
        },
      });
      setParts(res.data);
    } catch {
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchByDtc = async (code: string) => {
    setLoading(true);
    setHasSearched(true);
    setQuery(code);
    try {
      const res = await api.get<PartItem[]>(`/parts/dtc/${code}`, {
        params: {
          make: vehicleBrand,
          model: vehicleModel,
        },
      });
      setParts(res.data);
    } catch {
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (part: PartItem) => {
    if (onAddPart) {
      onAddPart(part);
      setAddedIds((prev) => new Set([...prev, part.id]));
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'OEM_DIRECT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            OEM Direct
          </span>
        );
      case 'AFTERMARKET_PREMIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Premium Aftermarket
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-500/10 text-neutral-300 border border-neutral-500/20">
            Standard
          </span>
        );
    }
  };

  const getAvailabilityBadge = (avail: string) => {
    switch (avail) {
      case 'IN_STOCK':
        return <span className="text-emerald-400 font-medium">In Stock</span>;
      case 'AVAILABLE_24H':
        return <span className="text-amber-400 font-medium">24h Delivery</span>;
      default:
        return <span className="text-text-muted">48h / Order</span>;
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-metal" />
            Parts Intelligence & Supplier Catalog
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Verified OEM & aftermarket cross-references with Moroccan distributor pricing (MAD)
          </p>
        </div>
      </div>

      {/* Quick DTC Recommendations */}
      {dtcCodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface-raised border border-hairline text-xs">
          <span className="text-text-muted font-medium">Quick match by DTC:</span>
          {dtcCodes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => searchByDtc(code)}
              className="px-2.5 py-1 rounded-lg bg-surface border border-hairline hover:border-metal transition-colors text-xs font-mono font-medium"
            >
              Find parts for {code}
            </button>
          ))}
        </div>
      )}

      {/* Search Input Bar */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          searchParts();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-metal" />
          <input
            type="text"
            placeholder="Search part name, OEM number (e.g. 04E905110K), or brand (Bosch, NGK)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-surface border border-hairline focus:outline-none focus:border-primary text-text-primary placeholder:text-text-muted"
          />
        </div>
        <Button type="submit" variant="outline" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {/* Results List */}
      {hasSearched && parts.length === 0 && !loading && (
        <p className="text-xs text-text-muted py-2">
          No matching parts found for current query.
        </p>
      )}

      {parts.length > 0 && (
        <div className="space-y-3 pt-2">
          {parts.map((part) => {
            const isAdded = addedIds.has(part.id);
            return (
              <div
                key={part.id}
                className="p-3.5 rounded-xl border border-hairline bg-surface-raised hover:border-metal/40 transition-colors flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{part.name}</span>
                    {getTierBadge(part.tier)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span>Brand: <strong className="text-text-primary">{part.brand}</strong></span>
                    <span>·</span>
                    <span className="font-mono" dir="ltr">SKU: {part.partNumber}</span>
                    <span>·</span>
                    <span className="font-mono text-metal" dir="ltr">OE: {part.oemReference}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3 text-metal" /> {part.supplier}
                    </span>
                    <span>·</span>
                    <span>{getAvailabilityBadge(part.availability)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-base font-bold text-text-primary">
                      {part.price} <span className="text-xs font-normal text-text-muted">MAD</span>
                    </div>
                    <span className="text-[10px] text-text-muted">excl. VAT</span>
                  </div>

                  {onAddPart && (
                    <Button
                      size="sm"
                      variant={isAdded ? 'ghost' : 'outline'}
                      disabled={disabled || isAdded}
                      onClick={() => handleAdd(part)}
                    >
                      {isAdded ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Add to Estimate
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
