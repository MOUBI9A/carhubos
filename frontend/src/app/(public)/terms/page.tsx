import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <Link href="/landing" className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l&apos;accueil
      </Link>
      <h1 className="mb-6 font-display text-3xl text-foreground md:text-5xl">Conditions d&apos;utilisation</h1>
      <div role="note" className="mb-10 flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
        <FileWarning className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <p><strong>Révision juridique requise avant publication finale.</strong> Les
          coordonnées légales de l&apos;opérateur, le régime de responsabilité,
          le droit applicable et les modalités commerciales nécessitent une
          validation par l&apos;entreprise et son conseil.
        </p>
      </div>
      <div className="space-y-8 text-sm leading-relaxed text-text-muted md:text-base">
        <section>
          <h2 className="mb-3 text-xl text-foreground">1. Périmètre du logiciel</h2>
          <p>CarHub OS est un logiciel de gestion de flotte, de réservations,
            de documents et d&apos;inspections destiné aux agences de location,
            à leurs équipes et aux conducteurs concernés. Les contrats de
            location, dommages et cautions sont des engagements distincts,
            à vérifier entre l&apos;agence et le conducteur.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">2. Comptes et droits d&apos;accès</h2>
          <p>Les comptes doivent être utilisés par les personnes habilitées.
            Chaque agence gère ses utilisateurs autorisés selon leurs rôles.
            Ne communiquez pas de mot de passe ou de document d&apos;identité
            à une personne non autorisée.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">3. Inspections et désaccords</h2>
          <p>Les photos et vidéos enregistrées constituent des éléments
            documentaires. Leur présence ne garantit pas automatiquement la
            responsabilité du conducteur ni la validité d&apos;une facturation.
            Une conclusion de dommage et tout montant réclamé doivent suivre
            les étapes d&apos;examen, de contestation et d&apos;approbation
            applicables au contrat et au droit pertinent.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">4. Prix, dépôts et remboursements</h2>
          <p>Le prix du logiciel peut dépendre d&apos;un abonnement; la location
            du véhicule, la caution, l&apos;assurance et les frais éventuels
            appartiennent aux conditions communiquées par chaque agence.
            Les prix et taxes doivent être confirmés avant tout paiement.
            Voir nos <Link href="/refunds" className="text-primary underline">informations sur les remboursements</Link>.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">5. Disponibilité et sécurité</h2>
          <p>Nous travaillons à maintenir le service et la sécurité des données,
            sans promettre ici un taux de disponibilité, une certification
            d&apos;horodatage, une méthode de signature légalement qualifiée ou
            un délai d&apos;assistance qui n&apos;ont pas été vérifiés.
            Les conditions de service garanties, s&apos;il y en a, doivent
            figurer dans un contrat commercial validé.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">6. Contact et données personnelles</h2>
          <p>Consultez la <Link href="/privacy" className="text-primary underline">notice de confidentialité</Link>,
            la <Link href="/cookies" className="text-primary underline">notice cookies</Link> et la{" "}
            <Link href="/support" className="text-primary underline">page de support</Link>.
            Les mentions légales complètes et les coordonnées de l&apos;entité
            contractante restent à valider avant la mise en exploitation commerciale.
          </p>
        </section>
      </div>
    </div>
  );
}
