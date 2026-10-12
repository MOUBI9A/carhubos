# Apple App Store Privacy Nutrition Labels — Fider

Conformément aux exigences de transparence d'Apple (App Privacy Labels), ce document récapitule les données collectées par l'application **Fider** (`codes.carhub.fider`), leur finalité, et leur association avec l'identité de l'utilisateur.

---

## 1. Suivi des Utilisateurs (Tracking)

> **L'application Fider utilise-t-elle des données pour suivre l'utilisateur sur d'autres applications et sites web appartenant à d'autres sociétés ?**
> 
> **RÉPONSE : NON.**
> Fider n'intègre aucun SDK publicitaire, aucun réseau d'acquisition tiers, et ne partage aucune donnée à des courtiers en données (Data Brokers). L'autorisation `AppTrackingTransparency` (ATT) n'est donc ni demandée ni requise.

---

## 2. Inventaire des Données Collectées

### A. Coordonnées (Contact Info)
| Type de donnée | Collectée ? | Liée à l'utilisateur ? | Utilisée pour le tracking ? | Finalité |
| :--- | :--- | :--- | :--- | :--- |
| **Nom** | Oui | Oui | Non | Fonctionnalité de l'application (Identification de l'agent, du locataire et émargement des contrats) |
| **Adresse e-mail** | Oui | Oui | Non | Gestion du compte, authentification sécurisée et notifications opérationnelles |
| **Numéro de téléphone** | Oui (optionnel) | Oui | Non | Contact opérationnel pour la remise des clés et confirmation de réservation |

### B. Contenu de l'Utilisateur (User Content)
| Type de donnée | Collectée ? | Liée à l'utilisateur ? | Utilisée pour le tracking ? | Finalité |
| :--- | :--- | :--- | :--- | :--- |
| **Photos ou vidéos** | Oui | Oui | Non | Photographies contradictoires de la carrosserie pour l'état des lieux et justification de dommages |
| **Signatures** | Oui | Oui | Non | Émargement contradictoire sur écran tactile certifiant l'état des lieux de départ et retour |
| **Justificatifs d'identité** | Oui | Oui | Non | Numérisation du permis de conduire et de la CIN pour le coffre-fort avec hachage HMAC-SHA256 |

### C. Identifiants (Identifiers)
| Type de donnée | Collectée ? | Liée à l'utilisateur ? | Utilisée pour le tracking ? | Finalité |
| :--- | :--- | :--- | :--- | :--- |
| **Identifiant utilisateur** | Oui | Oui | Non | Clé primaire d'authentification et isolation multi-tenant de l'agence |
| **Push Token (APNs)** | Oui | Oui | Non | Réception de notifications importantes (Retours en retard, alertes entretiens) |

### D. Données d'Utilisation & Diagnostics (Usage Data)
| Type de donnée | Collectée ? | Liée à l'utilisateur ? | Utilisée pour le tracking ? | Finalité |
| :--- | :--- | :--- | :--- | :--- |
| **Journaux d'Audit (Audit Logs)** | Oui | Oui | Non | Traçabilité légale et sécurité anti-fraude (Horodatage des modifications de réservations et états des lieux) |
| **Données de Crash** | Oui (anonymisées) | Non | Non | Amélioration de la stabilité et débogage |

---

## 3. Pratiques de Sécurité et Chiffrement

- **Chiffrement en transit :** Toutes les communications avec l'API (`https://www.carhub.codes/api`) s'effectuent exclusivement via TLS 1.3 / HTTPS avec `Strict-Transport-Security` (HSTS).
- **Chiffrement au repos sur l'appareil :** Les jetons de session et clés d'accès sont stockés dans le **Keychain iOS** matériel (`expo-secure-store`) avec la politique `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`.
- **Hachage d'identité :** Les pièces d'identité sont sécurisées par un hachage irréversible salé par pepper cryptographique (`HMAC-SHA256`).

---

## 4. Droit à l'Oubli et Suppression de Compte

Conformément à la directive Apple 5.1.1(v) :
1. Une option explicite **"Supprimer mon compte"** est accessible directement dans l'application (`Paramètres` ➔ `Gestion du compte` ➔ `Supprimer mon compte`).
2. Une route web publique d'assistance à la suppression est disponible à l'adresse :  
   `https://www.carhub.codes/account-deletion`
3. L'exécution de la suppression anonymise immédiatement les données personnelles (nom, email, téléphone), révoque les consentements, et purge les documents non archivés légalement.
