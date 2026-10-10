"use client";

import React from 'react';
import {
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  Play,
  Pause,
  RotateCw,
  Building2,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Band = 'TRUSTED' | 'CAUTION' | 'BLACKLISTED' | 'NEW';
type Phase = 'blind' | 'hashing' | 'scanning' | 'resolved';

interface Persona {
  initials: string;
  name: string;
  cin: string;
  hash: string;
  band: Band;
  score: number | null;
  reviewCount: number;
  agencyCount: number;
  deposit: string;
  aha: string;
  recommendation: string;
  blocked?: boolean;
  flag?: { reason: string; severity: string; agency: string; city: string; evidence: number };
  tags: { label: string; count: number; tone: 'pos' | 'neg' }[];
  response: { label: string; value: string }[];
}

const PERSONAS: Persona[] = [
  {
    initials: 'YB',
    name: 'Youssef Bennani',
    cin: 'CIN B••••89',
    hash: 'a91f··e7',
    band: 'TRUSTED',
    score: 4.6,
    reviewCount: 12,
    agencyCount: 5,
    deposit: '×1.0',
    aha: 'Seen by 5 agencies before you.',
    recommendation: 'Standard deposit. Verified across the network.',
    tags: [
      { label: 'Early return', count: 5, tone: 'pos' },
      { label: 'Returned spotless', count: 4, tone: 'pos' },
      { label: 'Repeat client', count: 3, tone: 'pos' },
    ],
    response: [
      { label: 'Deposit', value: '×1.0' },
      { label: 'Booking', value: 'Clear' },
      { label: 'Vault', value: 'ID on file' },
    ],
  },
  {
    initials: 'KT',
    name: 'Karim Tazi',
    cin: 'CIN K••••12',
    hash: 'c40b··19',
    band: 'CAUTION',
    score: 3.1,
    reviewCount: 5,
    agencyCount: 3,
    deposit: '×1.5',
    aha: 'Seen by 3 agencies before you.',
    recommendation: 'Proceed with a 1.5× security deposit and a documented pre-rental inspection.',
    tags: [
      { label: 'Late return', count: 2, tone: 'neg' },
      { label: 'Courteous', count: 1, tone: 'pos' },
    ],
    response: [
      { label: 'Deposit', value: '×1.5' },
      { label: 'Booking', value: 'Inspection required' },
      { label: 'Finance', value: 'Higher hold' },
    ],
  },
  {
    initials: 'S·',
    name: 'Redacted renter',
    cin: 'CIN S••••66',
    hash: 'f7d2··a3',
    band: 'BLACKLISTED',
    score: 2.0,
    reviewCount: 2,
    agencyCount: 2,
    deposit: '—',
    blocked: true,
    aha: 'Flagged by 2 agencies before you.',
    recommendation: 'Booking hard-locked by an active network flag. Manager override required.',
    flag: {
      reason: 'Unpaid damages',
      severity: 'HIGH',
      agency: 'Prestige Cars',
      city: 'Casablanca',
      evidence: 3,
    },
    tags: [],
    response: [
      { label: 'Booking', value: 'HARD-LOCKED' },
      { label: 'Override', value: 'Manager reason' },
    ],
  },
  {
    initials: 'SM',
    name: 'Sara Mansouri',
    cin: 'CIN A••••04',
    hash: '00b9··5c',
    band: 'NEW',
    score: null,
    reviewCount: 0,
    agencyCount: 0,
    deposit: '×1.0',
    aha: 'First on the network — you’d set the first signal.',
    recommendation: 'No network history. Full deposit, scan ID into the Trust Vault, photo inspection.',
    tags: [],
    response: [
      { label: 'Deposit', value: '×1.0 (full)' },
      { label: 'Vault', value: 'Scan ID' },
      { label: 'Booking', value: 'Photo inspection' },
    ],
  },
];

const AGENCIES = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger'];

const BAND_STYLE: Record<Band, { pill: string; ring: string; stroke: string; Icon: React.ElementType; label: string }> = {
  TRUSTED: { pill: 'text-success bg-success/10 border-success/30', ring: 'ring-success/40', stroke: 'hsl(142 70% 45%)', Icon: ShieldCheck, label: 'Trusted' },
  CAUTION: { pill: 'text-warning bg-warning/10 border-warning/30', ring: 'ring-warning/40', stroke: 'hsl(38 72% 55%)', Icon: ShieldAlert, label: 'Caution' },
  BLACKLISTED: { pill: 'text-danger bg-danger/10 border-danger/30', ring: 'ring-danger/40', stroke: 'hsl(0 72% 51%)', Icon: ShieldX, label: 'Blacklisted' },
  NEW: { pill: 'text-text-muted bg-surface-raised border-hairline', ring: 'ring-hairline', stroke: 'hsl(0 0% 60%)', Icon: ShieldQuestion, label: 'New' },
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function TrustConsole() {
  const [personaIndex, setPersonaIndex] = React.useState(0);
  const [networkOn, setNetworkOn] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>('hashing');
  const [autoplay, setAutoplay] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  const [displayScore, setDisplayScore] = React.useState(0);
  const [runId, setRunId] = React.useState(0);

  const persona = PERSONAS[personaIndex];
  const band = BAND_STYLE[persona.band];
  const reduced = React.useRef(false);
  React.useEffect(() => {
    reduced.current = prefersReducedMotion();
  }, []);

  // Phase machine: runs whenever persona / networkOn / runId changes.
  React.useEffect(() => {
    if (!networkOn) {
      setPhase('blind');
      return;
    }
    if (reduced.current) {
      setPhase('resolved');
      return;
    }
    setPhase('hashing');
    const t1 = setTimeout(() => setPhase('scanning'), 650);
    const t2 = setTimeout(() => setPhase('resolved'), 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [personaIndex, networkOn, runId]);

  // Score count-up when resolved.
  React.useEffect(() => {
    if (phase !== 'resolved' || persona.score === null) {
      setDisplayScore(0);
      return;
    }
    if (reduced.current) {
      setDisplayScore(persona.score);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const target = persona.score;
    const dur = 700;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, persona.score]);

  // Autoplay: cycle personas every ~6s unless paused or hovered.
  React.useEffect(() => {
    if (!autoplay || hovered || reduced.current) return;
    const t = setTimeout(() => setPersonaIndex((i) => (i + 1) % PERSONAS.length), 6000);
    return () => clearTimeout(t);
  }, [autoplay, hovered, personaIndex, phase]);

  const rerun = () => setRunId((n) => n + 1);
  const gaugePct = persona.score === null ? 0 : displayScore / 5;

  return (
    <div
      className="glass rounded-[1.5rem] border border-hairline p-6 min-h-[540px] flex flex-col relative overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-danger/20 border border-danger/40" />
            <span className="w-3 h-3 rounded-full bg-warning/20 border border-warning/40" />
            <span className="w-3 h-3 rounded-full bg-success/20 border border-success/40" />
          </div>
          <span className="eyebrow hidden sm:inline">Cross-network trust check</span>
        </div>
        <Badge variant="secondary">Illustrative data</Badge>
      </div>

      {/* Persona chips */}
      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {PERSONAS.map((p, i) => {
          const active = i === personaIndex;
          return (
            <button
              key={p.name}
              onClick={() => {
                setAutoplay(false);
                setPersonaIndex(i);
              }}
              aria-label={`Check ${p.name}`}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all',
                active ? 'bg-surface-raised border-primary/40 ring-1 ring-primary/40' : 'bg-surface border-hairline hover:border-border',
              )}
            >
              <span className="shrink-0 w-7 h-7 rounded-lg bg-surface-raised border border-hairline flex items-center justify-center text-[10px] font-semibold text-cream">
                {p.initials}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-foreground truncate leading-tight">{p.name.split(' ')[0]}</span>
                <span className="block text-[9px] font-mono text-text-faint truncate">{p.cin}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* FIDER switch */}
      <div className="relative flex items-center justify-between rounded-xl bg-surface-raised border border-hairline px-4 py-2.5 mb-4">
        <span className="eyebrow">Fider network</span>
        <button
          role="switch"
          aria-checked={networkOn}
          aria-label="Toggle the Fider trust network"
          onClick={() => {
            setAutoplay(false);
            setNetworkOn((v) => !v);
          }}
          className={cn(
            'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
            networkOn ? 'bg-primary/30 border-primary/50' : 'bg-surface border-hairline',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full transition-transform duration-300 shadow',
              networkOn ? 'translate-x-8 bg-primary' : 'translate-x-1 bg-text-faint',
            )}
          />
          <span className={cn('absolute text-[8px] font-semibold tracking-wide', networkOn ? 'start-2 text-primary-foreground' : 'end-2 text-text-faint')}>
            {networkOn ? 'On' : 'Off'}
          </span>
        </button>
      </div>

      {/* Body */}
      <div className="relative flex-1">
        {!networkOn ? (
          <BlindCard />
        ) : phase === 'resolved' ? (
          <Verdict persona={persona} band={band} displayScore={displayScore} gaugePct={gaugePct} />
        ) : (
          <Querying persona={persona} phase={phase} />
        )}
      </div>

      {/* Footer controls + honesty caption */}
      <div className="relative mt-4 pt-4 border-t border-hairline flex items-center justify-between gap-3">
        <p className="text-[9px] text-text-faint leading-relaxed max-w-[62%] flex items-center gap-1.5">
          <Lock className="w-3 h-3 shrink-0 text-text-faint" />
          CIN is HMAC-hashed server-side with a secret pepper before the derived hash is used for trust matching.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoplay((v) => !v)}
            aria-label={autoplay ? 'Pause auto-cycle' : 'Play auto-cycle'}
            className="w-8 h-8 rounded-lg bg-surface-raised border border-hairline flex items-center justify-center text-text-muted hover:text-foreground hover:border-border transition-colors"
          >
            {autoplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={rerun}
            aria-label="Re-run the check"
            className="w-8 h-8 rounded-lg bg-surface-raised border border-hairline flex items-center justify-center text-text-muted hover:text-foreground hover:border-border transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BlindCard() {
  return (
    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-hairline bg-surface animate-in fade-in duration-500">
      <div className="w-14 h-14 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center mb-4">
        <ShieldQuestion className="w-7 h-7 text-text-faint" />
      </div>
      <p className="text-base font-semibold text-text-muted blur-[1px] select-none">New customer</p>
      <p className="eyebrow text-text-faint mt-1">No shared history</p>
      <p className="text-xs text-text-muted mt-4 max-w-xs leading-relaxed">
        Off the network, every renter looks the same. You’d hand all four the same keys.
      </p>
    </div>
  );
}

function Querying({ persona, phase }: { persona: Persona; phase: Phase }) {
  return (
    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
      <div className="font-mono text-lg text-primary mb-3 tracking-widest">
        {phase === 'hashing' ? <ScrambleHash target={persona.hash} /> : persona.hash}
      </div>
      <p className="eyebrow text-text-muted mb-6">
        {phase === 'hashing' ? 'Hashing identity…' : 'Querying the network…'}
      </p>
      <div className="flex items-center gap-2">
        {AGENCIES.map((city, i) => {
          const lit = phase === 'scanning';
          return (
            <div
              key={city}
              className={cn(
                'flex flex-col items-center gap-1 transition-all duration-300',
                lit ? 'opacity-100' : 'opacity-30',
              )}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', lit ? 'border-success/40 bg-success/10' : 'border-hairline bg-surface-raised')}>
                <Building2 className={cn('w-4 h-4', lit ? 'text-success' : 'text-text-faint')} />
              </div>
              <span className="text-[8px] font-medium tracking-wide text-text-faint">{city}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScrambleHash({ target }: { target: string }) {
  const [txt, setTxt] = React.useState('········');
  React.useEffect(() => {
    const chars = '0123456789abcdef';
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setTxt(
        target
          .split('')
          .map((c) => (c === '·' ? '·' : chars[Math.floor((Math.sin(n * 9.7 + c.charCodeAt(0)) * 0.5 + 0.5) * 15)]))
          .join(''),
      );
      if (n > 8) {
        clearInterval(id);
        setTxt(target);
      }
    }, 60);
    return () => clearInterval(id);
  }, [target]);
  return <>{txt}</>;
}

function Verdict({
  persona,
  band,
  displayScore,
  gaugePct,
}: {
  persona: Persona;
  band: (typeof BAND_STYLE)[Band];
  displayScore: number;
  gaugePct: number;
}) {
  const R = 34;
  const C = Math.PI * R; // half-circle circumference
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      {/* Band + gauge */}
      <div className="flex items-center gap-5 mb-4">
        <div className="relative w-[92px] h-[52px] shrink-0">
          {/* Decorative only — no SrDataTable needed here. Unlike the dashboard
              charts, every figure this gauge encodes is already visible text
              inside/beside it: the score and "/ 5" are rendered below, and the
              band label, review count and agency count sit to its right. An
              sr-only table would just double-announce them. */}
          <svg viewBox="0 0 92 52" className="w-full h-full" aria-hidden="true">
            <path d="M 12 48 A 34 34 0 0 1 80 48" fill="none" stroke="var(--color-hairline)" strokeWidth="7" strokeLinecap="round" />
            <path
              d="M 12 48 A 34 34 0 0 1 80 48"
              fill="none"
              stroke={band.stroke}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - gaugePct)}
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
            <span className="font-mono tabular text-lg font-semibold text-foreground leading-none">
              {persona.score === null ? '—' : displayScore.toFixed(1)}
            </span>
            <span className="text-[8px] font-medium text-text-faint tracking-wide">{persona.score === null ? 'No score' : '/ 5'}</span>
          </div>
        </div>
        <div className="min-w-0">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide', band.pill, persona.blocked && 'animate-pulse')}>
            <band.Icon className="w-3.5 h-3.5" />
            {band.label}
          </span>
          <p className="text-[11px] text-text-muted mt-2 font-medium">{persona.aha}</p>
          <p className="text-[10px] text-text-faint">
            {persona.reviewCount} reviews · {persona.agencyCount} agencies
          </p>
        </div>
      </div>

      {/* Hard-block banner */}
      {persona.blocked && persona.flag && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-danger mb-1">Booking blocked by the network</p>
          <p className="text-[11px] text-text-muted leading-relaxed">
            <span className="font-semibold text-foreground">{persona.flag.reason}</span> · {persona.flag.severity} · flagged by {persona.flag.agency}, {persona.flag.city} · {persona.flag.evidence} evidence files
          </p>
          <div className="mt-2 flex items-center gap-2 opacity-60">
            <input
              disabled
              placeholder="Manager override — reason required"
              className="flex-1 rounded-md bg-surface-raised border border-hairline px-2 py-1 text-[10px] text-text-faint placeholder:text-text-faint"
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {persona.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {persona.tags.map((t, i) => (
            <span
              key={t.label}
              className={cn(
                'text-[9px] font-semibold uppercase tracking-wider rounded-full px-2 py-1 border animate-in fade-in slide-in-from-bottom-2',
                t.tone === 'pos' ? 'text-success/80 bg-success/5 border-success/20' : 'text-warning/80 bg-warning/5 border-warning/20',
              )}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {t.label} ×{t.count}
            </span>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded-xl bg-surface-raised border border-hairline p-3 mb-3">
        <p className="eyebrow mb-1">Recommendation</p>
        <p className="text-xs text-text-muted leading-relaxed">{persona.recommendation}</p>
      </div>

      {/* Network response strip — the one-spine proof */}
      <div className="grid grid-cols-3 gap-2">
        {persona.response.map((r) => (
          <div key={r.label} className="rounded-lg bg-surface-raised border border-hairline px-2.5 py-2">
            <p className="text-[8px] font-semibold uppercase tracking-widest text-text-faint mb-0.5">{r.label}</p>
            <p className={cn('text-[11px] font-semibold', persona.blocked && r.value === 'HARD-LOCKED' ? 'text-danger' : 'text-foreground')}>{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}