"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, LogIn, SlidersHorizontal, AlertTriangle, RefreshCw, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useAdminOverview, type PlatformAgency } from '../useAdminOverview';

const PLANS = ['BETA', 'STARTER', 'PRO', 'BUSINESS'];
const STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED'];

const STATUS_CHIP: Record<string, string> = {
  TRIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACTIVE: 'bg-success/10 text-success border-success/20',
  PAST_DUE: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  SUSPENDED: 'bg-danger/10 text-danger border-danger/20',
  CANCELED: 'bg-white/5 text-white/40 border-white/10',
  NONE: 'bg-white/5 text-white/40 border-white/10',
};

export default function AgencyManagement() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useAdminOverview();
  const [managed, setManaged] = useState<PlatformAgency | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const impersonate = async (agency: PlatformAgency) => {
    setBusyId(agency.id);
    try {
      await api.post(`/saas-admin/agency/${agency.id}/impersonate`);
      // Full reload so AuthContext re-hydrates from the swapped cookie as the
      // impersonated owner (the banner then renders in the dashboard).
      window.location.replace('/dashboard');
    } catch (err: any) {
      showToast('danger', 'Impersonation Failed', err?.response?.data?.message || 'Could not start the session.');
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Agency Management</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">
            Tenants, subscriptions &amp; support
          </p>
        </div>
        <Button onClick={() => router.push('/admin/provision')}>
          <Plus className="w-4 h-4 mr-2" />
          Provision Agency
        </Button>
      </header>

      {isLoading ? (
        <Card><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div></Card>
      ) : error || !data ? (
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/20">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <p className="text-xs font-medium text-white/40">{error || 'No data'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry</Button>
          </div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden border-white/5 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Agency</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Plan</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Fleet · Seats</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.agencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {agency.name?.[0] || 'A'}
                        </div>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">{agency.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded-md text-white/60 tracking-widest">
                        {agency.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-white/70">
                      {agency.fleetSize} · {agency.seats}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('text-[9px] font-black px-2 py-1 rounded-md tracking-widest border', STATUS_CHIP[agency.subscriptionStatus] ?? STATUS_CHIP.NONE)}>
                        {agency.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[9px] h-auto py-1.5"
                          isLoading={busyId === agency.id}
                          onClick={() => impersonate(agency)}
                        >
                          <LogIn className="w-3.5 h-3.5 mr-1" /> Impersonate
                        </Button>
                        <Button variant="outline" size="sm" className="text-[9px] h-auto py-1.5" onClick={() => setManaged(agency)}>
                          <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Manage
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {managed && (
        <ManageModal
          agency={managed}
          onClose={() => setManaged(null)}
          onSaved={() => { setManaged(null); refetch(); }}
        />
      )}
    </div>
  );
}

function ManageModal({
  agency,
  onClose,
  onSaved,
}: {
  agency: PlatformAgency;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [planKey, setPlanKey] = useState(agency.tier);
  const [status, setStatus] = useState(agency.subscriptionStatus === 'NONE' ? 'ACTIVE' : agency.subscriptionStatus);
  const [extendDays, setExtendDays] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [invoicing, setInvoicing] = useState(false);

  const saveSubscription = async () => {
    setSaving(true);
    try {
      const body: any = { planKey, status };
      if (extendDays) body.extendTrialDays = Number(extendDays);
      await api.patch(`/saas-admin/agency/${agency.id}/subscription`, body);
      showToast('success', 'Subscription Updated', `${agency.name} is now on ${planKey} (${status}).`);
      onSaved();
    } catch (err: any) {
      showToast('danger', 'Update Failed', err?.response?.data?.message || 'Could not update the subscription.');
    } finally {
      setSaving(false);
    }
  };

  const issueInvoice = async () => {
    const amount = Number(invoiceAmount);
    if (!amount || amount <= 0) {
      showToast('danger', 'Invalid Amount', 'Enter an invoice amount in MAD.');
      return;
    }
    setInvoicing(true);
    try {
      await api.post(`/saas-admin/agency/${agency.id}/invoice`, { amount });
      showToast('success', 'Invoice Issued', `${amount} MAD invoice issued to ${agency.name}.`);
      setInvoiceAmount('');
    } catch (err: any) {
      showToast('danger', 'Invoice Failed', err?.response?.data?.message || 'Could not issue the invoice.');
    } finally {
      setInvoicing(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Manage — ${agency.name}`} description="Subscription & billing">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Plan</p>
          <div className="grid grid-cols-4 gap-2">
            {PLANS.map((p) => (
              <button
                key={p}
                onClick={() => setPlanKey(p)}
                className={cn('p-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
                  planKey === p ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20')}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Lifecycle Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn('px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all',
                  status === s ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Extend trial (days, optional)</p>
          <input
            type="number"
            min={1}
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors"
            placeholder="e.g. 14"
          />
        </div>

        <Button className="w-full" isLoading={saving} onClick={saveSubscription}>
          Save Subscription
        </Button>

        <div className="pt-6 border-t border-white/10 space-y-1.5">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Issue a platform invoice (MAD)
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors"
              placeholder="799"
            />
            <Button variant="outline" isLoading={invoicing} onClick={issueInvoice}>Issue</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
