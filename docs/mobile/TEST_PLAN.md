# Comprehensive Mobile Quality Assurance & Test Plan — Fider

Ce document formalise la stratégie de test, la matrice de validation manuelle et automatisée, ainsi que les critères d'acceptation requis pour garantir une expérience mobile de qualité native sans régression pour les agences de location marocaines.

---

## 1. Architecture des Niveaux de Test

Le cycle d'assurance qualité s'articule autour de quatre niveaux complémentaires :

```
[Niveau 1: Analyse Statique & Linting] ➔ tsc --noEmit (Mobile, Backend, Frontend)
       ↓
[Niveau 2: Tests Unitaires & Composants] ➔ Jest (Stockage matériel, i18n, Invariants, Jauge)
       ↓
[Niveau 3: Tests d'Intégration Backend] ➔ Jest NestJS (53 suites, 432 tests, Auth, Suppr, Push)
       ↓
[Niveau 4: Matrice de Recette Opérationnelle] ➔ Scénarios fonctionnels terrain (iOS & Android)
```

---

## 2. Synthèse de la Couverture Automatisée

| Périmètre | Commande d'Exécution | Résultats Observés | Statut |
| :--- | :--- | :--- | :--- |
| **Mobile Typecheck** | `cd mobile && npm run typecheck` | 0 erreur TypeScript sur l'ensemble de `/mobile` | ✅ **SUCCÈS (100%)** |
| **Mobile Tests Unitaires** | `cd mobile && npm test` | 4 suites, 13 tests passés | ✅ **SUCCÈS (100%)** |
| **Backend Typecheck** | `cd backend && npx tsc --noEmit` | 0 erreur TypeScript | ✅ **SUCCÈS (100%)** |
| **Backend Tests Unitaires** | `cd backend && npx jest` | 53 suites, 432 tests passés | ✅ **SUCCÈS (100%)** |
| **Frontend Web Typecheck** | `cd frontend && npx tsc --noEmit` | 0 erreur TypeScript | ✅ **SUCCÈS (100%)** |
| **Frontend Web Tests** | `cd frontend && npx vitest run` | 13 tests passés | ✅ **SUCCÈS (100%)** |

---

## 3. Matrice de Recette Opérationnelle (Scénarios Terrain)

### Scénario 1 : Authentification & Aiguillage Rôle-Spécifique
- **Objectif :** Vérifier que chaque profil utilisateur accède strictement à l'interface adaptée à ses responsabilités.
- **Étapes de validation :**
  1. Connexion avec `owner@carhub.os` ➔ Redirection automatique vers l'onglet `/app/(owner)/index.tsx` (Tableau de bord, Flotte, Réservations, Paramètres).
  2. Déconnexion ➔ Redirection immédiate vers l'écran `/app/(auth)/login.tsx` et purge du Keychain matériel.
  3. Connexion avec `agent@carhub.os` ➔ Redirection automatique vers l'onglet `/app/(agent)/index.tsx` (Passations du jour, Inspections, Scanner QR, Paramètres).
  4. Connexion avec `renter@carhub.os` ➔ Redirection automatique vers l'onglet `/app/(renter)/index.tsx` (Mes Locations, Coffre-fort & Consentement, Paramètres).
  5. Tentative de connexion avec un rôle `ROOT_ADMIN` ➔ Message clair invitant à utiliser la console d'administration web sécurisée (`https://www.carhub.codes/admin`).

---

### Scénario 2 : Parcours État des Lieux Contradictoire Complet (Inspection Wizard)
- **Objectif :** Simuler la remise d'un véhicule à un conducteur sur le parking d'une agence.
- **Étapes de validation :**
  1. En session Agent, appuyer sur **"Démarrer l'État des Lieux Sortant"** sur une réservation.
  2. **Étape 1 (Compteur & Carburant) :**
     - Saisir le kilométrage (ex: 45 250 km).
     - Sélectionner le niveau de carburant sur le sélecteur à 8 segments (ex: 6/8).
     - Appuyer sur "Suivant".
  3. **Étape 2 (Photos & Dommages) :**
     - Prendre une photo pour chaque face du véhicule (Face avant, Côté droit, Arrière, Côté gauche, Tableau de bord).
     - Appuyer sur "Ajouter un dommage" : sélectionner "Aile avant droite", gravité "Léger", note "Rayure superficielle 3 cm".
     - Appuyer sur "Suivant".
  4. **Étape 3 (Signature & Certification) :**
     - Vérifier l'affichage du récapitulatif (Compteur, Jauge, Photos, Dommages).
     - Lire la clause contradictoire conforme au D.O.C. marocain.
     - Faire signer le conducteur sur le pad tactile `DigitalSignaturePad`.
     - Appuyer sur **"Certifier & Clôturer"**.
  5. Vérifier la synchronisation réussie et l'apparition de l'inspection certifiée dans l'historique de l'onglet Inspections.

