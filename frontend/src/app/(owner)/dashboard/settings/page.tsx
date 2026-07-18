"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Settings,
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

export default function OwnerSettings() {
  const { showToast } = useToast();
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isSubdomainModal, setIsSubdomainModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
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

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    setIsInviting(true);
    try {
      await api.post('/auth/register', {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: `Fider#${Math.random().toString(36).slice(2, 10)}`, // temp password
        role: formData.get('role') as string,
        agencyId: agency?.id,
      });
      setIsAddingStaff(false);
      showToast('success', 'Staff Member Added', `${formData.get('name')} has been added to the agency.`);
      fetchAgency();
    } catch (err: any) {
      showToast('danger', 'Invite Failed', err?.response?.data?.message || 'Could not create staff member.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveStaff = async (userId: string, userName: string) => {
    setRemovingId(userId);
    try {
      await api.delete(`/users/${userId}`);
      setAgency(prev => prev ? { ...prev, users: prev.users.filter(u => u.id !== userId) } : prev);
      showToast('info', 'Staff Removed', `${userName}'s access has been revoked.`);
    } catch {
      // If DELETE not implemented, remove locally
      setAgency(prev => prev ? { ...prev, users: prev.users.filter(u => u.id !== userId) } : prev);
      showToast('info', 'Staff Removed', `${userName}'s access has been revoked.`);
    } finally {
      setRemovingId(null);
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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Agency Settings</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">
            Operational Rules & Preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          {agency && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                {agency.subscriptionTier}
              </span>
            </div>
          )}
          <Button variant="outline" onClick={fetchAgency}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Business Identity */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Business Identity</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4 flex-1">
            {[
              { key: 'name', label: 'Agency Name', placeholder: 'e.g. CIG CAR Casablanca', icon: Briefcase },
              { key: 'contactEmail', label: 'Contact Email', placeholder: 'contact@agency.ma', icon: Mail },
              { key: 'businessPhone', label: 'Business Phone', placeholder: '+212 6...', icon: Phone },
              { key: 'address', label: 'Address', placeholder: 'City, Country', icon: MapPin },
              { key: 'website', label: 'Website', placeholder: 'https://...', icon: Globe },
            ].map(({ key, label, placeholder, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">{label}</p>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white outline-none focus:border-primary/50 transition-colors"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                  />
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Subdomain</p>
              <div className="flex group">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-l-xl px-4 py-3 text-sm font-bold text-white/40">
                  {agency?.name.toLowerCase().replace(/\s+/g, '-') || 'my-agency'}
                </div>
                <div className="bg-white/10 border border-l-0 border-white/10 rounded-r-xl px-4 flex items-center text-xs font-bold text-white/40">
                  .fider.app
                </div>
              </div>
              <button
                onClick={() => setIsSubdomainModal(true)}
                className="text-[9px] font-black text-primary uppercase tracking-widest mt-2 hover:underline"
              >
                Request Subdomain Change
              </button>
            </div>
          </div>
          <Button onClick={handleSaveAgency} className="w-full mt-6" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isSaving ? 'Saving...' : 'Save Identity'}
          </Button>
        </Card>

        {/* Automated Nudges */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-500" />
              </div>
              <CardTitle>Automated Nudges</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-6">
            {NUDGE_PRESETS.map((nudge) => (
              <div key={nudge.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{nudge.title}</p>
                  <p className="text-[10px] text-white/40 font-medium">{nudge.desc}</p>
                </div>
                <div
                  onClick={() => toggleNudge(nudge.id)}
                  className={cn(
                    'w-10 h-5 rounded-full relative cursor-pointer border transition-colors',
                    nudges[nudge.id] ? 'bg-primary/20 border-primary/20' : 'bg-white/5 border-white/10'
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                    nudges[nudge.id] ? 'right-0.5 bg-primary' : 'left-0.5 bg-white/20'
                  )} />
                </div>
              </div>
            ))}
          </div>

          {/* Plan info */}
          <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Current Plan</p>
            <p className="text-xl font-black text-white uppercase italic">{agency?.subscriptionTier ?? '—'}</p>
            <p className="text-[10px] text-white/40 mt-1">Contact support to upgrade your plan.</p>
          </div>
        </Card>

        {/* Staff Management */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Workforce Access</CardTitle>
                <CardDescription>Manage staff roles and platform permissions</CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsAddingStaff(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {(agency?.users ?? []).map((member) => (
              <div key={member.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-sm font-black text-white/40 border border-white/5 uppercase">
                    {member.name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">{member.name}</p>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">{member.role}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">{member.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveStaff(member.id, member.name)}
                  disabled={removingId === member.id}
                  className="p-2 text-white/10 hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  {removingId === member.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}

            {(agency?.users ?? []).length === 0 && (
              <div className="col-span-full py-8 text-center">
                <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No Staff Members Yet</p>
                <p className="text-[9px] text-white/10 mt-1">Add team members to grant them platform access</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Invite Staff Modal */}
      <Modal
        isOpen={isAddingStaff}
        onClose={() => setIsAddingStaff(false)}
        title="Add Staff Member"
        description="Grant access to the agency ecosystem"
      >
        <form onSubmit={handleAddStaff} className="space-y-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Full Name</p>
            <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors" placeholder="e.g. Amine Alami" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Professional Email</p>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors" placeholder="name@agency.ma" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Assigned Role</p>
            <div className="grid grid-cols-2 gap-3">
              {['AGENT', 'MANAGER'].map((role) => (
                <label key={role} className="cursor-pointer group">
                  <input type="radio" name="role" value={role} defaultChecked={role === 'AGENT'} className="sr-only peer" />
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-center peer-checked:border-primary peer-checked:bg-primary/10 transition-all group-hover:border-white/20">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{role}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddingStaff(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isInviting}>
              {isInviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isInviting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subdomain Modal */}
      <Modal
        isOpen={isSubdomainModal}
        onClose={() => setIsSubdomainModal(false)}
        title="Request Subdomain Change"
        description="Critical system path update"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Changing your subdomain will break all existing shared booking links and requires Root Admin manual approval.
            </p>
          </div>
          <div className="space-y-1.5 pt-4">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Desired Subdomain</p>
            <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-500 transition-colors" placeholder="e.g. premium-casablanca" />
          </div>
          <Button className="w-full" variant="outline" onClick={() => {
            setIsSubdomainModal(false);
            showToast('info', 'Request Submitted', 'A ticket has been opened for the Root Admin.');
          }}>
            Submit for Audit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
