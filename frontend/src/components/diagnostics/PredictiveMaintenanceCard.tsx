'use client';

import React, { useState } from 'react';

export interface PredictiveServiceItem {
  key: string;
  name: string;
  nameFr?: string;
  nameAr?: string;
  category: 'ENGINE' | 'FILTRATION' | 'BRAKING' | 'FLUIDS' | 'POWERTRAIN';
  status: 'HEALTHY' | 'UPCOMING' | 'DUE_SOON' | 'OVERDUE';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
  intervalKm: number;
  remainingKm: number;
  remainingDays: number;
  estimatedDueDate: string;
  estimatedCostMad: number;
  laymanAdvice: string;
}

export interface PredictiveMaintenanceProps {
  vehicleName: string;
  currentMileage: number;
  overallStatus: 'OPTIMAL' | 'ATTENTION_REQUIRED' | 'CRITICAL_MAINTENANCE_DUE';
  items: PredictiveServiceItem[];
  onAddToWorkOrder?: (item: PredictiveServiceItem) => void;
}

export function PredictiveMaintenanceCard({
  vehicleName,
  currentMileage,
  overallStatus,
  items,
  onAddToWorkOrder,
}: PredictiveMaintenanceProps) {
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON'>('ALL');

  const filteredItems = items.filter((item) => {
    if (filter === 'OVERDUE') return item.status === 'OVERDUE';
    if (filter === 'DUE_SOON') return item.status === 'DUE_SOON' || item.status === 'OVERDUE';
    return true;
  });

  const overdueCount = items.filter((i) => i.status === 'OVERDUE').length;
  const dueSoonCount = items.filter((i) => i.status === 'DUE_SOON').length;

  const getStatusBadge = (status: PredictiveServiceItem['status']) => {
    switch (status) {
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/80 border border-rose-800 text-rose-300">
            Overdue
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/80 border border-amber-800 text-amber-300">
            Due Soon
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-950/60 border border-blue-900 text-blue-300">
            Upcoming
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 border border-emerald-900 text-emerald-300">
            Healthy
          </span>
        );
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 text-zinc-100 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-wide">
              Predictive Mileage & Service Schedule
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                overallStatus === 'OPTIMAL'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : overallStatus === 'ATTENTION_REQUIRED'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
              }`}
            >
              {overallStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            {vehicleName} • Current Odometer: {currentMileage.toLocaleString()} km
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded transition ${
              filter === 'ALL'
                ? 'bg-zinc-700 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/60'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter('OVERDUE')}
            className={`px-2.5 py-1 rounded transition ${
              filter === 'OVERDUE'
                ? 'bg-rose-700 text-white font-medium'
                : 'text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-900/60'
            }`}
          >
            Overdue ({overdueCount})
          </button>
          <button
            onClick={() => setFilter('DUE_SOON')}
            className={`px-2.5 py-1 rounded transition ${
              filter === 'DUE_SOON'
                ? 'bg-amber-700 text-white font-medium'
                : 'text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-900/60'
            }`}
          >
            Due Soon ({dueSoonCount})
          </button>
        </div>
      </div>

      {/* Service Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredItems.map((item) => {
          const isOverdue = item.status === 'OVERDUE';
          const isDueSoon = item.status === 'DUE_SOON';
          const progressPercent = Math.min(
            100,
            Math.max(0, Math.round(((item.intervalKm - Math.max(0, item.remainingKm)) / item.intervalKm) * 100)),
          );

          return (
            <div
              key={item.key}
              className={`p-3.5 rounded-lg border transition ${
                isOverdue
                  ? 'bg-rose-950/20 border-rose-900/60'
                  : isDueSoon
                  ? 'bg-amber-950/20 border-amber-900/60'
                  : 'bg-zinc-800/40 border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-100">{item.name}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    Interval: every {item.intervalKm.toLocaleString()} km
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-semibold text-emerald-400">
                    ~{item.estimatedCostMad} MAD
                  </span>
                  <div className="text-[10px] text-zinc-400">est. cost</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-zinc-300'}>
                    {isOverdue
                      ? `Exceeded by ${Math.abs(item.remainingKm).toLocaleString()} km`
                      : `${item.remainingKm.toLocaleString()} km remaining`}
                  </span>
                  <span className="text-zinc-500">{item.remainingDays > 0 ? `~${item.remainingDays} days` : 'Overdue'}</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isOverdue
                        ? 'bg-rose-500'
                        : isDueSoon
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${isOverdue ? 100 : progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Layman advice */}
              <p className="mt-2.5 text-xs text-zinc-400 italic line-clamp-2">
                {item.laymanAdvice}
              </p>

              {/* Action */}
              {(isOverdue || isDueSoon) && onAddToWorkOrder && (
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex justify-end">
                  <button
                    onClick={() => onAddToWorkOrder(item)}
                    className="text-xs font-medium px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded transition border border-zinc-700"
                  >
                    + Add to Work Order Estimate
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
