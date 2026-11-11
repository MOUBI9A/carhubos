'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  const lastUpdated = '12 Octobre 2026';

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
          <FileText className="w-3.5 h-3.5" />
          <span>CONDITIONS GÉNÉRALES D'UTILISATION</span>
        </div>
        <h1 className="font-display text-3xl md:text-5xl text-foreground mb-4">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-text-muted text-sm font-mono">
          Dernière mise à jour : {lastUpdated} · Fider ERP / CarHub OS
        </p>
      </div>

      <div className="space-y-12 text-foreground/90 leading-relaxed text-sm md:text-base">
        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">01.</span> Objet du Service
          </h2>
          <p className="text-text-muted">
            La plateforme <strong>Fider</strong> fournit aux agences de location de véhicules au Maroc une solution SaaS de gestion de flotte, de suivi des contrats, de réalisation des états des lieux contradictoires et de sécurisation des dossiers locataires.
          </p>
          <p className="text-text-muted">
            L'utilisation du service web et de l'application mobile Fider implique l'acceptation pleine et entière des présentes Conditions Générales d'Utilisation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">02.</span> Accès et Comptes Utilisateurs
          </h2>
          <ul className="list-disc ps-6 space-y-2 text-text-muted">
            <li><strong>Agences de location :</strong> Doivent être légalement enregistrées au Registre du Commerce au Maroc avec un Identifiant Commun de l'Entreprise (ICE) valide.</li>
            <li><strong>Sécurité des identifiants :</strong> Tout utilisateur est responsable de la confidentialité de son mot de passe et de ses tokens d'accès.</li>
            <li><strong>Rôles & Permissions :</strong> L'accès aux fonctionnalités sensibles (annulation de factures, suppression de véhicules, consultation d'historique) est régi par le système de permissions granulaires de l'agence.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">03.</span> États des Lieux & Force Probante
          </h2>
          <p className="text-text-muted">
            Les états des lieux de départ et de retour réalisés sur l'application mobile Fider comportent un horodatage cryptographique certifié, un relevé kilométrique contradictoire et des photographies géolocalisées avec signature électronique des parties.
          </p>
          <div className="p-4 rounded-xl bg-surface border border-hairline flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted">
              Ces relevés constituent le document de référence impartial en cas de contestation ultérieure relative à l'état mécanique ou esthétique du véhicule loué.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">04.</span> Responsabilité & Disponibilité
          </h2>
          <p className="text-text-muted">
            Fider s'efforce d'assurer une disponibilité du service 24h/24 et 7j/7 avec un engagement de service de 99.8%. Des opérations de maintenance programmées peuvent occasionner de brèves interruptions, notifiées à l'avance.
          </p>
          <div className="p-4 rounded-xl bg-surface border border-hairline flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted">
              Fider n'est pas partie prenante aux contrats de location conclus entre les agences partenaires et leurs clients finaux et décline toute responsabilité quant aux manquements contractuels des conducteurs ou des loueurs.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">05.</span> Droit Applicable et Juridiction
          </h2>
          <p className="text-text-muted">
            Les présentes conditions sont régies et interprétées conformément au <strong>droit marocain</strong>. En cas de litige non résolu à l'amiable, les tribunaux de commerce de Casablanca sont seuls compétents.
          </p>
        </section>
      </div>
    </div>
  );
}
