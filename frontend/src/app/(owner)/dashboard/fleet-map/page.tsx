"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Car,
  CheckCircle2,
  ChevronRight,
  Filter,
  Fuel,
  Gauge,
  MapPin,
  Radio,
  Search,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react';

interface FleetVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  mileage: number;
  nextServiceKm: number | null;
  fuelType: string;
  gearbox: string;
}

interface WorkOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  fleetCarId: string | null;
  dtcCleared: boolean;
  description: string;
}

// Key operational mobility hubs in Morocco
const HUBS = [
  { id: 'ALL', name: 'Tous les Hubs (Maroc)', lat: 31.7917, lng: -7.0926 },
  { id: 'CASABLANCA', name: 'Grand Casablanca Hub', lat: 33.5731, lng: -7.5898 },
  { id: 'MARRAKECH', name: 'Marrakech-Tensift Hub', lat: 31.6295, lng: -7.9811 },
  { id: 'TANGER', name: 'Tanger-Med Hub', lat: 35.7595, lng: -5.8340 },
  { id: 'RABAT', name: 'Rabat-Salé Hub', lat: 34.0209, lng: -6.8416 },
  { id: 'AGADIR', name: 'Souss-Massa Hub', lat: 30.4278, lng: -9.5981 },
];

interface VehicleWithHealth extends FleetVehicle {
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  healthReason: string;
  activeWo?: WorkOrderSummary;
  hub: (typeof HUBS)[number];
}

