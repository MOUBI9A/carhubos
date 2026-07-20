"use client";

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import {
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
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { Modal } from '@/components/ui/Modal';
import { SkeletonRows } from '@/components/ui/Skeleton';
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
  'w-full bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-text-faint';

const labelCls = 'eyebrow block px-1 mb-1.5';

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
  const t = useTranslations('ownerPages');
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
          <p className="text-sm font-medium text-foreground">Staff directory offline</p>
          <p className="text-xs text-text-muted mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 me-2" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {t('teamAccess')}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">Team roles and capability management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="w-4 h-4 me-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            Add staff
          </Button>
        </div>
      </header>

      {/* ═══════ Directory ═══════ */}
      {isLoading ? (
        <Card padding="lg">
          <SkeletonRows rows={5} />
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="flex flex-col items-center gap-5 py-14 text-center">
          <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
          <div>
            <p className="font-medium text-foreground">No staff yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              Add your first teammate to start delegating fleet, booking and finance work.
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 me-2" /> Add your first teammate
          </Button>
        </Card>
      ) : (
        <Card padding="none" className="divide-y divide-hairline overflow-hidden">
          {sorted.map((member) => {
            const style = ROLE_STYLES[member.role] ?? DEFAULT_ROLE_STYLE;
            const orderedCaps = AGENCY_CAPABILITIES.filter((cap) => member.capabilities.includes(cap));
            const visibleCaps = orderedCaps.slice(0, 4);
            const overflowCaps = orderedCaps.slice(4);
            return (
              <div
                key={member.userId}
                className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group hover:bg-surface-raised transition-colors"
              >
                <Avatar name={member.name} size={44} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                    <Badge variant="outline" className="gap-1.5 shrink-0">
                      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} aria-hidden />
                      {member.rolePreset}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{member.email}</p>

                  {visibleCaps.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {visibleCaps.map((cap) => (
                        <Badge key={cap} variant="outline" className="font-normal text-text-muted">
                          {CAPABILITY_LABELS[cap] ?? cap}
                        </Badge>
                      ))}
                      {overflowCaps.length > 0 && (
                        <Badge
                          variant="outline"
                          className="font-normal text-text-faint"
                          title={overflowCaps.map((cap) => CAPABILITY_LABELS[cap] ?? cap).join(', ')}
                        >
                          +{overflowCaps.length} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2.5 text-xs text-text-faint">No capabilities assigned</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                    <Pencil className="w-3.5 h-3.5 me-2" />
                    Edit
                  </Button>
                  <button
                    onClick={() => setRemovingMember(member)}
                    aria-label={`Remove ${member.name}`}
                    className="p-2.5 text-text-faint hover:text-danger hover:bg-danger/10 rounded-xl transition-colors"
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
      <Modal isOpen={isAddOpen} onClose={closeAddModal} title="Add staff" description="Create a teammate account">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label htmlFor="staff-name" className={labelCls}>
              Full name
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
              <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
              <input
                id="staff-email"
                type="email"
                className={cn(inputCls, 'ps-11')}
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@agency.ma"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="staff-password" className={labelCls}>
              Temporary password
            </label>
            <div className="relative">
              <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
              <input
                id="staff-password"
                type="password"
                className={cn(inputCls, 'ps-11')}
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
            <p className="text-xs text-text-faint mt-1.5 px-1">
              Sets starting capabilities — edit exact access anytime after.
            </p>
          </div>
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
              {isCreating ? 'Adding...' : 'Add staff'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════ Edit Capabilities Modal ═══════ */}
      <Modal
        isOpen={!!editingMember}
        onClose={closeEdit}
        title="Edit capabilities"
        description={editingMember ? `${editingMember.name} · ${editingMember.email}` : undefined}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveCaps} disabled={isSavingCaps}>
              {isSavingCaps ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 me-2" />
              )}
              {isSavingCaps ? 'Saving...' : 'Save capabilities'}
            </Button>
          </>
        }
      >
        {editingMember && (
          <div className="space-y-6">
            <div>
              <p className={labelCls}>Quick fill from preset</p>
              <div className="flex flex-wrap gap-2">
                {CREATE_STAFF_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 rounded-lg border border-hairline bg-surface text-xs font-medium text-text-muted hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    {preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEditCaps(new Set())}
                  className="px-3 py-1.5 rounded-lg border border-hairline bg-surface text-xs font-medium text-text-faint hover:border-danger/50 hover:text-danger transition-colors"
                >
                  Clear all
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
                              : 'border-hairline bg-surface hover:bg-surface-raised',
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
                              checked ? 'bg-primary border-primary' : 'border-border',
                            )}
                            aria-hidden
                          >
                            {checked && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-medium',
                              checked ? 'text-foreground' : 'text-text-muted',
                            )}
                          >
                            {CAPABILITY_LABELS[cap]}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-text-faint">
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
        title="Remove staff"
        description="This revokes their access immediately"
      >
        {removingMember && (
          <div className="space-y-6">
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="text-foreground font-medium">{removingMember.name}</span> ({removingMember.email}) will
                permanently lose access to this agency. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRemovingMember(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleConfirmRemove} disabled={isRemoving}>
                {isRemoving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Trash2 className="w-4 h-4 me-2" />}
                {isRemoving ? 'Removing...' : 'Remove staff'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
