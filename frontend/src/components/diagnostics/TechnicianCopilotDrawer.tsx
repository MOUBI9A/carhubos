'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Flame,
  FileText,
  Copy,
  ChevronRight,
  Info,
} from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/contexts/ToastContext';

export interface TestStep {
  stepTitle: string;
  procedure: string;
  expectedValue: string;
  tool: string;
  type: string;
  dtcCode: string;
}

export interface ActionPlanPhase {
  phase: number;
  phaseName: string;
  description: string;
  actionSteps: TestStep[];
}

export interface CopilotGuide {
  analyzedCodes: string[];
  primarySystem: string;
  overallSeverity: string;
  rootCauseHypothesis: string;
  correlatedFindings: string[];
  prioritizedActionPlan: ActionPlanPhase[];
  estimatedTotalLaborHours: number;
  requiredTools: string[];
  moroccanFieldAlerts: string[];
  safetyWarnings: string[];
}

export interface DtcDetail {
  code: string;
  standard: string;
  system: string;
  subsystem: string;
  severity: string;
  title: string;
  definition: string;
  component: string;
  probableCauses: string[];
  symptoms: string[];
  electricalTests: Array<{
    step: number;
    title: string;
    procedure: string;
    expectedValue: string;
    tool: string;
    safetyCaution?: string;
  }>;
  mechanicalTests: Array<{
    step: number;
    title: string;
    procedure: string;
    expectedValue: string;
    tool: string;
  }>;
  standardRepairProcedure: string;
  estimatedLaborHours: number;
  torqueSpecs?: string;
  specialTools: string[];
  moroccanOperatingContext: {
    climateRisk: string;
    fuelQualityFactor: string;
    fieldNotes: string;
  };
}

interface TechnicianCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeDtcs?: string[];
  onAppendToNotes?: (notes: string) => void;
}

