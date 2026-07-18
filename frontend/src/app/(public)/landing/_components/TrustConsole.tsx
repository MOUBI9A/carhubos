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
  CAUTION: { pill: 'text-amber-400 bg-amber-400/10 border-amber-400/30', ring: 'ring-amber-400/40', stroke: 'hsl(43 96% 56%)', Icon: ShieldAlert, label: 'Caution' },
  BLACKLISTED: { pill: 'text-danger bg-danger/10 border-danger/30', ring: 'ring-danger/40', stroke: 'hsl(0 72% 51%)', Icon: ShieldX, label: 'Blacklisted' },
  NEW: { pill: 'text-white/50 bg-white/5 border-white/10', ring: 'ring-white/10', stroke: 'hsl(0 0% 60%)', Icon: ShieldQuestion, label: 'New' },
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
      className="glass rounded-[1.5rem] border border-white/10 p-6 min-h-[540px] flex flex-col relative overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
            <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
            <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hidden sm:inline">
            Cross-network trust check
          </span>
        </div>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/80 bg-primary/10 border border-primary/20 rounded-full px-2 py-1">
          Illustrative data
        </span>
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
                active ? 'bg-white/[0.06] border-primary/40 ring-1 ring-primary/40' : 'bg-white/[0.02] border-white/5 hover:border-white/20',
              )}
            >
              <span className="shrink-0 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/70">
                {p.initials}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-white/80 truncate leading-tight">{p.name.split(' ')[0]}</span>
                <span className="block text-[9px] font-mono text-white/30 truncate">{p.cin}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* FIDER switch */}
      <div className="relative flex items-center justify-between rounded-xl bg-black/30 border border-white/5 px-4 py-2.5 mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Fider network</span>
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
            networkOn ? 'bg-primary/30 border-primary/50' : 'bg-white/5 border-white/10',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full transition-transform duration-300 shadow',
              networkOn ? 'translate-x-8 bg-primary shadow-[0_0_12px_rgba(168,85,247,0.6)]' : 'translate-x-1 bg-white/40',
            )}
          />
          <span className={cn('absolute text-[8px] font-black uppercase tracking-widest', networkOn ? 'left-2 text-primary-foreground/90' : 'right-2 text-white/40')}>
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
      <div className="relative mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
        <p className="text-[9px] text-white/30 leading-relaxed max-w-[62%] flex items-center gap-1.5">
          <Lock className="w-3 h-3 shrink-0 text-white/20" />
          CIN is HMAC-hashed on device — only the hash is queried, never sent or logged as plaintext.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoplay((v) => !v)}
            aria-label={autoplay ? 'Pause auto-cycle' : 'Play auto-cycle'}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {autoplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={rerun}
            aria-label="Re-run the check"
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] animate-in fade-in duration-500">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        <ShieldQuestion className="w-7 h-7 text-white/25" />
      </div>
      <p className="text-sm font-black uppercase tracking-wider text-white/50 blur-[1px] select-none">New customer</p>
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mt-1">No shared history</p>
      <p className="text-xs text-white/40 mt-4 max-w-xs leading-relaxed">
        Off the network, every renter looks the same. You’d hand all four the same keys.
      </p>
    </div>
  );
}

function Querying({ persona, phase }: { persona: Persona; phase: Phase }) {
  return (
    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
      <div className="font-mono text-lg text-primary text-glow mb-3 tracking-widest">
        {phase === 'hashing' ? <ScrambleHash target={persona.hash} /> : persona.hash}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-6">
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
              <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', lit ? 'border-success/40 bg-success/10' : 'border-white/10 bg-white/5')}>
                <Building2 className={cn('w-4 h-4', lit ? 'text-success' : 'text-white/30')} />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/30">{city}</span>
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
          <svg viewBox="0 0 92 52" className="w-full h-full">
            <path d="M 12 48 A 34 34 0 0 1 80 48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeLinecap="round" />
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
            <span className="text-lg font-black text-white leading-none">
              {persona.score === null ? '—' : displayScore.toFixed(1)}
            </span>
            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{persona.score === null ? 'No score' : '/ 5'}</span>
          </div>
        </div>
        <div className="min-w-0">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest', band.pill, persona.blocked && 'animate-pulse')}>
            <band.Icon className="w-3.5 h-3.5" />
            {band.label}
          </span>
          <p className="text-[11px] text-white/50 mt-2 font-medium">{persona.aha}</p>
          <p className="text-[10px] text-white/30">
            {persona.reviewCount} reviews · {persona.agencyCount} agencies
          </p>
        </div>
      </div>

      {/* Hard-block banner */}
      {persona.blocked && persona.flag && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-danger mb-1">Booking blocked by the network</p>
          <p className="text-[11px] text-white/60 leading-relaxed">
            <span className="font-bold text-white/80">{persona.flag.reason}</span> · {persona.flag.severity} · flagged by {persona.flag.agency}, {persona.flag.city} · {persona.flag.evidence} evidence files
          </p>
          <div className="mt-2 flex items-center gap-2 opacity-60">
            <input
              disabled
              placeholder="Manager override — reason required"
              className="flex-1 rounded-md bg-black/40 border border-white/10 px-2 py-1 text-[10px] text-white/40 placeholder:text-white/25"
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
                'text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-1 border animate-in fade-in slide-in-from-bottom-2',
                t.tone === 'pos' ? 'text-success/80 bg-success/5 border-success/20' : 'text-amber-400/80 bg-amber-400/5 border-amber-400/20',
              )}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {t.label} ×{t.count}
            </span>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 mb-3">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/70 mb-1">Recommendation</p>
        <p className="text-xs text-white/70 leading-relaxed">{persona.recommendation}</p>
      </div>

      {/* Network response strip — the one-spine proof */}
      <div className="grid grid-cols-3 gap-2">
        {persona.response.map((r) => (
          <div key={r.label} className="rounded-lg bg-black/30 border border-white/5 px-2.5 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-0.5">{r.label}</p>
            <p className={cn('text-[11px] font-bold', persona.blocked && r.value === 'HARD-LOCKED' ? 'text-danger' : 'text-white/80')}>{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
