"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  Car,
  Clock,
  ShieldCheck,
  FileText,
  Phone,
  MapPin,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface EstimateData {
  orderNumber: string;
  status: string;
  priority: string;
  description: string;
  customerNotes: string | null;
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  partsTotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  parts: Array<{
    partNumber?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
  }>;
  createdAt: string;
  agency: {
    name: string;
    city: string;
    address: string | null;
    businessPhone: string | null;
    contactEmail: string;
  };
  vehicle: {
    brand: string;
    model: string;
    year: number | null;
    licensePlate: string | null;
    maskedVin: string | null;
  };
}

export default function EstimateApprovalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateData | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchEstimate() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/public/estimates/${token}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Devis introuvable ou lien expiré');
        }
        const data = await res.json();
        setEstimate(data);
        if (data.status === 'APPROVED') {
          setApprovedSuccess(true);
        }
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement du devis');
      } finally {
        setLoading(false);
      }
    }

    fetchEstimate();
  }, [token]);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/public/estimates/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || 'Client',
          notes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Échec de l\'approbation du devis');
      }

      setApprovedSuccess(true);
      if (estimate) {
        setEstimate({ ...estimate, status: 'APPROVED' });
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e11] text-[#f4f4f6] flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Chargement sécurisé de votre devis d'atelier…</p>
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen bg-[#0e0e11] text-[#f4f4f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#18181c] border border-red-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-red-200">Lien Invalide ou Expiré</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {error || 'Ce devis n\'existe pas ou a expiré. Veuillez contacter directement votre atelier automobile.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#f1f1f4] py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-violet-600 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Brand / Workshop Header */}
        <div className="bg-[#151518]/90 border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
              <h1 className="text-xl font-bold tracking-tight text-white">{estimate.agency.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-2">
              {estimate.agency.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" />
                  {estimate.agency.address ? `${estimate.agency.address}, ` : ''}{estimate.agency.city}
                </span>
              )}
              {estimate.agency.businessPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-violet-400" />
                  {estimate.agency.businessPhone}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Devis Atelier</span>
            <p className="font-mono text-sm font-bold text-violet-400">{estimate.orderNumber}</p>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              approvedSuccess || estimate.status === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {approvedSuccess || estimate.status === 'APPROVED' ? 'Approuvé' : 'En Attente de Validation'}
            </span>
          </div>
        </div>

        {/* Vehicle Dossier Banner */}
        <div className="bg-gradient-to-r from-violet-950/30 via-[#18181e] to-violet-950/20 border border-violet-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl text-violet-300">
              <Car className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {estimate.vehicle.brand} {estimate.vehicle.model}
                </h2>
                {estimate.vehicle.year && (
                  <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-zinc-300 border border-white/5">
                    {estimate.vehicle.year}
                  </span>
                )}
                {estimate.vehicle.licensePlate && (
                  <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                    {estimate.vehicle.licensePlate}
                  </span>
                )}
              </div>
              {estimate.vehicle.maskedVin && (
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  N° Châssis (VIN): {estimate.vehicle.maskedVin}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Scope / Work Description */}
        <div className="bg-[#151518]/80 border border-white/5 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Wrench className="w-4 h-4" />
            <span>Travaux & Diagnostic Requis</span>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed bg-[#1b1b20] p-4 rounded-xl border border-white/5">
            {estimate.description}
          </p>
          {estimate.customerNotes && (
            <p className="text-xs text-zinc-400 italic">
              Remarques client: "{estimate.customerNotes}"
            </p>
          )}
        </div>

        {/* Itemized Parts & Labor Breakdown */}
        <div className="bg-[#151518]/80 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center justify-between">
            <span>Détail des Pièces & Main d'Œuvre</span>
            <span className="text-xs font-normal text-zinc-500">TVA 20% incluse</span>
          </h3>

          <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-[#121215]">
            {/* Labor row */}
            <div className="p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.02] transition">
              <div className="space-y-0.5">
                <p className="font-medium text-white">Main d'Œuvre Qualifiée</p>
                <p className="text-zinc-500 text-[11px]">
                  {estimate.laborHours}h d'intervention technique @ {estimate.laborRate} MAD/h
                </p>
              </div>
              <p className="font-mono font-semibold text-zinc-200">
                {estimate.laborTotal.toFixed(2)} MAD
              </p>
            </div>

            {/* Parts rows */}
            {estimate.parts && estimate.parts.length > 0 ? (
              estimate.parts.map((p, idx) => {
                const qty = p.quantity || 1;
                const price = p.unitPrice || 0;
                const total = qty * price;
                return (
                  <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.02] transition">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{p.name || 'Pièce de Rechange'}</p>
                        {p.partNumber && (
                          <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">
                            {p.partNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-500 text-[11px]">
                        Quantité: {qty} × {price.toFixed(2)} MAD
                      </p>
                    </div>
                    <p className="font-mono font-semibold text-zinc-200">
                      {total.toFixed(2)} MAD
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-xs text-zinc-500 italic text-center">
                Aucune pièce détachée requise pour cette intervention
              </div>
            )}
          </div>

          {/* Pricing Totals Box */}
          <div className="bg-[#18181d] border border-white/5 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Total Pièces (HT)</span>
              <span className="font-mono">{estimate.partsTotal.toFixed(2)} MAD</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Total Main d'Œuvre (HT)</span>
              <span className="font-mono">{estimate.laborTotal.toFixed(2)} MAD</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>TVA Légale Marocaine (20%)</span>
              <span className="font-mono">{estimate.taxAmount.toFixed(2)} MAD</span>
            </div>
            <div className="border-t border-white/10 pt-3 mt-2 flex justify-between items-baseline">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                Total TTC Net à Payer
              </span>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-violet-400">
                  {estimate.totalAmount.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-violet-300 ml-1.5">MAD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Digital Approval Form or Success Banner */}
        {approvedSuccess || estimate.status === 'APPROVED' ? (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3 animate-fade-in shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-emerald-200">
              Devis Validé & Travaux Approuvés
            </h3>
            <p className="text-xs text-emerald-300/80 max-w-md mx-auto leading-relaxed">
              Votre accord numérique a été transmis en temps réel aux mécaniciens et au chef d'atelier de {estimate.agency.name}. Vous serez notifié dès que votre véhicule sera prêt.
            </p>
          </div>
        ) : (
          <div className="bg-[#151518]/90 border border-violet-500/20 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
              <h3 className="text-base font-bold text-white">Approbation Numérique du Devis</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              En signant ce formulaire, vous autorisez l'atelier à débuter les réparations conformément au devis ci-dessus d'un montant total de <strong>{estimate.totalAmount.toFixed(2)} MAD</strong>.
            </p>

            <form onSubmit={handleApprove} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nom & Prénom du Signataire *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Youssef Mansouri"
                  className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Instructions ou Remarques Additionnelles (Optionnel)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Merci de garder les pièces usagées / Me contacter pour l'heure de retrait"
                  className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-violet-600 focus:ring-violet-500 bg-[#1b1b22]"
                />
                <span className="text-xs text-zinc-400 leading-relaxed">
                  Je confirme l'exactitude des informations et donne mon accord pour la réalisation des travaux d'atelier décrits au montant de {estimate.totalAmount.toFixed(2)} MAD TTC.
                </span>
              </label>

              <button
                type="submit"
                disabled={!agreed || submitting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-xl text-sm transition shadow-lg shadow-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement de votre accord…
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approuver & Signer Numériquement</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[11px] text-zinc-600 pt-4">
          <p>Fider / CarHub OS · Plateforme d'Exploitation Automobile & Gestion d'Atelier</p>
          <p className="mt-1">Transaction chiffrée de bout en bout · Conforme au droit de la consommation</p>
        </div>

      </div>
    </div>
  );
}
