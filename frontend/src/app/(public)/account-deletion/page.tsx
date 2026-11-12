"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/lib/contexts/ToastContext";
import api from "@/lib/api";

export default function AccountDeletionPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [closed, setClosed] = useState(false);

  async function closeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || !window.confirm("Confirmer la fermeture de ce compte et la désactivation de son accès ?")) return;
    setWorking(true);
    try {
      await api.delete("/auth/me", { data: { password } });
      setClosed(true);
      setPassword("");
      showToast("success", "Compte fermé", "L'accès est désactivé. Certaines archives et pièces justificatives peuvent être conservées après examen.");
      // The server has invalidated this account and cleared its session cookie.
      await logout();
    } catch (error: unknown) {
      const detail = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      showToast("danger", "Fermeture impossible", detail || "Vérifiez votre mot de passe ou les locations encore en cours.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link href="/landing" className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l&apos;accueil
      </Link>
      <h1 className="mb-4 font-display text-3xl text-foreground md:text-5xl">
        Fermeture de compte et droits sur les données
      </h1>
      <p className="mb-8 text-text-muted">
        Vous pouvez fermer votre accès au service. Une fermeture ne garantit pas
        l&apos;effacement immédiat de chaque document : des dossiers de location,
        preuves d&apos;inspection et archives nécessaires à des obligations applicables
        peuvent devoir être conservés ou examinés séparément.
      </p>

      <div className="mb-8 space-y-3 rounded-2xl border border-hairline bg-surface p-6 text-sm text-text-muted">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Ce que fait la fermeture en ligne
        </h2>
        <p>
          Après vérification du mot de passe et des locations actives, l&apos;accès au
          compte est désactivé, les principaux champs du profil sont anonymisés
          et les autorisations de consultation des documents sont révoquées.
        </p>
        <p>
          Le retrait de fichiers déjà stockés, des sauvegardes et des archives contractuelles
          nécessite un examen séparé. Pour demander l&apos;accès, une rectification ou
          l&apos;effacement de données supplémentaires, écrivez à{" "}
          <a href="mailto:privacy@carhub.codes?subject=Demande%20relative%20aux%20donnees" className="text-primary underline">
            privacy@carhub.codes
          </a>. Ne transmettez pas de copie de pièce d&apos;identité lors du premier contact.
        </p>
      </div>

      {closed ? (
        <div role="status" className="rounded-2xl border border-success/30 bg-surface p-8">
          <h2 className="text-xl font-semibold">Votre accès au compte a été désactivé.</h2>
          <p className="mt-3 text-text-muted">
            Des archives et fichiers peuvent être soumis à une revue de conservation distincte.
          </p>
        </div>
      ) : user ? (
        <form onSubmit={closeAccount} className="space-y-5 rounded-2xl border border-hairline bg-surface p-8">
          <h2 className="text-lg font-semibold text-foreground">Fermer le compte {user.email}</h2>
          <label htmlFor="delete-password" className="block text-sm font-medium text-text-muted">
            Confirmer avec votre mot de passe actuel
          </label>
          <input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-hairline bg-surface-raised px-4 py-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          />
          <button
            type="submit"
            disabled={working || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-danger px-5 py-3 font-semibold text-background disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {working ? "Fermeture en cours…" : "Confirmer la fermeture du compte"}
          </button>
        </form>
      ) : (
        <div className="space-y-3 rounded-2xl border border-hairline bg-surface p-8">
          <h2 className="text-xl font-semibold text-foreground">Vous n&apos;êtes pas connecté ?</h2>
          <p className="text-sm text-text-muted">
            <Link href="/login" className="text-primary underline">Connectez-vous</Link> pour fermer
            votre compte, ou contactez privacy@carhub.codes si vous avez perdu l&apos;accès.
            L&apos;équipe pourra vérifier votre demande sans collecter de nouveaux documents
            par défaut.
          </p>
        </div>
      )}
    </div>
  );
}
