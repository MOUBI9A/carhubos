"use client";

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { Modal } from '@/components/ui/Modal';
import {
  Briefcase,
  Bell,
  Users,
  Mail,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Phone,
  Globe,
  MapPin,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

interface AgencyMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Agency {
  id: string;
  name: string;
  contactEmail: string;
  businessPhone?: string;
  address?: string;
  website?: string;
  subscriptionTier: string;
  users: AgencyMember[];
}

const NUDGE_PRESETS = [
  { id: 'whatsapp_confirm', title: 'WhatsApp Confirmations', desc: 'Send auto-receipts to customers' },
  { id: 'guardian_alerts', title: 'Guardian Early Alerts', desc: 'Notify 30 days before document expiry' },
  { id: 'maintenance_reminders', title: 'Maintenance Reminders', desc: 'Alert 500km before oil change' },
  { id: 'blacklist_check', title: 'Blacklist Check', desc: 'Cross-reference agency risk database' },
];

const inputCls =
  'w-full bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-text-faint';

const labelCls = 'eyebrow block px-1 mb-1.5';

export default function OwnerSettings() {
  const t = useTranslations('ownerPages');
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubdomainModal, setIsSubdomainModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nudges, setNudges] = useState<Record<string, boolean>>({
    whatsapp_confirm: true,
    guardian_alerts: true,
    maintenance_reminders: false,
    blacklist_check: true,
  });

  const [agency, setAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    businessPhone: '',
    address: '',
    website: '',
  });

  const fetchAgency = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/agencies/me');
      setAgency(res.data);
      setForm({
        name: res.data.name || '',
        contactEmail: res.data.contactEmail || '',
        businessPhone: res.data.businessPhone || '',
        address: res.data.address || '',
        website: res.data.website || '',
      });
    } catch (err: any) {
      showToast('danger', 'Load Failed', err?.response?.data?.message || 'Could not load agency settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgency();
  }, [fetchAgency]);

  const handleSaveAgency = async () => {
    setIsSaving(true);
    try {
      const res = await api.patch('/agencies/me', form);
      setAgency(prev => prev ? { ...prev, ...res.data } : prev);
      showToast('success', 'Agency Updated', 'Business identity synchronized across the platform.');
    } catch (err: any) {
      showToast('danger', 'Save Failed', err?.response?.data?.message || 'Could not save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleNudge = (key: string) => {
    setNudges(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast('info', 'Preference Updated', `${NUDGE_PRESETS.find(n => n.id === key)?.title} ${updated[key] ? 'enabled' : 'disabled'}.`);
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('agencySettings')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">Operational rules and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {agency && (
            <Badge variant="outline" className="hidden md:inline-flex gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              {agency.subscriptionTier}
            </Badge>
          )}
          <Button variant="outline" onClick={fetchAgency}>
            <RefreshCw className="w-4 h-4 me-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Business Identity */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-text-muted" />
              </div>
              <CardTitle>Business identity</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4 flex-1">
            {[
              { key: 'name', label: 'Agency name', placeholder: 'e.g. CIG CAR Casablanca', icon: Briefcase },
              { key: 'contactEmail', label: 'Contact email', placeholder: 'contact@agency.ma', icon: Mail },
              { key: 'businessPhone', label: 'Business phone', placeholder: '+212 6...', icon: Phone },
              { key: 'address', label: 'Address', placeholder: 'City, Country', icon: MapPin },
              { key: 'website', label: 'Website', placeholder: 'https://...', icon: Globe },
            ].map(({ key, label, placeholder, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <p className={labelCls}>{label}</p>
                <div className="relative">
                  <Icon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
                  <input
                    className={cn(inputCls, 'ps-10')}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                  />
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <p className={labelCls}>Subdomain</p>
              <div className="flex group">
                <div className="flex-1 bg-surface border border-hairline rounded-s-xl px-4 py-3 text-sm font-medium text-text-muted truncate">
                  {agency?.name.toLowerCase().replace(/\s+/g, '-') || 'my-agency'}
                </div>
                <div className="bg-surface-raised border border-s-0 border-hairline rounded-e-xl px-4 flex items-center text-xs font-medium text-text-faint shrink-0">
                  .fider.app
                </div>
              </div>
              <button
                onClick={() => setIsSubdomainModal(true)}
                className="eyebrow text-primary mt-2 hover:underline"
              >
                Request subdomain change
              </button>
            </div>
          </div>
          <Button onClick={handleSaveAgency} className="w-full mt-6" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
            {isSaving ? 'Saving...' : 'Save identity'}
          </Button>
        </Card>

        {/* Automated Nudges */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center">
                <Bell className="w-5 h-5 text-text-muted" />
              </div>
              <CardTitle>Automated nudges</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-6">
            {NUDGE_PRESETS.map((nudge) => (
              <div key={nudge.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{nudge.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{nudge.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={nudges[nudge.id]}
                  aria-label={nudge.title}
                  onClick={() => toggleNudge(nudge.id)}
                  className={cn(
                    'w-10 h-5 rounded-full relative shrink-0 border transition-colors',
                    nudges[nudge.id] ? 'bg-primary/20 border-primary/40' : 'bg-surface-raised border-hairline'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                    nudges[nudge.id] ? 'end-0.5 bg-primary' : 'start-0.5 bg-text-faint'
                  )} />
                </button>
              </div>
            ))}
          </div>

          {/* Plan info */}
          <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <p className="eyebrow text-primary mb-2">Current plan</p>
            <p className="text-xl font-semibold metal-text">{agency?.subscriptionTier ?? '—'}</p>
            <p className="text-xs text-text-muted mt-1">Contact support to upgrade your plan.</p>
          </div>
        </Card>

        {/* Staff Management */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center">
                <Users className="w-5 h-5 text-text-muted" />
              </div>
              <div>
                <CardTitle>Workforce access</CardTitle>
                <CardDescription>Manage staff roles and platform permissions</CardDescription>
              </div>
            </div>
            <Button onClick={() => router.push('/dashboard/staff')} size="sm">
              <Plus className="w-4 h-4 me-2" />
              Manage staff
            </Button>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {(agency?.users ?? []).map((member) => (
              <div key={member.id} className="p-4 bg-surface border border-hairline rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={member.name} size={40} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                    <Badge variant="outline" className="mt-1 font-normal text-text-muted">{member.role}</Badge>
                    <p className="text-xs text-text-faint mt-1 truncate">{member.email}</p>
                  </div>
                </div>
              </div>
            ))}

            {(agency?.users ?? []).length === 0 && (
              <div className="col-span-full flex flex-col items-center gap-4 py-10 text-center">
                <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-16" />
                <div>
                  <p className="text-sm font-medium text-foreground">No staff members yet</p>
                  <p className="text-xs text-text-muted mt-1">Add team members to grant them platform access</p>
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-text-faint">
            This is a read-only overview — add, remove, and edit capabilities from{' '}
            <button onClick={() => router.push('/dashboard/staff')} className="text-primary underline underline-offset-2">
              Staff &amp; Access
            </button>.
          </p>
        </Card>
      </div>

      {/* Subdomain Modal */}
      <Modal
        isOpen={isSubdomainModal}
        onClose={() => setIsSubdomainModal(false)}
        title="Request subdomain change"
        description="Critical system path update"
      >
        <div className="space-y-4">
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted leading-relaxed">
              Changing your subdomain will break all existing shared booking links and requires Root Admin manual approval.
            </p>
          </div>
          <div className="space-y-1.5 pt-4">
            <p className={labelCls}>Desired subdomain</p>
            <input className={cn(inputCls, 'focus:border-warning')} placeholder="e.g. premium-casablanca" />
          </div>
          <Button className="w-full" variant="outline" onClick={() => {
            setIsSubdomainModal(false);
            showToast('info', 'Request Submitted', 'A ticket has been opened for the Root Admin.');
          }}>
            Submit for audit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
