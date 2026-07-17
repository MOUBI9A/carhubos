"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  ShieldAlert,
  UserX,
  Search,
  Globe,
  Lock,
  ShieldCheck,
  Ban,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

interface BlacklistedCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  identityType: string;
  identityNumber: string;
  nationality: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const BLACKLIST_REASONS = [
  'VEHICLE_THEFT_ATTEMPT',
  'FRAUDULENT_DOCUMENTS',
  'MAJOR_UNPAID_FINES',
  'EXTREME_RECKLESS_DRIVING',
  'SYSTEMATIC_NON_PAYMENT',
  'IDENTITY_FRAUD',
  'CAR_PARTS_THEFT',
  'OTHER',
];

export default function NetworkBlacklist() {
  const { showToast } = useToast();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [blacklist, setBlacklist] = useState<BlacklistedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchBlacklist = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/customers/blacklisted');
      setBlacklist(res.data);
    } catch (err: any) {
      // If the endpoint isn't live yet, gracefully show empty state
      setBlacklist([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlacklist();
  }, [fetchBlacklist]);

  const handleBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const customerId = formData.get('customerId') as string;
    const reason = formData.get('reason') as string;

    if (!customerId.trim()) {
      showToast('danger', 'Missing ID', 'Please enter a customer ID to blacklist.');
      return;
    }

    try {
      await api.patch(`/customers/${customerId}/blacklist`, { reason });
      setIsReportModalOpen(false);
      showToast('success', 'Actor Flagged', 'Customer has been added to the blacklist network.');
      fetchBlacklist();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to blacklist customer';
      showToast('danger', 'Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    }
  };

  const handleUnblacklist = async (customerId: string, name: string) => {
    setRemovingId(customerId);
    try {
      await api.patch(`/customers/${customerId}/unblacklist`);
      setBlacklist(prev => prev.filter(c => c.id !== customerId));
      showToast('success', 'Access Restored', `${name} has been removed from the blacklist.`);
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not restore access.');
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = blacklist.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.identityNumber.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            Network <span className="text-danger">Blacklist</span>
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
            <Globe className="w-3 h-3 text-danger" />
            Renter Risk Registry — Tenant Scope
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchBlacklist}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </Button>
          <Button onClick={() => setIsReportModalOpen(true)} variant="danger" className="h-12 px-8">
            <UserX className="w-4 h-4 mr-2" />
            Flag Bad Actor
          </Button>
        </div>
      </header>

      {/* Stats HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-danger/5 border-danger/20 relative overflow-hidden group">
          <ShieldAlert className="absolute -right-4 -bottom-4 w-32 h-32 text-danger opacity-5 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black text-danger uppercase tracking-[0.2em] mb-4">Flagged Actors</p>
          <CardTitle className="text-3xl font-black text-white italic">{blacklist.length}</CardTitle>
          <p className="text-[9px] font-bold text-white/20 uppercase mt-1 tracking-widest">Active blacklist entries</p>
        </Card>
        <Card className="border-white/5 shadow-2xl relative overflow-hidden group">
          <Globe className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-5 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Registry Coverage</p>
          <CardTitle className="text-3xl font-black text-white italic">Agency</CardTitle>
          <p className="text-[9px] font-bold text-white/20 uppercase mt-1 tracking-widest">Tenant-scoped blacklist</p>
        </Card>
        <Card className="bg-primary/5 border-primary/20 relative overflow-hidden group">
          <Lock className="absolute -right-4 -bottom-4 w-32 h-32 text-primary opacity-5 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Network Status</p>
          <CardTitle className="text-3xl font-black text-white italic">Active</CardTitle>
          <p className="text-[9px] font-bold text-white/20 uppercase mt-1 tracking-widest">Auto-block on booking</p>
        </Card>
      </div>

      {/* Blacklist Table */}
      <Card padding="none" className="overflow-hidden border-white/5 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <Search className="w-5 h-5 text-white/20 shrink-0" />
            <input
              placeholder="Search by name, ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-white w-full placeholder:text-white/20"
            />
          </div>
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
            {filtered.length} Record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <ShieldCheck className="w-16 h-16 text-success/20" />
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
              {searchQuery ? 'No matching records found' : 'Blacklist is Empty'}
            </p>
            <p className="text-[9px] text-white/10">
              {searchQuery ? 'Try a different search term' : 'No actors have been flagged in this agency'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((customer) => (
              <div key={customer.id} className="p-6 flex items-center justify-between hover:bg-danger/[0.02] transition-colors group">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center justify-center">
                    <Ban className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-black text-white uppercase tracking-tight italic">
                        {customer.firstName} {customer.lastName}
                      </h4>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded tracking-widest border bg-danger/10 text-danger border-danger/20">
                        BLACKLISTED
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                      {customer.identityType}: <span className="text-white/60">{customer.identityNumber}</span> •&nbsp;
                      {customer.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-right">
                  <div>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Flagged</p>
                    <p className="text-xs font-bold text-white/60">
                      {new Date(customer.updatedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity border-success/20 text-success hover:bg-success/10"
                    onClick={() => handleUnblacklist(customer.id, `${customer.firstName} ${customer.lastName}`)}
                    disabled={removingId === customer.id}
                  >
                    {removingId === customer.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Network immunity info */}
      <Card className="bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-1" />
          <div>
            <CardTitle className="text-primary text-xs uppercase tracking-widest">Blacklist Enforcement Protocol</CardTitle>
            <p className="text-xs text-white/60 leading-relaxed mt-2 font-medium">
              Blacklisted customers are automatically blocked during the booking creation flow. 
              The Guardian system checks identity status in real-time. Future upgrade: cross-agency network sync.
            </p>
          </div>
        </div>
      </Card>

      {/* Flag Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Flag Bad Actor"
        description="Add a customer to the agency blacklist"
      >
        <form className="space-y-6" onSubmit={handleBlacklist}>
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-white/60 font-medium leading-relaxed">
              This action immediately prevents the customer from making new bookings. Requires the customer to already exist in your CRM.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Customer ID</p>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                name="customerId"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-danger transition-all"
                placeholder="Customer UUID from CRM..."
              />
            </div>
            <p className="text-[9px] text-white/20 px-1">Find the customer ID in the Customer CRM module.</p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Reason for Flag</p>
            <select name="reason" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white outline-none appearance-none focus:border-danger transition-all">
              {BLACKLIST_REASONS.map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="danger" className="w-full py-5 font-black uppercase tracking-[0.2em] shadow-2xl shadow-danger/20">
            Execute Flag
          </Button>
        </form>
      </Modal>
    </div>
  );
}