export function TechnicianCopilotDrawer({
  isOpen,
  onClose,
  activeDtcs = [],
  onAppendToNotes,
}: TechnicianCopilotDrawerProps) {
  const { showToast } = useToast();
  const [guide, setGuide] = useState<CopilotGuide | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<string>('ALL');
  const [searchResults, setSearchResults] = useState<DtcDetail[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDtc, setSelectedDtc] = useState<DtcDetail | null>(null);

  async function loadDtcDetail(code: string) {
    try {
      const res = await api.get<DtcDetail>(`/diagnostics/knowledge/dtc/${code}`);
      setSelectedDtc(res.data);
    } catch {
      setSelectedDtc(null);
    }
  }

  // Fetch synthesis when opened with active DTCs
  useEffect(() => {
    if (!isOpen) return;

    if (activeDtcs.length > 0) {
      setLoadingGuide(true);
      api
        .post<CopilotGuide>('/diagnostics/knowledge/copilot', { dtcCodes: activeDtcs })
        .then((res) => {
          setGuide(res.data);
          // Pre-select first DTC if available
          if (activeDtcs[0]) {
            loadDtcDetail(activeDtcs[0]);
          }
        })
        .catch(() => {
          // If multi-code copilot endpoint fails, continue without crash
        })
        .finally(() => setLoadingGuide(false));
    }
  }, [isOpen, activeDtcs.join(',')]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() && selectedSystem === 'ALL') {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('query', searchQuery.trim());
      if (selectedSystem !== 'ALL') params.append('system', selectedSystem);

      const res = await api.get<DtcDetail[]>(`/diagnostics/knowledge/search?${params.toString()}`);
      setSearchResults(res.data);
    } catch {
      showToast('danger', 'Search Error', 'Failed to search automotive knowledge base');
    } finally {
      setSearching(false);
    }
  };

  const toggleStep = (stepKey: string) => {
    setCheckedSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  const copyActionPlan = () => {
    if (!guide) return;
    const planText = [
      `### Technician Diagnostic Copilot Action Plan (${guide.analyzedCodes.join(', ')})`,
      `**Root Cause Hypothesis**: ${guide.rootCauseHypothesis}`,
      `**Estimated Labor**: ${guide.estimatedTotalLaborHours} hrs | **Primary System**: ${guide.primarySystem}`,
      '',
      ...guide.prioritizedActionPlan.flatMap((p) => [
        `#### ${p.phaseName}`,
        ...p.actionSteps.map(
          (s) =>
            `- [ ] **${s.stepTitle}**: ${s.procedure} (Expected: ${s.expectedValue}) [Tool: ${s.tool}]`,
        ),
      ]),
      '',
      '#### Moroccan Workshop Operating Notes:',
      ...guide.moroccanFieldAlerts.map((a) => `- ${a}`),
    ].join('\n');

    if (onAppendToNotes) {
      onAppendToNotes(planText);
      showToast('success', 'Plan Appended', 'Copilot action plan added to diagnostic notes.');
    } else {
      navigator.clipboard.writeText(planText);
      showToast('success', 'Copied', 'Action plan copied to clipboard.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Automotive Knowledge Graph & Technician Copilot"
      description="SAE J2012 / ISO 14229 Root Cause Engine & Moroccan Workshop Knowledge Base"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-white/50 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SAE J2012 & Moroccan Field Calibrated</span>
          </div>
          <div className="flex items-center gap-2">
            {guide && (
              <Button onClick={copyActionPlan} variant="primary" className="text-xs font-semibold gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                {onAppendToNotes ? 'Append Plan to Notes' : 'Copy Action Plan'}
              </Button>
            )}
            <Button onClick={onClose} variant="outline" className="text-xs font-semibold">
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search & System Filter Bar */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code (P0300, P2463, C0035) or symptom (misfire, lean, DPF, soot)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL" className="bg-neutral-900 text-white">All Systems</option>
            <option value="POWERTRAIN" className="bg-neutral-900 text-white">Powertrain (P)</option>
            <option value="CHASSIS" className="bg-neutral-900 text-white">Chassis (C)</option>
            <option value="BODY" className="bg-neutral-900 text-white">Body (B)</option>
            <option value="NETWORK" className="bg-neutral-900 text-white">Network (U)</option>
          </select>
          <Button type="submit" variant="outline" className="text-xs" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </form>


        {/* Search Results Drawer if any */}
        {searchResults.length > 0 && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white/60">
              Found {searchResults.length} Knowledge Base Entries
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {searchResults.map((entry) => (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => loadDtcDetail(entry.code)}
                  className="flex items-start justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 text-xs">{entry.code}</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                        {entry.system}
                      </span>
                    </div>
                    <div className="text-xs text-white/90 line-clamp-1 mt-0.5">{entry.title}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Codes Pill Row */}
        {activeDtcs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">
              Detected in Session:
            </span>
            {activeDtcs.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => loadDtcDetail(code)}
                className={`font-mono text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  selectedDtc?.code === code
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        )}

        {/* Multi-Code Copilot Synthesis */}
        {loadingGuide ? (
          <div className="p-8 text-center text-white/60 animate-pulse text-sm">
            Synthesizing SAE J2012 multi-DTC failure patterns...
          </div>
        ) : guide ? (
          <div className="space-y-4">
            {/* Root Cause Hypothesis Banner */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Copilot Root Cause Analysis
                  </div>
                  <p className="text-sm text-amber-100 font-medium leading-relaxed">
                    {guide.rootCauseHypothesis}
                  </p>
                  <div className="flex items-center gap-4 pt-1 text-xs text-amber-300/80">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Est. Labor: {guide.estimatedTotalLaborHours} hrs
                    </span>
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" /> System: {guide.primarySystem}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold uppercase">
                      {guide.overallSeverity}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Moroccan Field Alerts */}
            {guide.moroccanFieldAlerts.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Moroccan Fleet & Workshop Operating Alerts
                </div>
                <ul className="space-y-1.5 text-xs text-rose-100">
                  {guide.moroccanFieldAlerts.map((alert, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Phased Action Plan with interactive checkmarks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Prioritized Diagnostic & Repair Checklist
                </div>
                <div className="text-xs text-white/40">
                  {Object.values(checkedSteps).filter(Boolean).length} /{' '}
                  {guide.prioritizedActionPlan.reduce((acc, p) => acc + p.actionSteps.length, 0)} completed
                </div>
              </div>

              <div className="space-y-3">
                {guide.prioritizedActionPlan.map((phase) => (
                  <div
                    key={phase.phase}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                        {phase.phaseName}
                      </div>
                      <span className="text-[10px] text-white/50">{phase.actionSteps.length} steps</span>
                    </div>
                    <p className="text-xs text-white/60">{phase.description}</p>

                    <div className="space-y-2 pt-2">
                      {phase.actionSteps.map((step, idx) => {
                        const stepKey = `phase-${phase.phase}-step-${idx}`;
                        const isDone = !!checkedSteps[stepKey];

                        return (
                          <div
                            key={stepKey}
                            onClick={() => toggleStep(stepKey)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isDone
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-white/60'
                                : 'bg-black/30 border-white/5 hover:border-white/20 text-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                                  isDone
                                    ? 'bg-emerald-500 border-emerald-400 text-black'
                                    : 'border-white/30 bg-transparent'
                                }`}
                              >
                                {isDone && <CheckCircle className="w-3.5 h-3.5 text-black" />}
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`text-xs font-semibold ${
                                      isDone ? 'line-through text-white/50' : 'text-white'
                                    }`}
                                  >
                                    {step.stepTitle}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/60">
                                    {step.tool}
                                  </span>
                                </div>
                                <p className="text-xs text-white/70">{step.procedure}</p>
                                <div className="text-[11px] text-emerald-400 font-mono">
                                  Expected: {step.expectedValue}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Required Tools Badges */}
            {guide.requiredTools.length > 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" /> Required Specialized Tools & Equipment
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {guide.requiredTools.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-white/80 border border-white/5 font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Selected DTC Technical Spec Drawer */}
        {selectedDtc && (
          <div className="p-5 rounded-2xl bg-neutral-900 border border-white/15 space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-mono font-black text-amber-400">{selectedDtc.code}</span>
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    {selectedDtc.system} • {selectedDtc.subsystem}
                  </span>
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-white/10 text-white/70">
                    {selectedDtc.severity}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{selectedDtc.title}</h3>
                <p className="text-xs text-white/60 mt-0.5">{selectedDtc.definition}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/50">Factory Labor</div>
                <div className="text-sm font-mono font-bold text-white">{selectedDtc.estimatedLaborHours} hrs</div>
              </div>
            </div>

            {/* Component & Probable Causes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Target Component(s)
                </div>
                <div className="text-xs text-white/90 p-2.5 rounded-lg bg-white/5 border border-white/5 font-medium">
                  {selectedDtc.component}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Factory Torque Specifications
                </div>
                <div className="text-xs text-amber-300/90 p-2.5 rounded-lg bg-white/5 border border-white/5 font-mono font-medium">
                  {selectedDtc.torqueSpecs || 'Standard ISO fastener torque'}
                </div>
              </div>
            </div>

            {/* Probable Causes */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-white/60">
                Statistically Ranked Causes
              </div>
              <ul className="space-y-1 text-xs text-white/80 list-disc list-inside bg-white/5 p-3 rounded-lg border border-white/5">
                {selectedDtc.probableCauses.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Electrical Tests Table */}
            {selectedDtc.electricalTests.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Electrical Multimeter & Oscilloscope Pinout Tests
                </div>
                <div className="space-y-2">
                  {selectedDtc.electricalTests.map((t) => (
                    <div key={t.step} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>Step {t.step}: {t.title}</span>
                        <span className="font-mono text-[10px] text-white/60">{t.tool}</span>
                      </div>
                      <p className="text-white/70">{t.procedure}</p>
                      <div className="font-mono text-emerald-400 text-[11px]">Expected: {t.expectedValue}</div>
                      {t.safetyCaution && (
                        <div className="text-rose-400 text-[11px] font-semibold flex items-center gap-1 pt-0.5">
                          <ShieldAlert className="w-3.5 h-3.5" /> {t.safetyCaution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Moroccan Operating Field Notes */}
            {selectedDtc.moroccanOperatingContext && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs text-amber-200">
                <div className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" /> Moroccan Workshop Field Guidance
                </div>
                <p>{selectedDtc.moroccanOperatingContext.fieldNotes}</p>
                {selectedDtc.moroccanOperatingContext.climateRisk && (
                  <p className="text-amber-300/80 pt-0.5">
                    <strong>Climate Alert:</strong> {selectedDtc.moroccanOperatingContext.climateRisk}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