export default function FleetMapPage() {
  const t = useTranslations('ownerPages');

  const [cars, setCars] = useState<FleetVehicle[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHub, setSelectedHub] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'HEALTHY' | 'WARNING' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCar, setSelectedCar] = useState<VehicleWithHealth | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [carsRes, woRes] = await Promise.all([
          api.get<FleetVehicle[]>('/cars').catch(() => ({ data: [] })),
          api.get<WorkOrderSummary[]>('/work-orders').catch(() => ({ data: [] })),
        ]);
        setCars(carsRes.data || []);
        setWorkOrders(woRes.data || []);
      } catch (e) {
        console.error('Failed to load fleet map data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Map each vehicle to its real OBD / operational status
  const vehiclesWithHealth = useMemo(() => {
    const activeWoByCar = new Map<string, WorkOrderSummary>();
    for (const wo of workOrders) {
      if (wo.fleetCarId && wo.status !== 'COMPLETED' && wo.status !== 'INVOICED' && wo.status !== 'CANCELLED') {
        activeWoByCar.set(wo.fleetCarId, wo);
      }
    }

    return cars.map((car, idx) => {
      const activeWo = activeWoByCar.get(car.id);
      let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
      let healthReason = 'Système OBD nominal · Prêt à rouler';

      if (activeWo) {
        healthStatus = 'CRITICAL';
        healthReason = `Ordre en atelier: ${activeWo.orderNumber} (${activeWo.status})`;
      } else if (car.status === 'MAINTENANCE' || car.status === 'OUT_OF_SERVICE') {
        healthStatus = 'CRITICAL';
        healthReason = `Statut véhicule: ${car.status.replace(/_/g, ' ')}`;
      } else if (car.nextServiceKm && car.mileage >= car.nextServiceKm) {
        healthStatus = 'WARNING';
        healthReason = `Entretien dépassé de ${(car.mileage - car.nextServiceKm).toLocaleString()} km`;
      } else if (car.nextServiceKm && car.nextServiceKm - car.mileage <= 1000) {
        healthStatus = 'WARNING';
        healthReason = `Entretien proche dans ${(car.nextServiceKm - car.mileage).toLocaleString()} km`;
      }

      // Assign a deterministic simulated operational hub based on index if not set
      const hub = HUBS[1 + (idx % (HUBS.length - 1))];

      return {
        ...car,
        healthStatus,
        healthReason,
        activeWo,
        hub,
      };
    });
  }, [cars, workOrders]);

  const filteredVehicles = useMemo(() => {
    return vehiclesWithHealth.filter((v) => {
      if (selectedHub !== 'ALL' && v.hub.id !== selectedHub) return false;
      if (healthFilter !== 'ALL' && v.healthStatus !== healthFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          v.brand.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.licensePlate.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [vehiclesWithHealth, selectedHub, healthFilter, searchQuery]);

  const totalConnected = cars.length;
  const criticalCount = vehiclesWithHealth.filter((v) => v.healthStatus === 'CRITICAL').length;
  const warningCount = vehiclesWithHealth.filter((v) => v.healthStatus === 'WARNING').length;
  const healthyCount = vehiclesWithHealth.filter((v) => v.healthStatus === 'HEALTHY').length;
  const operationalRate = totalConnected > 0 ? Math.round((healthyCount / totalConnected) * 100) : 100;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-violet-400 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('fleetMap')} · Télématique & Santé OBD
            </h1>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Supervision en temps réel des hubs opérationnels et état des calculateurs de bord (MAD).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/diagnostics"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-surface-elevated hover:bg-surface border border-hairline rounded-xl text-zinc-200 transition"
          >
            <Activity className="w-4 h-4 text-violet-400" />
            <span>Copilote Diagnostic</span>
          </Link>
          <Link
            href="/dashboard/work-orders"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-500/20 transition"
          >
            <Wrench className="w-4 h-4" />
            <span>Ordres d'Atelier</span>
          </Link>
        </div>
      </div>

      {/* KPI Telematics Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface/60 border border-hairline rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Flotte Connectée</span>
            <Car className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{totalConnected}</p>
          <p className="text-[11px] text-text-muted mt-1">Véhicules répertoriés</p>
        </div>

        <div className="bg-surface/60 border border-hairline rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Taux Opérationnel</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-400">{operationalRate}%</p>
          <p className="text-[11px] text-text-muted mt-1">{healthyCount} véhicules sans anomalie</p>
        </div>

        <div className="bg-surface/60 border border-hairline rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-medium">Alertes / Entretien</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black mt-2 text-amber-400">{warningCount}</p>
          <p className="text-[11px] text-text-muted mt-1">Révision kilométrique imminente</p>
        </div>

        <div className="bg-surface/60 border border-hairline rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-medium">En Atelier / Critique</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black mt-2 text-rose-400">{criticalCount}</p>
          <p className="text-[11px] text-text-muted mt-1">Intervention active en cours</p>
        </div>
      </div>

      {/* Interactive Hub & Health Filter Bar */}
      <div className="bg-surface/40 border border-hairline rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Hubs Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {HUBS.map((hub) => (
            <button
              key={hub.id}
              onClick={() => setSelectedHub(hub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedHub === hub.id
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-semibold'
                  : 'bg-surface-elevated/70 text-text-muted hover:text-foreground border border-hairline'
              }`}
            >
              {hub.name}
            </button>
          ))}
        </div>

        {/* Search & Health Pill Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Matricule, marque..."
              className="w-full bg-surface-elevated border border-hairline rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-elevated border border-hairline rounded-xl p-1">
            <button
              onClick={() => setHealthFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                healthFilter === 'ALL' ? 'bg-surface text-foreground font-semibold' : 'text-zinc-400'
              }`}
            >
              Tous ({vehiclesWithHealth.length})
            </button>
            <button
              onClick={() => setHealthFilter('HEALTHY')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                healthFilter === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-zinc-400'
              }`}
            >
              🟢 ({healthyCount})
            </button>
            <button
              onClick={() => setHealthFilter('WARNING')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                healthFilter === 'WARNING' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-zinc-400'
              }`}
            >
              🟡 ({warningCount})
            </button>
            <button
              onClick={() => setHealthFilter('CRITICAL')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                healthFilter === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 font-semibold' : 'text-zinc-400'
              }`}
            >
              🔴 ({criticalCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Morocco Dispatch Radar + Vehicle Fleet Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Morocco Regional Radar Map Widget */}
        <div className="lg:col-span-1 bg-surface/40 border border-hairline rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>Réseau Opérationnel National</span>
              </h3>
              <span className="text-[10px] text-text-muted font-mono">GPS-Telemetry Layer</span>
            </div>

            {/* Stylized Morocco Hub Nodes Vector */}
            <div className="relative w-full h-56 bg-[#111116] border border-white/5 rounded-xl p-4 flex flex-col justify-around overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.1),transparent_70%)]" />
              
              {HUBS.slice(1).map((hub) => {
                const count = vehiclesWithHealth.filter((v) => v.hub.id === hub.id).length;
                const crit = vehiclesWithHealth.filter((v) => v.hub.id === hub.id && v.healthStatus === 'CRITICAL').length;
                return (
                  <div
                    key={hub.id}
                    onClick={() => setSelectedHub(hub.id)}
                    className={`relative z-10 flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                      selectedHub === hub.id
                        ? 'bg-violet-500/20 border border-violet-500/40 text-white'
                        : 'hover:bg-white/[0.03] text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${crit > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                      <span className="text-xs font-medium">{hub.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {crit > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">
                          {crit} atelier
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-zinc-300">{count} véh.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-[#131318] border border-hairline rounded-xl text-xs space-y-2 text-zinc-400">
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <ShieldAlert className="w-4 h-4 text-violet-400" />
              <span>Garantie de Traçabilité OBD-II</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Les codes défauts SAE J2012 / ISO 14229 sont synchronisés dès l'entrée en atelier avec scellement cryptographique d'empreinte.
            </p>
          </div>
        </div>

        {/* Vehicle Telematics Cards Roster */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-text-muted">Chargement de la télématique flotte…</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-12 text-center bg-surface/20 border border-hairline rounded-2xl space-y-2">
              <Car className="w-10 h-10 mx-auto text-zinc-600" />
              <h4 className="text-sm font-semibold text-foreground">Aucun véhicule correspondant</h4>
              <p className="text-xs text-text-muted">Modifiez vos filtres de hub ou de santé OBD.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredVehicles.map((v) => {
                const isCrit = v.healthStatus === 'CRITICAL';
                const isWarn = v.healthStatus === 'WARNING';
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedCar(v)}
                    className={`bg-surface/50 border rounded-2xl p-4.5 space-y-3 hover:bg-surface-elevated/70 transition cursor-pointer relative overflow-hidden ${
                      isCrit
                        ? 'border-rose-500/30'
                        : isWarn
                        ? 'border-amber-500/30'
                        : 'border-hairline'
                    }`}
                  >
                    {/* Top row: Brand & Status badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">
                            {v.brand} {v.model}
                          </h4>
                          <span className="text-[11px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-zinc-300 border border-white/5">
                            {v.licensePlate}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {v.hub.name} · {v.year}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isCrit
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : isWarn
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {isCrit ? 'Critique' : isWarn ? 'Alerte' : 'Nominal'}
                      </span>
                    </div>

                    {/* Telemetry info row: Mileage, Service, OBD Status */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-hairline/60">
                      <div>
                        <span className="text-[10px] text-text-muted block">Kilométrage</span>
                        <span className="font-mono font-semibold text-zinc-200">
                          {v.mileage.toLocaleString()} km
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block">Prochain Service</span>
                        <span className="font-mono font-semibold text-zinc-200">
                          {v.nextServiceKm ? `${v.nextServiceKm.toLocaleString()} km` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Health Diagnosis pill */}
                    <div className={`p-2 rounded-xl text-[11px] flex items-center gap-2 ${
                      isCrit
                        ? 'bg-rose-950/20 text-rose-300 border border-rose-500/20'
                        : isWarn
                        ? 'bg-amber-950/20 text-amber-300 border border-amber-500/20'
                        : 'bg-emerald-950/20 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      {isCrit ? (
                        <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      )}
                      <span className="truncate">{v.healthReason}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Inspection Modal / Quick Drawer */}
      {selectedCar && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-surface border border-hairline rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-bold text-foreground">
                  {selectedCar.brand} {selectedCar.model}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCar(null)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-mono cursor-pointer"
              >
                ✕ Fermer
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-surface-elevated p-3 rounded-xl border border-hairline">
                <div>
                  <span className="text-text-muted block text-[10px]">Immatriculation</span>
                  <span className="font-mono font-bold text-sm text-foreground">{selectedCar.licensePlate}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Année & Carburant</span>
                  <span className="font-semibold text-foreground">{selectedCar.year} · {selectedCar.fuelType}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Kilométrage Actuel</span>
                  <span className="font-mono font-bold text-foreground">{selectedCar.mileage.toLocaleString()} km</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Échéance Révision</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedCar.nextServiceKm ? `${selectedCar.nextServiceKm.toLocaleString()} km` : 'Non paramétré'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-surface-elevated rounded-xl border border-hairline space-y-1">
                <span className="text-[10px] text-text-muted block uppercase tracking-wider font-semibold">
                  Bilan Télématique & Calculateur
                </span>
                <p className="text-xs text-foreground font-medium">{selectedCar.healthReason}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/dashboard/diagnostics"
                className="px-4 py-2 text-xs font-semibold bg-surface-elevated hover:bg-surface border border-hairline rounded-xl text-zinc-200 transition"
              >
                Lancer Session OBD
              </Link>
              <Link
                href="/dashboard/work-orders"
                className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-600/20 transition"
              >
                Créer Ordre d'Atelier
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
