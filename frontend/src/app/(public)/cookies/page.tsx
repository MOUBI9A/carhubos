import Link from "next/link";
import { ArrowLeft, Cookie } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link href="/landing" className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l&apos;accueil
      </Link>
      <h1 className="mb-5 flex items-center gap-3 text-3xl font-semibold text-foreground">
        <Cookie className="h-7 w-7 text-primary" aria-hidden="true" /> Cookies et stockage local
      </h1>
      <p className="mb-8 text-text-muted">
        Cette notice résume les mécanismes identifiés dans le code audité.
        Les services de production et toute nouvelle intégration doivent être revus avant publication définitive.
      </p>
      <div className="space-y-8 text-sm leading-relaxed text-text-muted">
        <section>
          <h2 className="mb-2 text-xl text-foreground">Cookies fonctionnels</h2>
          <p><strong>infinity_token</strong> est le cookie de session HTTP-only utilisé pour reconnaître un compte connecté.</p>
          <p className="mt-3"><strong>NEXT_LOCALE</strong> mémorise la langue choisie. Certaines fonctions sauvegardent aussi des préférences fonctionnelles dans le navigateur.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl text-foreground">Publicité et mesures d&apos;audience</h2>
          <p>Aucun script frontend de suivi publicitaire ou statistique optionnel n&apos;a été trouvé dans cette revue du code. Si de tels outils sont ajoutés, leurs finalités, durées et consentements requis devront être vérifiés avant leur activation.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl text-foreground">Vos choix</h2>
          <p>Vous pouvez supprimer les cookies via votre navigateur. Supprimer celui de session peut vous déconnecter. Nous n&apos;affichons pas de faux bandeau de consentement tant qu&apos;aucun traqueur optionnel n&apos;est chargé.</p>
        </section>
        <p role="note" className="rounded-xl border border-hairline bg-surface p-5">
          Un inventaire de toutes les intégrations déployées reste nécessaire.
          Voir la <Link href="/privacy" className="text-primary underline">notice de confidentialité</Link>
          {" "}ou contacter privacy@carhub.codes.
        </p>
      </div>
    </div>
  );
}
