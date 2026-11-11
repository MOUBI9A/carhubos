# Known Boundaries & Architecture Limitations — Fider Mobile

Ce document répertorie de manière transparente les choix d'architecture volontaires, les frontières opérationnelles et les prérequis tiers de l'application mobile **Fider**.

---

## 1. Choix d'Architecture Volontaires (Design Invariants)

### A. Administration Fondateur de la Plateforme (ROOT_ADMIN) Web-Uniquement
- **Décision :** La console d'administration globale de la plateforme SaaS (`/admin`) n'est pas intégrée dans l'application mobile.
- **Justification de Sécurité :** L'application mobile est distribuée publiquement sur l'App Store et Google Play. Exposer des mécanismes de provisionnement global de base de données, d'impersonation de locataires ou de modification de plans d'abonnements sur un client mobile décompilable présenterait une surface d'attaque injustifiée.
- **Comportement :** Lorsqu'un compte `ROOT_ADMIN` tente de se connecter sur l'application mobile, il est poliment redirigé vers l'interface web sécurisée de production :  
  `https://www.carhub.codes/admin`.

### B. Gestion des Abonnements SaaS d'Agence Réservée au Web
- **Décision :** Aucun flux de paiement ou de changement de formule d'abonnement SaaS n'est proposé à l'intérieur de l'application mobile.
- **Justification Économique & Réglementaire :**  
  Conformément aux directives **Apple 3.1.3(a) & 3.1.3(c)** et aux règles **Google Play Enterprise SaaS**, les applications mobiles compagnons pour entreprises sont autorisées à donner accès aux services souscrits par une organisation en dehors de l'application sans être soumises à la commission de 30% des achats intégrés (In-App Purchases).
- **Comportement :** L'écran Paramètres affiche de manière neutre le statut de l'abonnement en cours (`Formule Entreprise · Active`) et renvoie vers la gestion d'entreprise sur le web.

---

## 2. Dépendances Matérielles et Simulateurs

| Composant | Comportement sur Appareil Réel (iOS / Android) | Comportement sur Simulateur / Émulateur |
| :--- | :--- | :--- |
| **Appareil Photo** | Déclenche la caméra matérielle native pour photos d'inspection | Déclenche le simulateur de caméra ou l'import d'images de test |
| **Scanner QR Code** | Analyse vidéo en temps réel via `expo-camera` | Bouton de repli **"Saisie Manuelle"** avec saisie de code texte |
| **Stockage Sécurisé** | Keychain iOS matériel / Keystore Android matériel | Émulation de stockage sécurisé dans le bac à sable de test |
| **Signature Électronique** | Tracé fluide au doigt ou stylet sur écran tactile capacitif | Tracé à la souris via `PanResponder` |

---

## 3. Bloqueurs Externes Réservés au Titulaire du Projet

Ces points ne relèvent pas du code source (qui est 100% prêt et testé), mais de la titularité légale des comptes éditeurs :

1. **Compte Apple Developer Program ($99/an) :**  
   Nécessite la souscription par le gérant de la société avec numéro D-U-N-S pour lier l'équipe de développement et générer les certificats de signature de production.
2. **Compte Google Play Developer ($25) :**  
   Nécessite la vérification d'identité de l'éditeur sur la Google Play Console pour créer la fiche et téléverser le premier bundle `.aab`.
3. **Validation Juridique Finale des CGU / Politique de Confidentialité :**  
   Les textes modèles conformes à la loi 09-08 et aux standards des stores sont intégrés aux routes `/privacy` et `/terms`, mais nécessitent la validation formelle de l'avocat ou conseil juridique de l'entreprise.
