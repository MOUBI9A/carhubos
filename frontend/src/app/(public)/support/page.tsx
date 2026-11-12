import Link from "next/link";
import { ArrowLeft, Mail, HelpCircle } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link href="/landing" className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l&apos;accueil
      </Link>
      <h1 className="mb-5 flex items-center gap-3 text-3xl font-semibold text-foreground">
        <HelpCircle className="h-7 w-7 text-primary" aria-hidden="true" />
        Assistance CarHub OS
      </h1>
      <p className="mb-9 text-text-muted">
        Pour une question de connexion, de réservation, d&apos;inspection ou de facture
        du logiciel, vous pouvez contacter l&apos;équipe via les canaux ci-dessous.
        Les horaires et délais contractuels doivent être confirmés par l&apos;opérateur.
      </p>
      <div className="space-y-5">
        <section className="rounded-2xl border border-hairline bg-surface p-7">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" /> Support technique
          </h2>
          <a href="mailto:support@carhub.codes" className="text-primary underline">support@carhub.codes</a>
          <p className="mt-3 text-sm text-text-muted">
            Évitez d&apos;envoyer des mots de passe, des informations bancaires ou
            des documents d&apos;identité dans un premier message.
          </p>
        </section>
        <section className="rounded-2xl border border-hairline bg-surface p-7">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Demandes de confidentialité</h2>
          <a href="mailto:privacy@carhub.codes" className="text-primary underline">privacy@carhub.codes</a>
          <p className="mt-3 text-sm text-text-muted">
            Consultez aussi la <Link href="/privacy" className="text-primary underline">notice de confidentialité</Link>
            {" "}et la <Link href="/account-deletion" className="text-primary underline">fermeture de compte</Link>.
          </p>
        </section>
        <p role="note" className="text-xs text-text-faint">
          Le nom légal de l&apos;opérateur, son adresse, l&apos;éventuel numéro
          commercial et les horaires contractuels nécessitent une validation
          avant publication commerciale.
        </p>
      </div>
    </div>
  );
}