---

### Scénario 3 : Résilience Réseau & Mode Hors-Ligne (Offline Drafts)
- **Objectif :** Garantir qu'aucune donnée de constat contradictoire n'est perdue dans un sous-sol ou parking sans réseau.
- **Étapes de validation :**
  1. Activer le mode Avion sur le smartphone.
  2. Lancer un état des lieux contradictoire et remplir les étapes 1 et 2.
  3. Appuyer sur **"Sauvegarder en brouillon local"** ou valider avec émargement.
  4. Constater que l'application ne bloque pas et affiche la bannière :  
     *"Brouillon sauvegardé localement sur votre appareil."*
  5. Ouvrir l'onglet **Inspections** : vérifier que le badge d'alerte *"1 état des lieux en attente de synchronisation"* est affiché.
  6. Désactiver le mode Avion (rétablissement du réseau).
  7. Appuyer sur **"Tout synchroniser"** : vérifier que le brouillon est envoyé avec succès à l'API et retiré de la file d'attente locale.

---

### Scénario 4 : Scanner QR Conducteur & Révocation de Consentement
- **Objectif :** Valider le modèle de confiance et respect de la vie privée (Loi 09-08 / CNDP).
- **Étapes de validation :**
  1. En session Conducteur (`renter@carhub.os`), ouvrir l'onglet **Coffre-fort & Consentement**.
  2. Vérifier l'affichage du **Pass Conducteur Certifié avec QR Code**.
  3. En session Agent (`agent@carhub.os`), ouvrir l'onglet **Scanner QR**.
  4. Pointer la caméra vers le QR code (ou utiliser "Saisie manuelle" avec le code test `FIDER-784920`).
  5. Vérifier l'apparition de la fiche conducteur vérifiée avec statut "Consentement Actif".
  6. Revenir en session Conducteur et appuyer sur **"Révoquer l'accès immédiatement"** sur l'agence.
  7. Vérifier que l'agence ne peut plus consulter les documents d'identité du conducteur.

---

### Scénario 5 : Suppression de Compte Conforme aux Directives Apple & Google
- **Objectif :** Vérifier le droit à l'oubli et la suppression de compte in-app requise par les stores.
- **Étapes de validation :**
  1. Ouvrir `Paramètres > Gestion du compte > Supprimer mon compte`.
  2. Vérifier l'explication transparente des données anonymisées et des archives légales comptables conservées.
  3. Taper le mot de passe et la confirmation "SUPPRIMER".
  4. Si l'utilisateur possède un véhicule actuellement en circulation ➔ Notification explicite empêchant la suppression tant que la restitution n'est pas clôturée.
  5. Si aucune location n'est en cours ➔ Exécution de `DELETE /api/auth/me`, anonymisation en base de données, déconnexion immédiate et confirmation affichée.
  6. Vérifier également la présence de la page web correspondante sur `https://www.carhub.codes/account-deletion`.

---

### Scénario 6 : Localisation Arabe RTL & Affichage Multi-Langues
- **Objectif :** Assurer la parfaite lisibilité de l'interface en Arabe marocain, Français et Anglais.
- **Étapes de validation :**
  1. Dans les Paramètres, basculer la langue sur **العربية**.
  2. Vérifier que la typographie s'affiche correctement et que la disposition bascule naturellement en mode RTL (alignement de droite à gauche).
  3. Vérifier les étiquettes de monnaie (`درهم`), les compteurs et les jauges de carburant.
  4. Basculer à nouveau vers le **Français** et vérifier la réactivité instantanée.
