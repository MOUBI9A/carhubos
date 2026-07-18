"use client";

import React, { useMemo, useState } from 'react';
import {
  UserCog,
  Plus,
  Trash2,
  Pencil,
  Mail,
  Lock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useStaff } from './useStaff';
import {
  AGENCY_CAPABILITIES,
  CAPABILITY_GROUPS,
  CAPABILITY_LABELS,
  CREATE_STAFF_PRESETS,
  ALL_PRESETS,
  ROLE_STYLES,
  DEFAULT_ROLE_STYLE,
  type StaffMember,
} from './capabilities';

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors placeholder:text-white/20';

const labelCls = 'block text-[10px] font-black text-white/40 uppercase tracking-widest px-1 mb-1.5';

const INITIAL_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
  preset: 'AGENT' as string,
};

function errorMessage(err: any, fallback: string) {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  return msg || fallback;
}

export default function StaffPage() {
  const { showToast } = useToast();
  const { data: staff, isLoading, error, refetch } = useStaff();

  // ── Add staff modal ────────────────────────────────────────────────
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);

  const closeAddModal = () => {
    setIsAddOpen(false);
    setCreateForm(INITIAL_CREATE_FORM);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || createForm.password.length < 8) {
      showToast('danger', 'Missing Fields', 'Name, email and an 8+ character password are required.');
      return;
    }
    setIsCreating(true);
    try {
      await api.post('/agency/staff', {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        preset: createForm.preset,
      });
      showToast(
        'success',
        'Staff Member Added',
        `${createForm.name.trim()} can now sign in with the assigned capabilities.`,
      );
      closeAddModal();
      refetch();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        showToast(
          'danger',
          'Email Already Exists',
          errorMessage(err, 'A user with this email is already registered.'),
        );
      } else {
        showToast('danger', 'Could Not Add Staff', errorMessage(err, 'Failed to create staff member.'));
      }
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit capabilities modal ─────────────────────────────────────────
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [editCaps, setEditCaps] = useState<Set<string>>(new Set());
  const [isSavingCaps, setIsSavingCaps] = useState(false);

  const openEdit = (member: StaffMember) => {
    setEditingMember(member);
    setEditCaps(new Set(member.capabilities));
  };
  const closeEdit = () => {
    setEditingMember(null);
    setEditCaps(new Set());
  };

  const toggleCap = (cap: string) => {
    setEditCaps((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  };

  const applyPreset = (presetName: string) => {
    setEditCaps(new Set(ALL_PRESETS[presetName] ?? []));
  };

  const handleSaveCaps = async () => {
    if (!editingMember) return;
    setIsSavingCaps(true);
    try {
      await api.patch(`/agency/staff/${editingMember.userId}/capabilities`, {
        capabilities: Array.from(editCaps),
      });
      showToast('success', 'Capabilities Updated', `${editingMember.name}'s access has been updated.`);
      closeEdit();
      refetch();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        showToast(
          'danger',
          'Cannot Grant Capability',
          errorMessage(err, "You can't grant capabilities you don't hold yourself."),
        );
      } else if (status === 404) {
        showToast(
          'danger',
          'Staff Member Not Found',
          errorMessage(err, 'This member no longer belongs to your agency.'),
        );
        closeEdit();
        refetch();
      } else {
        showToast('danger', 'Save Failed', errorMessage(err, 'Could not update capabilities.'));
      }
    } finally {
      setIsSavingCaps(false);
    }
  };

  // ── Remove staff modal ───────────────────────────────────────────────
  const [removingMember, setRemovingMember] = useState<StaffMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    setIsRemoving(true);
    try {
      await api.delete(`/agency/staff/${removingMember.userId}`);
      showToast('info', 'Staff Removed', `${removingMember.name}'s access has been revoked.`);
      setRemovingMember(null);
      refetch();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        showToast('danger', 'Cannot Remove', errorMessage(err, 'You cannot remove this staff member.'));
      } else if (status === 404) {
        showToast(
          'danger',
          'Staff Member Not Found',
          errorMessage(err, 'This member no longer belongs to your agency.'),
        );
        setRemovingMember(null);
        refetch();
      } else {
        showToast('danger', 'Removal Failed', errorMessage(err, 'Could not remove staff member.'));
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const sorted = useMemo(() => {
    if (!staff) return [];
    return [...staff].sort((a, b) => a.name.localeCompare(b.name));
  }, [staff]);

  // ── Error state ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">Staff Directory Offline</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* ═══════ Header ═══════ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
            Staff <span className="text-primary">& Access</span>
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2">
            Team Roles & Capability Management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="glass h-12" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="h-12" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* ═══════ Directory ═══════ */}
      {isLoading ? (
        <Card padding="lg" className="glass border-white/5">
          <SkeletonRows rows={5} />
        </Card>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No Staff Yet"
          description="Add your first teammate to start delegating fleet, booking and finance work."
          action={
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Teammate
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="glass border-white/5 divide-y divide-white/5 overflow-hidden">
          {sorted.map((member) => {
            const style = ROLE_STYLES[member.role] ?? DEFAULT_ROLE_STYLE;
            return (
              <div
                key={member.userId}
                className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-white/40 uppercase shrink-0">
                  {member.name?.[0] || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-white uppercase tracking-tight truncate">{member.name}</p>
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border flex items-center gap-1.5 shrink-0',
                        style.chip,
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                      {member.rolePreset}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 font-medium mt-0.5 truncate">{member.email}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-center">
                    <p className="text-xs font-black text-white">{member.capabilities.length}</p>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                      {member.capabilities.length === 1 ? 'Capability' : 'Capabilities'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Edit
                  </Button>
                  <button
                    onClick={() => setRemovingMember(member)}
                    aria-label={`Remove ${member.name}`}
                    className="p-2.5 text-white/20 hover:text-danger hover:bg-danger/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* ═══════ Add Staff Modal ═══════ */}
      <Modal isOpen={isAddOpen} onClose={closeAddModal} title="Add Staff" description="Create a teammate account">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label htmlFor="staff-name" className={labelCls}>
              Full Name
            </label>
            <input
              id="staff-name"
              className={inputCls}
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Amine Alami"
              required
            />
          </div>
          <div>
            <label htmlFor="staff-email" className={labelCls}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              <input
                id="staff-email"
                type="email"
                className={cn(inputCls, 'pl-11')}
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@agency.ma"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="staff-password" className={labelCls}>
              Temporary Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              <input
                id="staff-password"
                type="password"
                className={cn(inputCls, 'pl-11')}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                minLength={8}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="staff-preset" className={labelCls}>
              Preset
            </label>
            <select
              id="staff-preset"
              className={cn(inputCls, 'appearance-none')}
              value={createForm.preset}
              onChange={(e) => setCreateForm((f) => ({ ...f, preset: e.target.value }))}
            >
              {CREATE_STAFF_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-white/25 font-medium mt-1.5 px-1">
              Sets starting capabilities — edit exact access anytime after.
            </p>
          </div>
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isCreating ? 'Adding...' : 'Add Staff'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════ Edit Capabilities Modal ═══════ */}
      <Modal
        isOpen={!!editingMember}
        onClose={closeEdit}
        title="Edit Capabilities"
        description={editingMember ? `${editingMember.name} · ${editingMember.email}` : undefined}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveCaps} disabled={isSavingCaps}>
              {isSavingCaps ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              {isSavingCaps ? 'Saving...' : 'Save Capabilities'}
            </Button>
          </>
        }
      >
        {editingMember && (
          <div className="space-y-6">
            <div>
              <p className={labelCls}>Quick Fill From Preset</p>
              <div className="flex flex-wrap gap-2">
                {CREATE_STAFF_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black text-white/60 uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    {preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEditCaps(new Set())}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest hover:border-danger/50 hover:text-danger transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {CAPABILITY_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className={labelCls}>{group.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.capabilities.map((cap) => {
                      const checked = editCaps.has(cap);
                      const capId = `cap-${cap}`;
                      return (
                        <label
                          key={cap}
                          htmlFor={capId}
                          className={cn(
                            'flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-colors',
                            checked
                              ? 'border-primary/40 bg-primary/10'
                              : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                          )}
                        >
                          <input
                            id={capId}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCap(cap)}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                              checked ? 'bg-primary border-primary' : 'border-white/20',
                            )}
                            aria-hidden
                          >
                            {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </span>
                          <span className="text-xs font-bold text-white/80">{CAPABILITY_LABELS[cap]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-white/25 font-medium">
              {editCaps.size} of {AGENCY_CAPABILITIES.length} capabilities selected. You can only grant capabilities
              you hold yourself.
            </p>
          </div>
        )}
      </Modal>

      {/* ═══════ Remove Staff Modal ═══════ */}
      <Modal
        isOpen={!!removingMember}
        onClose={() => setRemovingMember(null)}
        title="Remove Staff"
        description="This revokes their access immediately"
      >
        {removingMember && (
          <div className="space-y-6">
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-white/60 leading-relaxed font-medium">
                <span className="text-white font-bold">{removingMember.name}</span> ({removingMember.email}) will
                permanently lose access to this agency. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRemovingMember(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleConfirmRemove} disabled={isRemoving}>
                {isRemoving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {isRemoving ? 'Removing...' : 'Remove Staff'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
