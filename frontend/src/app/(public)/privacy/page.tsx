'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          <Shield className="w-3.5 h-3.5" />
          <span>CONFORMITÉ LOI 09-08 & CNDP</span>
        </div>
        <h1 className="font-display text-3xl md:text-5xl text-foreground mb-4">
          Politique de Confidentialité
        </h1>
        <p className="text-text-muted text-sm font-mono">
          Dernière mise à jour : {lastUpdated} · Fider Technologies SARL
        </p>
      </div>

      <div className="space-y-12 text-foreground/90 leading-relaxed text-sm md:text-base">
        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">01.</span> Introduction et Portée
          </h2>
          <p className="text-text-muted">
            La présente Politique de Confidentialité régit la collecte, le traitement et la conservation des données à caractère personnel effectuées par la plateforme <strong>Fider</strong> (ci-après « la Plateforme », « l'Application »), exploitée par CarHub OS / Fider Mobility, accessible sur <code>https://www.carhub.codes</code> et via ses applications mobiles natives iOS et Android.
          </p>
          <p className="text-text-muted">
            Fider s'engage formellement à respecter la législation marocaine en vigueur, notamment la <strong>Loi n° 09-08</strong> relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, ainsi que les directives de la Commission Nationale de contrôle de la protection des Données à caractère Personnel (<strong>CNDP</strong>).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">02.</span> Données Collectées
          </h2>
          <p className="text-text-muted">Dans le cadre de l'exécution des contrats de location et de la gestion de flotte :</p>
          <div className="grid md:grid-cols-2 gap-4 my-4">
            <div className="p-4 rounded-xl bg-surface border border-hairline">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Données d'Identité & Permis
              </h3>
              <p className="text-xs text-text-muted">
                Nom complet, numéro de Carte d'Identité Nationale (CIN) ou Passeport, numéro de permis de conduire, date de validité, photographies du document d'identité (coffre sécurisé).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-hairline">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Inspections & Télémesure
              </h3>
              <p className="text-xs text-text-muted">
                Photographies de l'état du véhicule (départ/retour), niveau de carburant, kilométrage relevé, signatures électroniques des parties contractantes.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-hairline">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Données de Compte & Sécurité
              </h3>
              <p className="text-xs text-text-muted">
                Adresse email, numéro de téléphone, mot de passe haché (bcrypt), adresse IP, identifiants d'appareils mobiles (tokens de notification push).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-hairline">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Transactions Financières
              </h3>
              <p className="text-xs text-text-muted">
                Dépôts de garantie, factures en MAD, montants réglés par espèces, virement, chèque ou carte bancaire. Aucune coordonnée bancaire brute n'est stockée sur nos serveurs.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">03.</span> Finalités du Traitement
          </h2>
          <ul className="list-disc ps-6 space-y-2 text-text-muted">
            <li>Création, suivi et exécution des contrats de location de véhicules au Maroc.</li>
            <li>Vérification préalable de l'authenticité des conducteurs et prévention de la fraude documentaire.</li>
            <li>Gestion des états des lieux photographiques contradictoires et résolution impartiale des litiges de restitution.</li>
            <li>Envoi d'alertes opérationnelles (rappel de restitution, échéance d'assurance, validation de consentement).</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">04.</span> Conservation et Sécurité des Données
          </h2>
          <p className="text-text-muted">
            Toutes les communications réseau transitent par des canaux chiffrés <strong>TLS 1.3 / HTTPS</strong>. Les documents d'identité sont conservés dans un coffre numérique privé isolé (chiffrement au repos AES-256) avec accès soumis au consentement explicite et révocable du conducteur.
          </p>
          <p className="text-text-muted">
            Conformément aux obligations du Code de Commerce marocain, les pièces comptables et contrats de location sont archivés pour la durée légale requise (10 ans), après quoi les données personnelles associées sont purgées ou anonymisées.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-3">
            <span className="text-primary font-mono text-lg">05.</span> Droits des Utilisateurs & Suppression de Compte
          </h2>
          <p className="text-text-muted">
            Conformément à la Loi 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition sur vos données personnelles.
          </p>
          <p className="text-text-muted">
            Vous pouvez à tout moment demander la <strong>suppression intégrale de votre compte et de vos données personnelles</strong> :
          </p>
          <ul className="list-disc ps-6 space-y-2 text-text-muted">
            <li>Directement depuis l'application mobile Fider via l'onglet <em>Paramètres &gt; Supprimer mon compte</em>.</li>
            <li>En ligne sur notre portail dédié : <Link href="/account-deletion" className="text-primary underline">https://www.carhub.codes/account-deletion</Link>.</li>
            <li>Par courrier électronique à notre Délégué à la Protection des Données : <a href="mailto:privacy@carhub.codes" className="text-primary underline">privacy@carhub.codes</a>.</li>
          </ul>
        </section>

        <section className="space-y-4 border-t border-hairline pt-8">
          <h2 className="font-display text-xl md:text-2xl text-foreground">
            Contactez notre Service Juridique & Données
          </h2>
          <p className="text-text-muted">
            Pour toute question concernant cette politique ou pour exercer vos droits :<br />
            <strong>Fider Technologies — DPO</strong><br />
            Boulevard de la Corniche, Anfa, Casablanca, Maroc<br />
            Email : <a href="mailto:privacy@carhub.codes" className="text-primary">privacy@carhub.codes</a> · Support : <a href="mailto:support@carhub.codes" className="text-primary">support@carhub.codes</a>
          </p>
        </section>
      </div>
    </div>
  );
}
