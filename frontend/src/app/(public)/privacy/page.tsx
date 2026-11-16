import Link from "next/link";
import { ArrowLeft, FileWarning, Shield } from "lucide-react";

/**
 * Operational disclosure aligned to code review. Legal identity, controller
 * assignments, retention schedules and international transfer terms must be
 * verified by counsel and by the responsible business before publication.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <Link href="/landing" className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l&apos;accueil
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" aria-hidden="true" />
        <h1 className="font-display text-3xl text-foreground md:text-5xl">Informations sur la confidentialité</h1>
      </div>
      <div role="note" className="mb-10 flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
        <FileWarning className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <p>
          <strong>Document en cours de validation juridique.</strong> L&apos;identité du
          responsable de traitement, ses coordonnées légales, les durées de
          conservation et les prestataires doivent être confirmés avant toute
          déclaration de conformité. Cette page ne constitue pas une certification CNDP.
        </p>
      </div>
      <div className="space-y-9 text-sm leading-relaxed text-text-muted md:text-base">
        <section>
          <h2 className="mb-3 text-xl text-foreground">1. À quoi sert CarHub OS ?</h2>
          <p>
            CarHub OS met à disposition des agences de location, de leurs équipes et
            des conducteurs un outil de gestion de véhicules, de réservations,
            d&apos;inspection et de suivi. Selon l&apos;opération, l&apos;agence et
            l&apos;opérateur du logiciel peuvent avoir des responsabilités distinctes
            dans le traitement des données. Ces rôles doivent être formalisés par contrat.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">2. Catégories de données</h2>
          <ul className="list-disc space-y-2 ps-6">
            <li>Compte : nom, e-mail, rôle, identifiants d&apos;authentification et journaux techniques.</li>
            <li>Location : contact client, dates, véhicule, prix, contrat et éventuels paiements.</li>
            <li>Identification : informations de permis et d&apos;identité, avec documents si téléchargés.</li>
            <li>État du véhicule : photos, vidéos lorsqu&apos;activées, dommages signalés, décisions et signatures.</li>
            <li>Assistance et sécurité : demandes au support, autorisations d&apos;accès, événements de sécurité.</li>
          </ul>
          <p className="mt-3">
            Évitez de partager des données sensibles supplémentaires dans les zones de texte libre.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">3. Utilisation et accès</h2>
          <p>
            Ces informations servent à gérer les comptes et locations, documenter les
            états des lieux, assurer la sécurité, répondre aux demandes et produire des
            rapports. L&apos;accès dépend du rôle et des habilitations; les demandes
            de consultation de documents du conducteur utilisent un circuit
            d&apos;autorisation distinct. Les bases juridiques de chaque traitement,
            les sous-traitants et les transferts internationaux restent à documenter.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">4. Cookies et services externes</h2>
          <p>
            Le site utilise notamment un cookie de session nécessaire à la connexion et
            un cookie pour mémoriser la langue choisie. Aucun traqueur publicitaire
            optionnel n&apos;a été identifié dans le code frontend audité; cela ne
            remplace pas un inventaire des services actifs en production.
            Voir la <Link href="/cookies" className="text-primary underline">notice sur les cookies</Link>.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">5. Conservation et sécurité</h2>
          <p>
            Des restrictions d&apos;accès et des mécanismes de stockage privé sont
            prévus, mais aucune technologie particulière ne garantit à elle seule
            l&apos;absence d&apos;incident. Les durées exactes doivent être définies
            par catégorie de données et obligation applicable; elles ne sont pas
            uniformément fixées à dix ans.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl text-foreground">6. Vos droits et vos demandes</h2>
          <p>
            La loi marocaine n° 09-08 prévoit notamment des droits d&apos;information,
            d&apos;accès, de rectification et d&apos;opposition, selon les conditions
            applicables. Vous pouvez consulter notre page de{" "}
            <Link href="/account-deletion" className="text-primary underline">fermeture de compte et demandes relatives aux données</Link>
            {" "}ou écrire à{" "}
            <a href="mailto:privacy@carhub.codes" className="text-primary underline">
              privacy@carhub.codes
            </a>.
            La fermeture désactive l&apos;accès et anonymise certains champs du
            compte; elle ne signifie pas que tous les documents et archives
            sont immédiatement effacés.
          </p>
          <p className="mt-3">
            Le responsable de traitement, l&apos;adresse légale et l&apos;interlocuteur
            chargé des demandes devront être publiés après vérification de
            l&apos;identité et des coordonnées de l&apos;entité exploitante.
          </p>
        </section>
      </div>
    </div>
  );
}
