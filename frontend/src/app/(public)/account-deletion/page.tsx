'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2, AlertTriangle, ShieldAlert, CheckCircle2, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

export default function AccountDeletionPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (!confirm('Êtes-vous absolument certain de vouloir supprimer définitivement votre compte ? Cette action est irréversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete('/auth/me', {
        data: { password, reason },
      });
      setIsDone(true);
      showToast('success', 'Compte supprimé', 'Vos données personnelles ont été supprimées avec succès.');
      setTimeout(() => {
        logout();
      }, 2500);
    } catch (err: any) {
      showToast(
        'danger',
        'Échec de la suppression',
        err.response?.data?.message || 'Mot de passe incorrect ou conditions de suppression non remplies.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="py-16 md:py-24 max-w-3xl mx-auto px-6">
      <Link
        href="/landing"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à l'accueil
      </Link>

      <div className="mb-10 border-b border-hairline pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-danger/10 border border-danger/20 text-xs font-mono text-danger mb-4">
          <Trash2 className="w-3.5 h-3.5" />
          <span>DROIT À L'OUBLI & SUPPRESSION DE COMPTE</span>
        </div>
        <h1 className="font-display text-3xl md:text-5xl text-foreground mb-4">
          Suppression de Compte & Données Personnelles
        </h1>
        <p className="text-text-muted text-sm leading-relaxed">
          Conformément aux exigences de l'Apple App Store (Règle 5.1.1), du Google Play Store et de la Loi marocaine 09-08, vous disposez d'un contrôle total sur vos données à caractère personnel.
        </p>
      </div>

      {isDone ? (
        <div className="p-8 rounded-2xl bg-surface border border-success/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-success/10 text-success mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl text-foreground">Votre compte a été supprimé</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Vos identifiants ont été révoqués et vos données personnelles ont été anonymisées. Vous allez être redirigé vers l'accueil.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="p-6 rounded-2xl bg-surface border border-hairline space-y-4">
            <h2 className="font-display text-lg text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-warning" /> Que devient votre dossier lors de la suppression ?
            </h2>
            <div className="space-y-3 text-sm text-text-muted leading-relaxed">
              <p>
                <strong className="text-foreground">Données immédiatement supprimées et anonymisées :</strong><br />
                Votre nom complet, adresse email, mot de passe haché, photographies de documents d'identité (CIN / permis), QR codes et autorisations de partage d'identité sont irrémédiablement purgés.
              </p>
              <p>
                <strong className="text-foreground">Données archivées pour obligations légales :</strong><br />
                En vertu des obligations du Code de Commerce marocain, les pièces comptables (factures, reçus de caution) et les procès-verbaux d'état des lieux contradictoires déjà signés sont conservés sous forme d'archives légales étanches sans réutilisation marketing possible.
              </p>
            </div>
          </div>

          {user ? (
            <div className="p-8 rounded-2xl bg-surface border border-hairline space-y-6">
              <div>
                <h3 className="font-display text-xl text-foreground mb-1">
                  Supprimer votre compte connecté ({user.email})
                </h3>
                <p className="text-xs text-text-muted">
                  Veuillez confirmer votre mot de passe pour déclencher la suppression immédiate.
                </p>
              </div>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-muted block">MOT DE PASSE ACTUEL</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-text-muted absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-surface-raised border border-hairline rounded-xl ps-10 pe-4 py-3 text-sm text-foreground outline-none focus:border-danger transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-muted block">MOTIF DE SUPPRESSION (OPTIONNEL)</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Clôture d'activité, changement de service..."
                    className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-hairline transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isDeleting || !password}
                    className="w-full py-3.5 px-6 rounded-xl bg-danger hover:bg-danger/90 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? 'Suppression en cours...' : 'Confirmer la suppression définitive'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-surface border border-hairline space-y-4">
              <h3 className="font-display text-xl text-foreground">
                Vous n'êtes pas connecté ?
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Pour supprimer votre compte en direct, vous pouvez <Link href="/login" className="text-primary underline">vous connecter</Link> puis revenir sur cette page ou utiliser l'application mobile Fider (<em>Paramètres &gt; Supprimer mon compte</em>).
              </p>
              <p className="text-sm text-text-muted leading-relaxed">
                Si vous n'avez plus accès à vos identifiants, vous pouvez également transmettre une demande manuelle de suppression par email à <a href="mailto:privacy@carhub.codes" className="text-primary underline">privacy@carhub.codes</a> en précisant l'adresse email associée à votre compte. Notre équipe traitera votre demande sous 48 heures ouvrées.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
