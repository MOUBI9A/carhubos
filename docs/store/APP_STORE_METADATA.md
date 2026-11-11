# App Store Metadata Specification — Fider (iOS)

Ce document contient l'intégralité des métadonnées, descriptions localisées et paramètres requis pour la soumission de l'application sur **Apple App Store Connect**.

---

## 1. Informations Générales de l'Application

| Paramètre | Valeur Recommandée | Limites Apple |
| :--- | :--- | :--- |
| **Nom de l'application** | `Fider - Gestion & États des Lieux` | Max 30 caractères |
| **Sous-titre (FR)** | `ERP & flotte auto pour agences` | Max 30 caractères |
| **Sous-titre (EN)** | `Car rental ERP & inspection` | Max 30 caractères |
| **Sous-titre (AR)** | `إدارة تأجير السيارات ومعاينة` | Max 30 caractères |
| **Identifiant de bundle** | `codes.carhub.fider` | Format DNS inversé |
| **SKU** | `FIDER-MOB-01` | Unique |
| **Catégorie Principale** | `Business` (Affaires / Productivité) | Requis |
| **Catégorie Secondaire** | `Travel` (Voyages & Navigation) | Optionnel |
| **Classement par âge** | `4+` (Aucun contenu restreint) | Questionnaire Apple |

---

## 2. URLs Légales et d'Assistance

| Type d'URL | URL Validée en Production |
| :--- | :--- |
| **URL d'Assistance (Support)** | `https://www.carhub.codes/support` |
| **URL Marketing** | `https://www.carhub.codes` |
| **URL Politique de Confidentialité** | `https://www.carhub.codes/privacy` |
| **URL Suppression de Compte** | `https://www.carhub.codes/account-deletion` |

---

## 3. Mots-clés (Keywords)

> **Règle Apple :** 100 caractères maximum, séparés par des virgules sans espaces inutiles.

### Français (FR) — 98 caractères
```
location voiture,etat des lieux,maroc,location auto,contrat location,gestion flotte,flotte,erp,fider
```

### Anglais (EN) — 95 caractères
```
car rental,fleet management,vehicle inspection,rental erp,morocco mobility,fider,digital contract
```

### Arabe (AR) — 87 caractères
```
تأجير سيارات,إدارة الأسطول,معاينة السيارة,عقد كراء,المغرب,فيدر,كراء السيارات
```

---

## 4. Descriptions Complètes par Langue

### Version Française (Langue Principale)

```text
Fider est la plateforme professionnelle tout-en-un conçue pour les agences de location de voitures et les professionnels de la mobilité au Maroc.

Développée pour répondre aux réalités du terrain et aux exigences réglementaires marocaines, l'application mobile Fider accompagne propriétaires d'agences, gestionnaires de flotte et agents de comptoir à chaque étape de l'exploitation.

FONCTIONNALITÉS CLÉS :

1. ÉTATS DES LIEUX CONTRADICTOIRES CERTIFIÉS
• Réalisez les constats de départ (Check-out) et de restitution (Check-in) en moins de 3 minutes directement sur votre smartphone.
• Relevé précis du compteur kilométrique et sélecteur de jauge de carburant au huitième (0/8 à 8/8).
• Prise de photos contradictoires horodatées pour chaque face du véhicule et le tableau de bord.
• Signalement précis des dommages et rayures par zone et degré de gravité.
• Émargement électronique direct sur écran avec valeur légale conforme aux articles 676 et suivants du D.O.C. marocain.
• Fonctionnement hors-ligne : travaillez dans les garages et aéroports sans connexion, synchronisation automatique dès retour du réseau.

2. COCKPIT OPÉRATIONNEL & GESTION DE FLOTTE
• Vue instantanée des départs et retours programmés de la journée.
• Suivi en temps réel du statut des véhicules (Libre, En location, En atelier, Retard de restitution).
• Indicateurs clés de rentabilité et taux d'utilisation de la flotte.
• Alertes automatiques d'échéances d'assurance, visite technique et vidange.

3. COFFRE-FORT CONDUCTEUR & VÉRIFICATION QR
• Scanner de vérification instantanée pour les clients et conducteurs Fider.
• Contrôle d'authenticité des pièces d'identité et du permis de conduire.
• Gestion du consentement souverain conforme à la loi 09-08 (CNDP).
• Réseau de confiance partagé pour prévenir les impayés et litiges.

4. SÉCURITÉ & RESPECT DE LA VIE PRIVÉE
• Chiffrement de bout en bout des documents et données d'identité (HMAC-SHA256).
• Séparation stricte et étanche des données d'agences.
• Suppression de compte et droit à l'oubli directement accessibles dans l'application.

Note : Fider est une application d'entreprise compagnon destinée aux abonnés de la plateforme Fider. La souscription à l'abonnement agence s'effectue sur notre portail web sécurisé.
```

---

## 5. Questionnaire d'Évaluation de l'Âge (Age Rating)

| Critère Apple | Déclaration |
| :--- | :--- |
| Accès Web sans restriction | **Non** |
| Violence réaliste ou animée | **Non** |
| Thèmes réservés aux adultes | **Non** |
| Jeux d'argent ou concours | **Non** |
| Drogues, alcool ou tabac | **Non** |
| Horreur ou peur | **Non** |
| Langage grossier ou humour adulte | **Non** |
| Achats intégrés / Jeux | **Non** |
| **Classement Global Résultant** | **4+** |

---

## 6. Droits d'Auteur & Informations Légales

- **Copyright :** `© 2026 Fider Mobility Technologies SARL. Tous droits réservés.`
- **Entité légale :** Fider Mobility Technologies SARL (Rabat / Casablanca, Maroc).
