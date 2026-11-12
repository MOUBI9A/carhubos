import Link from "next/link";
import { ArrowLeft, CreditCard, Info } from "lucide-react";

export default function RefundsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link href="/landing" className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l&apos;accueil
      </Link>
      <h1 className="mb-6 flex items-center gap-3 text-3xl font-semibold text-foreground">
        <CreditCard className="h-7 w-7 text-primary" aria-hidden="true" /> Paiements et remboursements
      </h1>
      <div className="space-y-7 text-sm leading-relaxed text-text-muted">
        <p role="note" className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-5 text-foreground">
          <Info className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <span><strong>Conditions commerciales en cours de validation.</strong>
          Aucun droit, délai ou pénalité spécifique n&apos;est annoncé ici sans contrat confirmé.</span>
        </p>
        <section>
          <h2 className="mb-2 text-xl text-foreground">Abonnements CarHub OS</h2>
          <p>Les tarifs sont affichés lorsqu&apos;un abonnement est proposé. Les conditions
            d&apos;annulation, d&apos;échéance et de remboursement doivent être communiquées
            avant un paiement et dans le contrat applicable. Pour une question sur une facture
            du logiciel, écrivez à{" "}
            <a href="mailto:support@carhub.codes?subject=Question%20sur%20facturation" className="text-primary underline">support@carhub.codes</a>.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl text-foreground">Locations de véhicules et cautions</h2>
          <p>L&apos;agence de location concernée doit fournir les règles applicables aux
            annulations, cautions, dommages et frais avant confirmation de la location.
            Une inspection ou une suggestion technique ne constitue pas en soi une
            autorisation de prélèvement.
          </p>
        </section>
        <p>Consultez aussi les <Link href="/terms" className="text-primary underline">conditions d&apos;utilisation</Link>.</p>
      </div>
    </div>
  );
}
