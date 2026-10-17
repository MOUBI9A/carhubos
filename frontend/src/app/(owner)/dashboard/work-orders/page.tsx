"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  CheckSquare,
  ShieldAlert,
  Car,
  ChevronRight,
  Filter,
  FileDown,
  Share2,
  Check,
} from 'lucide-react';

interface PartItem {
  partNumber: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  description: string;
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  partsTotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  dtcCleared: boolean;
  verificationNotes: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number | null;
    vin: string | null;
  };
  fleetCar?: {
    id: string;
    brand: string;
    model: string;
    licensePlate: string;
  };
  assignedTechnician?: {
    id: string;
    name: string;
    email: string;
  };
}

const NEXT_STATUSES: Record<string, string[]> = {
  DRAFT: ['AWAITING_APPROVAL', 'APPROVED', 'CANCELLED'],
  AWAITING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_PARTS', 'BLOCKED', 'READY_FOR_QUALITY_CHECK', 'CANCELLED'],
  WAITING_FOR_PARTS: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'WAITING_FOR_PARTS', 'CANCELLED'],
  READY_FOR_QUALITY_CHECK: ['QUALITY_CHECK', 'IN_PROGRESS'],
  QUALITY_CHECK: ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED: ['INVOICED'],
  INVOICED: [],
  CANCELLED: [],
};

