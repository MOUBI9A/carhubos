# Permissions Justification Matrix — Apple App Store & Google Play

Ce document fournit la justification détaillée de chaque permission matérielle demandée par l'application **Fider** (`codes.carhub.fider`), conformément aux directives d'évaluation d'Apple (App Store Review Guidelines 5.1.1) et de Google Play (Google Play Developer Program Policies).

---

## 1. Synthèse des Permissions

| Permission Plateforme | Clé iOS (`Info.plist`) | Permission Android (`AndroidManifest.xml`) | Niveau de Risque |
| :--- | :--- | :--- | :--- |
| **Appareil Photo** | `NSCameraUsageDescription` | `android.permission.CAMERA` | Modéré |
| **Galerie Photo** | `NSPhotoLibraryUsageDescription` | `READ_MEDIA_IMAGES` (API 33+) | Faible |
| **Notifications Push** | N/A (Demande native système) | `android.permission.POST_NOTIFICATIONS` | Faible |

---

## 2. Justification Détaillée par Permission

### A. Appareil Photo (Camera)

#### Clé iOS
```xml
<key>NSCameraUsageDescription</key>
<string>Fider utilise l'appareil photo pour photographier l'état de la carrosserie lors de l'état des lieux contradictoire et pour scanner les QR codes de vérification conducteur.</string>
```

#### Déclaration Google Play Console
- **Cas d'usage principal :**  
  L'application nécessite l'accès à l'appareil photo pour deux fonctionnalités opérationnelles indispensables au métier de loueur de véhicules :
  1. **Photographies contradictoires d'inspection :** Permet à l'agent de photographier les quatre faces du véhicule, le tableau de bord, ainsi que les rayures et chocs constatés avant le départ ou au retour du locataire. Ces photos sont horodatées et annexées à l'état des lieux numérique à valeur légale.
  2. **Lecteur de QR Code :** Permet à l'agent de scanner le Pass Conducteur affiché sur le téléphone du client pour charger instantanément son dossier de location sans saisie manuelle.
- **Principe du moindre privilège :**  
  La caméra n'est sollicitée qu'au moment précis où l'utilisateur appuie sur "Prendre une photo" ou "Scanner QR". Un bouton de repli "Saisie manuelle" est systématiquement proposé en cas de refus d'autorisation.

---

### B. Galerie Photo (Photo Library)

#### Clé iOS
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Fider accède à votre photothèque pour vous permettre de téléverser vos justificatifs d'identité et de permis de conduire dans votre coffre-fort numérique.</string>
```

#### Déclaration Google Play Console
- **Cas d'usage principal :**  
  Permet aux locataires et agents d'importer une photo de document d'identité préalablement enregistrée sur leur téléphone (permis de conduire, CIN, justificatif de domicile) vers le coffre-fort numérique sécurisé.
- **Principe du moindre privilège :**  
  L'application utilise le sélecteur natif du système (`expo-image-picker`) qui n'accorde l'accès qu'aux seules images expressément sélectionnées par l'utilisateur.

---

### C. Notifications Push (Notifications)

#### Déclaration Google Play Console & Apple
- **Cas d'usage principal :**  
  Alertes opérationnelles en temps réel réservées aux événements critiques :
  1. Notification d'un retard de restitution de véhicule par un conducteur.
  2. Alerte d'échéance imminente d'une visite technique ou d'une police d'assurance flotte.
  3. Notification au conducteur lors de la mise à disposition de son contrat ou de la validation de son état des lieux.
- **Exclusion du marketing intrusif :**  
  Aucune notification promotionnelle, publicitaire ou commerciale n'est émise par l'application.

---

## 3. Permissions Strictement Exclues (Zero-Exposure)

Pour garantir une conformité maximale et accélérer la validation par les équipes de revue d'Apple et Google, les permissions sensibles suivantes sont **totalement absentes** du code :
- ❌ **Aucun accès à la géolocalisation d'arrière-plan** (`ACCESS_BACKGROUND_LOCATION`)
- ❌ **Aucun accès aux contacts** (`READ_CONTACTS`)
- ❌ **Aucun accès au micro / enregistrement audio** (`RECORD_AUDIO`)
- ❌ **Aucun identifiant de tracking publicitaire** (`com.google.android.gms.permission.AD_ID` / `AppTrackingTransparency`)
- ❌ **Aucun accès SMS ou journal d'appels**
