'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, Mail, Phone, MessageSquare, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="py-16 md:py-24 max-w-4xl mx-auto px-6">
      <Link
        href="/landing"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à l'accueil
      </Link>

      <div className="mb-12 border-b border-hairline pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-raised border border-hairline text-xs font-mono text-primary mb-4">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>SUPPORT CLIENT & ASSISTANCE TECHNIQUE</span>
        </div>
        <h1 className="font-display text-3xl md:text-5xl text-foreground mb-4">
          Centre d'Assistance Fider
        </h1>
        <p className="text-text-muted text-sm font-mono">
          Assistance opérationnelle pour agences et conducteurs au Maroc
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 rounded-2xl bg-surface border border-hairline flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center text-primary mb-4">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">Support Email</h3>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Pour toute question technique, intégration API ou problème de synchronisation mobile.
            </p>
          </div>
          <a
            href="mailto:support@carhub.codes"
            className="text-sm font-semibold text-primary hover:underline"
          >
            support@carhub.codes
          </a>
        </div>

        <div className="p-6 rounded-2xl bg-surface border border-hairline flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center text-success mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">WhatsApp Direct</h3>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Assistance instantanée 7j/7 pour les agents d'accueil et chefs d'agence.
            </p>
          </div>
          <a
            href="https://wa.me/212616880653"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-success hover:underline"
          >
            +212 616-880653
          </a>
        </div>

        <div className="p-6 rounded-2xl bg-surface border border-hairline flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center text-accent mb-4">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">Ligne Entreprise</h3>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Déploiement en agence, formation de vos équipes et comptes entreprise.
            </p>
          </div>
          <span className="text-sm font-semibold text-foreground">
            Casablanca, Maroc
          </span>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-surface border border-hairline space-y-4">
        <h2 className="font-display text-xl text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Disponibilité et Délais d'Intervention
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Notre équipe technique basée à Casablanca traite les demandes prioritaires d'inspection et de blocage d'accès sous <strong>moins de 15 minutes</strong> pendant les heures d'ouverture (8h00 - 20h00, du lundi au dimanche).
        </p>
        <div className="pt-4 border-t border-hairline flex flex-wrap gap-4 text-xs font-mono text-text-muted">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" /> Chiffrement TLS 1.3</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" /> Serveurs Sauvegardés Quotidiennement</span>
        </div>
      </div>
    </div>
  );
}