export default function WorkOrdersPage() {
  const t = useTranslations('workOrders');
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [laborHours, setLaborHours] = useState(1.5);
  const [laborRate, setLaborRate] = useState(300);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [partNo, setPartNo] = useState('');
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState(0);

  // Status transition state
  const [targetStatus, setTargetStatus] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');

  // Verification state
  const [verificationNotes, setVerificationNotes] = useState('');
  const [dtcCleared, setDtcCleared] = useState(true);

  // Queries
  const { data: orders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ['work-orders', filterStatus],
    queryFn: async () => {
      const params = filterStatus !== 'ALL' ? { status: filterStatus } : {};
      const res = await api.get('/work-orders', { params });
      return res.data;
    },
  });

  const { data: diagnosticVehicles = [] } = useQuery({
    queryKey: ['diagnostic-vehicles'],
    queryFn: async () => {
      const res = await api.get('/diagnostics/vehicles');
      return res.data;
    },
  });

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/work-orders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setIsCreateOpen(false);
      resetCreateForm();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await api.patch(`/work-orders/${id}/status`, { status, notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setIsStatusOpen(false);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verificationNotes, dtcCleared }: { id: string; verificationNotes: string; dtcCleared: boolean }) => {
      const res = await api.post(`/work-orders/${id}/verify`, { verificationNotes, dtcCleared });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setIsVerifyOpen(false);
    },
  });

  const resetCreateForm = () => {
    setDescription('');
    setPriority('MEDIUM');
    setLaborHours(1.5);
    setLaborRate(300);
    setParts([]);
    setSelectedVehicleId('');
  };

  const handleAddPart = () => {
    if (!partNo || !partName || partQty <= 0) return;
    setParts([...parts, { partNumber: partNo, name: partName, quantity: partQty, unitPrice: partPrice }]);
    setPartNo('');
    setPartName('');
    setPartQty(1);
    setPartPrice(0);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      vehicleId: selectedVehicleId || undefined,
      description,
      priority,
      laborHours,
      laborRate,
      parts,
    });
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'COMPLETED':
      case 'INVOICED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'QUALITY_CHECK':
      case 'READY_FOR_QUALITY_CHECK':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'WAITING_FOR_PARTS':
      case 'BLOCKED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          </div>
          <p className="text-sm text-text-muted mt-1">{t('description')}</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition shadow-lg shadow-violet-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t('newOrder')}
        </button>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface/60 border border-hairline rounded-xl p-4">
          <p className="text-xs text-text-muted font-medium">Total Orders</p>
          <p className="text-2xl font-semibold mt-1">{orders.length}</p>
        </div>
        <div className="bg-surface/60 border border-hairline rounded-xl p-4">
          <p className="text-xs text-blue-400 font-medium">In Progress</p>
          <p className="text-2xl font-semibold mt-1">
            {orders.filter((o) => o.status === 'IN_PROGRESS').length}
          </p>
        </div>
        <div className="bg-surface/60 border border-hairline rounded-xl p-4">
          <p className="text-xs text-amber-400 font-medium">Waiting for Parts</p>
          <p className="text-2xl font-semibold mt-1">
            {orders.filter((o) => o.status === 'WAITING_FOR_PARTS').length}
          </p>
        </div>
        <div className="bg-surface/60 border border-hairline rounded-xl p-4">
          <p className="text-xs text-emerald-400 font-medium">Completed / Verified</p>
          <p className="text-2xl font-semibold mt-1">
            {orders.filter((o) => o.status === 'COMPLETED' || o.status === 'INVOICED').length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline pb-2 overflow-x-auto">
        {['ALL', 'DRAFT', 'APPROVED', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'QUALITY_CHECK', 'COMPLETED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              filterStatus === s
                ? 'bg-surface-elevated text-foreground border border-hairline'
                : 'text-text-muted hover:text-foreground'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-surface/40 border border-hairline rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-text-muted">Loading shop work orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Wrench className="w-10 h-10 mx-auto text-zinc-500" />
            <h3 className="font-semibold text-foreground">{t('noOrders')}</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">{t('emptyDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-hairline text-xs text-text-muted uppercase tracking-wider bg-surface/20">
                  <th className="py-3 px-4">{t('orderNumber')}</th>
                  <th className="py-3 px-4">{t('vehicle')}</th>
                  <th className="py-3 px-4">{t('priority')}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  <th className="py-3 px-4 text-right">{t('labor')}</th>
                  <th className="py-3 px-4 text-right">{t('parts')}</th>
                  <th className="py-3 px-4 text-right">{t('total')}</th>
                  <th className="py-3 px-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface/50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {order.orderNumber}
                      {order.dtcCleared && (
                        <span className="ms-2 inline-flex items-center text-[10px] text-emerald-400 gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> DTC Cleared
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {order.vehicle ? (
                        <span>{order.vehicle.brand} {order.vehicle.model} ({order.vehicle.year ?? 'N/A'})</span>
                      ) : order.fleetCar ? (
                        <span>{order.fleetCar.brand} {order.fleetCar.model} · {order.fleetCar.licensePlate}</span>
                      ) : (
                        <span className="italic">General Shop</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${priorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{Number(order.laborTotal).toLocaleString()} MAD</td>
                    <td className="py-3 px-4 text-right font-mono">{Number(order.partsTotal).toLocaleString()} MAD</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                      {Number(order.totalAmount).toLocaleString()} MAD
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'COMPLETED' ? (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setTargetStatus('INVOICED');
                              setIsStatusOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded transition cursor-pointer"
                          >
                            Generate Invoice
                          </button>
                        ) : NEXT_STATUSES[order.status]?.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setTargetStatus(NEXT_STATUSES[order.status][0]);
                              setIsStatusOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-surface-elevated hover:bg-surface border border-hairline rounded transition cursor-pointer"
                          >
                            {t('advanceStatus')}
                          </button>
                        )}
                        {(order.status === 'QUALITY_CHECK' || order.status === 'IN_PROGRESS') && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setVerificationNotes(order.verificationNotes ?? '');
                              setDtcCleared(order.dtcCleared);
                              setIsVerifyOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 rounded transition cursor-pointer"
                          >
                            {t('postRepairVerify')}
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              const res = await api.get(`/work-orders/${order.id}/pdf`, {
                                responseType: 'blob',
                              });
                              const blob = new Blob([res.data], { type: 'application/pdf' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `JobCard-${order.orderNumber}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (e) {
                              console.error('Failed to download Work Order PDF', e);
                            }
                          }}
                          title="Télécharger Ordre de Réparation / Facture PDF"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-surface-elevated hover:bg-surface border border-hairline rounded transition text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5 text-violet-400" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await api.get(`/work-orders/${order.id}/share-link`);
                              const link = `${window.location.origin}${res.data.sharePath}`;
                              await navigator.clipboard.writeText(link);
                              setCopiedId(order.id);
                              setTimeout(() => setCopiedId(null), 2500);
                            } catch (e) {
                              console.error('Failed to get approval share link', e);
                            }
                          }}
                          title="Copier le lien d'approbation client en ligne"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-surface-elevated hover:bg-surface border border-hairline rounded transition text-zinc-300 hover:text-white cursor-pointer"
                        >
                          {copiedId === order.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copié !</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Lien Client</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-hairline rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-foreground">{t('newOrder')}</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('vehicle')}</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-surface-elevated border border-hairline rounded-lg px-3 py-2 text-foreground"
                >
                  <option value="">Choose a diagnostic vehicle (optional)</option>
                  {diagnosticVehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.year ?? 'N/A'}) {v.vin ? `· ${v.vin}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('priority')}</label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full bg-surface-elevated border border-hairline rounded-lg px-3 py-2 text-foreground"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('descriptionLabel')}</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-elevated border border-hairline rounded-lg px-3 py-2 text-foreground"
                  placeholder="e.g. Replace Cylinder 1 Ignition Coil and perform intake leak test"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">{t('laborHours')}</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={laborHours}
                    onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
                    className="w-full bg-surface-elevated border border-hairline rounded-lg px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">{t('laborRate')}</label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={laborRate}
                    onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-surface-elevated border border-hairline rounded-lg px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              {/* Parts section */}
              <div className="border border-hairline rounded-lg p-3 space-y-3 bg-surface/30">
                <p className="text-xs font-medium text-foreground">{t('parts')}</p>
                <div className="grid grid-cols-12 gap-2 text-xs">
                  <input
                    placeholder={t('partNumber')}
                    value={partNo}
                    onChange={(e) => setPartNo(e.target.value)}
                    className="col-span-3 bg-surface-elevated border border-hairline rounded px-2 py-1.5"
                  />
                  <input
                    placeholder={t('partName')}
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    className="col-span-4 bg-surface-elevated border border-hairline rounded px-2 py-1.5"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder={t('quantity')}
                    value={partQty}
                    onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                    className="col-span-2 bg-surface-elevated border border-hairline rounded px-2 py-1.5"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder={t('unitPrice')}
                    value={partPrice}
                    onChange={(e) => setPartPrice(parseFloat(e.target.value) || 0)}
                    className="col-span-2 bg-surface-elevated border border-hairline rounded px-2 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="col-span-1 bg-violet-600 text-white rounded font-bold"
                  >
                    +
                  </button>
                </div>
                {parts.length > 0 && (
                  <ul className="divide-y divide-hairline text-xs">
                    {parts.map((p, idx) => (
                      <li key={idx} className="py-1 flex justify-between">
                        <span>{p.quantity}x {p.name} ({p.partNumber})</span>
                        <span className="font-mono">{(p.quantity * p.unitPrice).toLocaleString()} MAD</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-hairline rounded-lg text-text-muted hover:text-foreground"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
                >
                  {createMutation.isPending ? 'Saving…' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance Status Modal */}
      {isStatusOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-hairline rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">{t('advanceStatus')} — {selectedOrder.orderNumber}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-text-muted">{t('currentStatus')}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${statusColor(selectedOrder.status)}`}>
                  {selectedOrder.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('targetStatus')}</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full bg-surface-elevated border border-hairline rounded-lg px-3 py-2 text-foreground"
                >
                  {NEXT_STATUSES[selectedOrder.status]?.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('notes')}</label>
                <textarea
                  rows={2}
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  placeholder="Notes explaining this progression…"
                  className="w-full bg-surface-elevated border border-hairline rounded-lg px-3 py-2 text-foreground"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStatusOpen(false)}
                  className="px-4 py-2 border border-hairline rounded-lg text-text-muted"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: targetStatus, notes: transitionNotes })}
                  disabled={statusMutation.isPending}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
                >
                  {statusMutation.isPending ? 'Updating…' : t('submitStatus')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post-Repair Verification Modal */}
      {isVerifyOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-hairline rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <CheckSquare className="w-5 h-5" />
              <h2 className="text-lg font-bold text-foreground">{t('postRepairVerify')}</h2>
            </div>
            <p className="text-xs text-text-muted">
              Confirm physical repair completion, road test telemetry, and that diagnostic trouble codes have been cleared and verified.
            </p>
            <div className="space-y-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer bg-surface/50 p-3 rounded-lg border border-hairline">
                <input
                  type="checkbox"
                  checked={dtcCleared}
                  onChange={(e) => setDtcCleared(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
                <span className="text-xs font-medium text-foreground">{t('dtcCleared')}</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('verificationNotes')}</label>
                <textarea
                  rows={3}
                  required
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Cleared DTC P0301; road tested 12km on highway and city. No pending or historical codes. Idle RPM stable at 780."
                  className="w-full bg-surface-elevated border border-hairline rounded-lg px-3 py-2 text-foreground text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyOpen(false)}
                  className="px-4 py-2 border border-hairline rounded-lg text-text-muted text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => verifyMutation.mutate({ id: selectedOrder.id, verificationNotes, dtcCleared })}
                  disabled={verifyMutation.isPending || !verificationNotes.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium"
                >
                  {verifyMutation.isPending ? 'Verifying…' : t('confirmVerification')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
