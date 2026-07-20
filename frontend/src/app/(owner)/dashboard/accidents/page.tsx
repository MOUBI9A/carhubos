"use client";

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { AgencyImage } from '@/components/ui/AgencyImage';
import {
  AlertOctagon,
  Camera,
  FileText,
  Users,
  ChevronRight,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  ShieldAlert,
  Hammer,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';

const INITIAL_ACCIDENTS = [
  {
    id: 'ACC-2024-001',
    vehicle: 'Dacia Logan',
    plate: '12345-A-1',
    date: 'Mar 12, 2024',
    severity: 'CRITICAL',
    status: 'Investigation',
    description: 'Frontal collision at intersection. Airbags deployed.',
    claimStatus: 1, // 0: Filed, 1: Investigation, 2: Quote, 3: Payment
  },
  {
    id: 'ACC-2024-002',
    vehicle: 'Renault Clio',
    plate: '98765-B-4',
    date: 'Feb 28, 2024',
    severity: 'MEDIUM',
    status: 'Repair Quote',
    description: 'Rear bumper damage during parking maneuver.',
    claimStatus: 2,
  },
  {
    id: 'ACC-2024-003',
    vehicle: 'Hyundai i10',
    plate: '54321-C-7',
    date: 'Feb 15, 2024',
    severity: 'LOW',
    status: 'Payment',
    description: 'Scratched side door. Vandalism suspected.',
    claimStatus: 3,
  }
];

const CLAIM_STEPS = [
  { label: 'Claim filed', icon: FileText },
  { label: 'Investigation', icon: ShieldAlert },
  { label: 'Repair quote', icon: Hammer },
  { label: 'Payment', icon: CreditCard },
];

export default function AccidentsPage() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [accidents, setAccidents] = useState(INITIAL_ACCIDENTS);
  const [selectedAccident, setSelectedAccident] = useState<any>(null);

  const handleReportIncident = (e: React.FormEvent) => {
    e.preventDefault();
    // There is no backend Accident/incident model yet — do not fabricate a
    // record or claim success. Be honest that this form isn't wired up.
    setIsReportModalOpen(false);
    showToast('info', 'Not wired yet', 'Incident reporting isn’t connected to the backend yet — nothing was saved.');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-success bg-success/10 border-success/20';
      case 'MEDIUM': return 'text-warning bg-warning/10 border-warning/20';
      case 'CRITICAL': return 'text-danger bg-danger/10 border-danger/20';
      default: return 'text-text-muted bg-surface-raised border-hairline';
    }
  };

  const getSeverityDot = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-success';
      case 'MEDIUM': return 'bg-warning';
      case 'CRITICAL': return 'bg-danger';
      default: return 'bg-text-faint';
    }
  };

  const formatSeverity = (severity: string) =>
    severity.charAt(0) + severity.slice(1).toLowerCase();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('accidents')}</h1>
          <p className="mt-1.5 text-sm text-text-muted flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-danger" />
            {accidents.length} active incident{accidents.length !== 1 ? 's' : ''} across your fleet
          </p>
        </div>
        <Button onClick={() => setIsReportModalOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          Report new incident
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Incident List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
              <input
                className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                placeholder="Search dossiers..."
              />
            </div>
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4 me-2" />
              Filter
            </Button>
          </div>

          {accidents.map((accident) => (
            <Card
              key={accident.id}
              padding="none"
              className={cn(
                'group cursor-pointer transition-all overflow-hidden',
                selectedAccident?.id === accident.id ? 'ring-1 ring-primary/40' : 'hover:bg-surface-raised',
              )}
              onClick={() => setSelectedAccident(accident)}
            >
              <div className="p-6 flex items-center gap-5">
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 duration-300',
                  getSeverityColor(accident.severity)
                )}>
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold tracking-tight text-foreground truncate">{accident.vehicle}</h3>
                    <Badge variant="outline" className={cn('shrink-0', getSeverityColor(accident.severity))}>
                      <span className={cn('me-1 w-1.5 h-1.5 rounded-full', getSeverityDot(accident.severity))} />
                      {formatSeverity(accident.severity)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="font-mono tabular">{accident.plate}</span>
                    <span className="w-1 h-1 rounded-full bg-text-faint" />
                    <span>{accident.date}</span>
                  </div>
                </div>
                <div className="text-end flex flex-col items-end gap-1.5 shrink-0">
                   <p className="text-xs font-medium text-primary">{accident.status}</p>
                   <ChevronRight className="w-4 h-4 text-text-faint group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Claim Tracker Panel */}
        <div className="lg:col-span-5">
           {selectedAccident ? (
             <Card className="sticky top-24 animate-in fade-in slide-in-from-right-4 duration-500">
                <CardHeader className="items-start">
                   <div>
                      <CardTitle className="text-xl font-mono tabular">{selectedAccident.id}</CardTitle>
                      <CardDescription className="text-primary normal-case tracking-normal font-medium text-xs">Protocol active</CardDescription>
                   </div>
                   <Button variant="outline" size="sm" onClick={() => showToast('info', 'Not available yet', 'Incident dossier export isn’t built yet.')}>Export PDF</Button>
                </CardHeader>

                <p className="text-sm text-text-muted leading-relaxed mb-8 border-s-2 border-primary/30 ps-4 py-1">
                  &ldquo;{selectedAccident.description}&rdquo;
                </p>

                <div className="space-y-6">
                   <p className="eyebrow">Insurance claim progress</p>

                   <div className="relative">
                      {/* Progress Line */}
                      <div className="absolute start-[19px] top-0 bottom-0 w-px bg-hairline" />
                      <div
                        className="absolute start-[19px] top-0 w-px bg-primary transition-all duration-1000"
                        style={{ height: `${(selectedAccident.claimStatus / (CLAIM_STEPS.length - 1)) * 100}%` }}
                      />

                      <div className="space-y-8 relative">
                         {CLAIM_STEPS.map((step, idx) => {
                            const isActive = idx <= selectedAccident.claimStatus;
                            const isCurrent = idx === selectedAccident.claimStatus;
                            const StepIcon = step.icon;

                            return (
                              <div key={idx} className="flex items-center gap-5">
                                 <div className={cn(
                                   'w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 z-10 shrink-0',
                                   isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-surface border-hairline text-text-faint'
                                 )}>
                                    {isActive && !isCurrent ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                      <StepIcon className="w-5 h-5" />
                                    )}
                                 </div>
                                 <div className="flex-1">
                                    <p className={cn(
                                      'text-sm font-medium',
                                      isActive ? 'text-foreground' : 'text-text-faint'
                                    )}>
                                      {step.label}
                                    </p>
                                    {isCurrent && (
                                      <p className="text-xs text-primary mt-0.5">Action required</p>
                                    )}
                                 </div>
                              </div>
                            );
                         })}
                      </div>
                   </div>
                </div>

                <div className="mt-10 space-y-3">
                   <Button className="w-full group">
                     Update claim status
                     <ChevronRight className="w-4 h-4 ms-2 group-hover:translate-x-0.5 transition-transform" />
                   </Button>
                   <Button variant="ghost" className="w-full">Mark as resolved</Button>
                </div>
             </Card>
           ) : (
             <Card padding="none" className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20 mb-6" />
                <h3 className="font-medium text-foreground">Select an incident</h3>
                <p className="text-sm text-text-muted mt-1.5 max-w-xs">Dossier information will appear here once you choose a record.</p>
             </Card>
           )}
        </div>
      </div>

      {/* New Incident Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report an incident"
        description="Guided incident report"
      >
        <div className="space-y-8">
           {/* Guided Checklist */}
           <div className="grid grid-cols-3 gap-3">
              {[
                { label: '360° photos', icon: Camera, status: 'Required' },
                { label: 'Constat', icon: FileText, status: 'Required' },
                { label: 'Witnesses', icon: Users, status: 'Optional' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-surface border border-hairline text-center group hover:border-primary/40 transition-all cursor-pointer">
                   <item.icon className="w-5 h-5 mx-auto mb-2.5 text-text-muted group-hover:text-primary transition-colors" />
                   <p className="text-xs font-medium text-foreground mb-0.5">{item.label}</p>
                   <p className="text-[10px] text-text-faint">{item.status}</p>
                </div>
              ))}
           </div>

           <form className="space-y-6" onSubmit={handleReportIncident}>
              <div className="space-y-1.5">
                 <p className="eyebrow px-1">Vehicle involved</p>
                 <select className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                    <option>Select vehicle...</option>
                    <option>Dacia Logan (12345-A-1)</option>
                    <option>Renault Clio (98765-B-4)</option>
                 </select>
              </div>

              <div className="space-y-1.5">
                 <p className="eyebrow px-1">Incident narration</p>
                 <textarea
                   required
                   className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all min-h-[120px] placeholder:text-text-faint"
                   placeholder="Describe the sequence of events..."
                 />
              </div>

              <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-start gap-3">
                 <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                 <div>
                    <p className="text-xs font-semibold text-danger mb-1">Heads up</p>
                    <p className="text-xs text-text-muted leading-relaxed">Submitting will lock this vehicle and notify your insurance carrier.</p>
                 </div>
              </div>

              <div className="flex gap-3">
                 <Button type="button" variant="outline" className="flex-1" onClick={() => setIsReportModalOpen(false)}>Cancel</Button>
                 <Button type="submit" variant="danger" className="flex-1">
                   Submit report
                 </Button>
              </div>
           </form>
        </div>
      </Modal>
    </div>
  );
}
