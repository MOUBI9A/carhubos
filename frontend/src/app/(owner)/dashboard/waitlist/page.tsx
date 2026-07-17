"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  Clock,
  MessageSquare,
  AlertCircle,
  TrendingDown,
  Plus,
  Phone,
  Zap,
  Trash2,
  CheckCircle2,
  DollarSign,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

interface RefusalLog {
  id: string;
  customerName: string;
  customerPhone: string;
  requestedCarType: string;
  requestedStartDate: string;
  requestedEndDate: string;
  potentialRevenue: number;
  status: 'WAITING' | 'RECOVERED' | 'LOST';
  createdAt: string;
}

export default function WaitlistRefusals() {
  const { showToast } = useToast();
  const [isRefusalModalOpen, setIsRefusalModalOpen] = useState(false);
  const [refusals, setRefusals] = useState<RefusalLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRefusals = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/refusal-logs');
      setRefusals(res.data);
    } catch (err: any) {
      showToast('danger', 'Load Failed', err?.response?.data?.message || 'Could not load waitlist data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefusals();
  }, [fetchRefusals]);

  const handleAddRefusal = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    setIsSubmitting(true);
    try {
      await api.post('/refusal-logs', {
        customerName: formData.get('name') as string,
        customerPhone: formData.get('phone') as string,
        requestedCarType: formData.get('carType') as string,
        requestedStartDate: new Date().toISOString(),
        requestedEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        potentialRevenue: Number(formData.get('value')) || 0,
        status: 'WAITING',
      });
      setIsRefusalModalOpen(false);
      showToast('success', 'Demand Logged', 'Refusal instance has been recorded for fleet optimization.');
      fetchRefusals();
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not log refusal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markRecovered = async (id: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/refusal-logs/${id}/status`, { status: 'RECOVERED' });
      setRefusals(prev => prev.map(r => r.id === id ? { ...r, status: 'RECOVERED' } : r));
      showToast('success', 'Revenue Recovered', 'Waitlist entry successfully converted to active booking.');
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const markLost = async (id: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/refusal-logs/${id}/status`, { status: 'LOST' });
      setRefusals(prev => prev.filter(r => r.id !== id));
      showToast('info', 'Record Cleared', 'Demand log marked as lost and removed from queue.');
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const waitingRefusals = refusals.filter(r => r.status === 'WAITING');
  const recoveredRefusals = refusals.filter(r => r.status === 'RECOVERED');
  const totalOpportunityLoss = waitingRefusals.reduce((sum, r) => sum + r.potentialRevenue, 0);
  const recoveryRate = refusals.length > 0 ? Math.round((recoveredRefusals.length / refusals.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Waitlist & Refusals</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">Demand Capture & Revenue Recovery</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchRefusals}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <div className="hidden md:flex bg-danger/10 border border-danger/20 px-4 py-2 rounded-xl items-center gap-3">
            <TrendingDown className="w-4 h-4 text-danger" />
            <div>
              <p className="text-[8px] font-black text-danger uppercase tracking-widest">Aggregate Opportunity Loss</p>
              <p className="text-xs font-black text-white">{totalOpportunityLoss.toLocaleString()} MAD</p>
            </div>
          </div>
          <Button onClick={() => setIsRefusalModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Log Refusal
          </Button>
        </div>
      </header>

      {/* Recovery metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-primary/5 border-primary/20 relative overflow-hidden group">
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
          <div className="flex items-start gap-4 relative z-10">
            <AlertCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <CardTitle className="text-primary uppercase tracking-tighter">Acquisition Intelligence</CardTitle>
              <p className="text-xs text-white/60 leading-relaxed mt-2 font-medium">
                You have <span className="text-white font-bold">{waitingRefusals.length} open demand signals</span> this period. 
                Aggregate opportunity: <span className="text-white font-bold">{totalOpportunityLoss.toLocaleString()} MAD</span>.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-white/5 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="uppercase tracking-widest text-[10px] text-white/40">Recovery Intensity</CardTitle>
            <Zap className="w-4 h-4 text-success animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-success shadow-[0_0_12px_rgba(34,197,94,0.4)] transition-all duration-1000"
                style={{ width: `${recoveryRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-success">{recoveryRate}% RECOVERED</span>
              <span className="text-white/20">{refusals.length} Total Logged</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Queue */}
      <div className="space-y-6">
        <CardHeader className="px-0">
          <CardTitle className="uppercase tracking-widest text-white/60">Forensic Demand Queue</CardTitle>
          <CardDescription>{waitingRefusals.length} active signal{waitingRefusals.length !== 1 ? 's' : ''} awaiting recovery</CardDescription>
        </CardHeader>

        {waitingRefusals.length === 0 ? (
          <Card className="py-16 flex flex-col items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-success/20 mb-4" />
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No Pending Demand Signals</p>
            <p className="text-[9px] text-white/10 mt-1">All waitlist entries have been resolved</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {waitingRefusals.map((item) => (
              <Card key={item.id} variant="outline" className="flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-primary/50 transition-all relative overflow-hidden">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-white uppercase tracking-tight">{item.customerName}</h4>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-sm tracking-widest uppercase border bg-amber-500/10 text-amber-500 border-amber-500/20">
                        WAITING
                      </span>
                    </div>
                    <p className="text-xs text-white/40 font-medium">
                      {item.customerPhone} • <span className="text-primary/60 font-black uppercase tracking-widest text-[9px]">{item.requestedCarType}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 border-t md:border-t-0 border-white/5 pt-4 md:pt-0 w-full md:w-auto">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-danger uppercase tracking-widest">Value Delta</p>
                    <p className="text-sm font-black text-white">{item.potentialRevenue.toLocaleString()} MAD</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => markRecovered(item.id)}
                      disabled={updatingId === item.id}
                    >
                      {updatingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Zap className="w-3.5 h-3.5 mr-2" />}
                      Recover
                    </Button>
                    <button
                      onClick={() => markLost(item.id)}
                      disabled={updatingId === item.id}
                      className="p-2 text-white/10 hover:text-danger hover:bg-danger/10 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Recovered entries */}
        {recoveredRefusals.length > 0 && (
          <>
            <CardHeader className="px-0 pt-4">
              <CardTitle className="uppercase tracking-widest text-success/60 text-sm">Recovered Signals</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 gap-3">
              {recoveredRefusals.map((item) => (
                <Card key={item.id} variant="outline" className="flex items-center justify-between gap-4 opacity-60 border-success/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm uppercase tracking-tight">{item.customerName}</h4>
                      <p className="text-[9px] text-white/30 font-medium uppercase tracking-widest">{item.requestedCarType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-success uppercase tracking-widest">Recovered</p>
                    <p className="text-sm font-black text-white/60">{item.potentialRevenue.toLocaleString()} MAD</p>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Log Refusal Modal */}
      <Modal
        isOpen={isRefusalModalOpen}
        onClose={() => setIsRefusalModalOpen(false)}
        title="Log Rental Refusal"
        description="Quantify demand for fleet optimization"
      >
        <form onSubmit={handleAddRefusal} className="space-y-8">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Customer Identity</p>
            <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all" placeholder="Enter full name..." />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Contact Number</p>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input name="phone" required className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all" placeholder="+212 6..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Desired Tier</p>
              <select name="carType" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white outline-none appearance-none focus:border-primary transition-all">
                <option>ECONOMY</option>
                <option>COMPACT</option>
                <option>SUV</option>
                <option>LUXURY</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Opportunity Value (MAD)</p>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input name="value" type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all" placeholder="0" />
              </div>
            </div>
          </div>
          <div className="p-5 glass rounded-3xl border-primary/20 bg-primary/[0.03] flex items-center gap-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <p className="text-[10px] font-bold text-white/60 uppercase leading-relaxed">Demand signal will be logged and tracked for fleet optimization analytics.</p>
          </div>
          <Button type="submit" className="w-full py-4 font-black uppercase tracking-widest" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSubmitting ? 'Logging...' : 'Instantiate Demand Log'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
