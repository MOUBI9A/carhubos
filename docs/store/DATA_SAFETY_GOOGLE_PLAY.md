# Google Play Data Safety Specification — Fider

Ce document détaille les réponses officielles à saisir dans le formulaire **Sécurité des données (Data Safety)** de la **Google Play Console** pour l'application **Fider** (`codes.carhub.fider`).

---

## 1. Questions Préliminaires

| Question Google Play | Réponse | Justification |
| :--- | :--- | :--- |
| **L'application collecte-t-elle ou partage-t-elle des types de données utilisateur obligatoires ?** | **Oui** | Nécessaire pour la gestion des locations automobiles et états des lieux contradictoires. |
| **Toutes les données collectées par votre application sont-elles chiffrées en transit ?** | **Oui** | Toutes les connexions sont strictement restreintes au protocole HTTPS (TLS 1.3). |
| **Fournissez-vous aux utilisateurs un moyen de demander la suppression de leurs données ?** | **Oui** | Mécanisme de suppression intégré à l'application mobile et formulaire web public. |
| **Lien vers la demande de suppression de compte :** | `https://www.carhub.codes/account-deletion` | Accessible publiquement sans nécessiter de connexion. |

---

## 2. Déclaration Détaillée par Catégorie de Données

### A. Informations Personnelles (Personal Info)

#### 1. Nom (Name)
- **Collecté ?** Oui.
- **Partagé avec des tiers ?** Non.
- **Traité de façon éphémère ?** Non (stocké dans le profil utilisateur).
- **Obligatoire ou Facultatif ?** Obligatoire pour la création de compte.
- **Finalités :** Fonctionnalité de l'application, gestion des comptes, génération des contrats de location.

#### 2. Adresse e-mail (Email Address)
- **Collecté ?** Oui.
- **Partagé avec des tiers ?** Non.
- **Traité de façon éphémère ?** Non.
- **Obligatoire ou Facultatif ?** Obligatoire.
- **Finalités :** Gestion des comptes, authentification, notifications transactionnelles.

#### 3. Numéro de téléphone (Phone Number)
- **Collecté ?** Oui.
- **Partagé avec des tiers ?** Non.
- **Traité de façon éphémère ?** Non.
- **Obligatoire ou Facultatif ?** Facultatif pour le locataire, utilisé pour le suivi opérationnel.
- **Finalités :** Fonctionnalité de l'application, communications opérationnelles de remise de véhicule.

---

### B. Photos et Vidéos (Photos and Videos)

#### Photos
- **Collecté ?** Oui.
- **Partagé avec des tiers ?** Non.
- **Traité de façon éphémère ?** Non.
- **Obligatoire ou Facultatif ?** Facultatif (fortement recommandé lors de l'inspection de départ et retour).
- **Finalités :** Fonctionnalité de l'application (photos d'états des lieux contradictoires pour documenter l'état de la carrosserie et prévenir les litiges).

---

### C. Fichiers et Documents (Files and Docs)

#### Fichiers et Documents
- **Collecté ?** Oui.
- **Partagé avec des tiers ?** Non (accessible uniquement par l'agence autorisée avec consentement actif).
- **Traité de façon éphémère ?** Non.
- **Obligatoire ou Facultatif ?** Facultatif (coffre-fort documentaire du locataire).
- **Finalités :** Vérification d'identité réglementaire pour la location de véhicules au Maroc.

---

### D. Identifiants de l'Appareil et Autres Identifiants (Device or Other IDs)

#### Identifiants de l'appareil
- **Collecté ?** Oui.
- **Partagé avec des tiers ?** Non.
- **Traité de façon éphémère ?** Non.
- **Obligatoire ou Facultatif ?** Obligatoire pour les notifications push.
- **Finalités :** Envoi des alertes opérationnelles (retards, entretiens de véhicules).

---

## 3. Pratiques de Confidentialité et Traitement

- **Suppression des données :** Les utilisateurs peuvent déclencher la suppression complète de leur compte soit directement depuis l'application via `Paramètres > Supprimer mon compte`, soit via l'URL `https://www.carhub.codes/account-deletion`.
- **Politique de conservation :** Les informations personnelles sont immédiatement anonymisées (`deleted_<id>@anonymized.fider`). Les factures et signatures d'états des lieux archivés sont conservées sous forme anonymisée pour répondre aux obligations comptables et fiscales marocaines (D.O.C.).
