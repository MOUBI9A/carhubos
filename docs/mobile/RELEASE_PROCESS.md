# Mobile Release & Distribution Process — Fider

Ce document fournit le protocole opérationnel complet pour compiler, signer et publier les versions de production de **Fider** sur **Apple App Store (TestFlight & Production)** et **Google Play Store (Pistes Interne, Test Ouvert & Production)**.

---

## 1. Prérequis & Comptes Développeurs

Pour générer des binaires signés distribuables sur les stores officiels, les accès et comptes suivants sont requis (actions réservées au titulaire légal) :

1. **Compte Apple Developer Program :**
   - Inscription Entreprise ou Organisation sur [developer.apple.com](https://developer.apple.com) ($99/an).
   - Rôle administrateur ou App Manager sur App Store Connect.
   - Accès à la gestion des certificats de distribution (`Apple Distribution`) et profils de provisionnement (`App Store Provisioning Profile`).
2. **Compte Développeur Google Play Console :**
   - Compte développeur enregistré sur [play.google.com/console](https://play.google.com/console) ($25 paiement unique).
   - Clé de signature d'application gérée par Google Play (Google Play App Signing) ou Keystore de téléversement (`upload-keystore.jks`).
3. **Compte Expo / EAS (Optionnel mais recommandé pour CI cloud) :**
   - Compte gratuit ou équipe sur [expo.dev](https://expo.dev).
   - Outil CLI installé : `npm install -g eas-cli`.

---

## 2. Configuration des Profils de Compilation (`eas.json`)

Le fichier `mobile/eas.json` configure trois profils de build pré-testés :

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://www.carhub.codes/api"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 3. Workflow A : Compilation Cloud via Expo Application Services (EAS)

Ce workflow est la méthode la plus rapide et la plus fiable. Il gère la gestion sécurisée des certificats sans nécessiter de machine macOS pour Android.

### Étape 1 : Connexion au compte EAS
```bash
cd mobile
eas login
```

### Étape 2 : Initialisation du projet EAS (première fois)
```bash
eas project:init
```

### Étape 3 : Compilation Android (Google Play Android App Bundle `.aab`)
```bash
# Génère un fichier .aab prêt pour la Google Play Console
eas build --platform android --profile production
```
*EAS génère ou importe automatiquement la clé de téléversement (Upload Keystore) et fournit un lien de téléchargement direct du fichier `.aab` signé.*

### Étape 4 : Compilation iOS (Apple App Store / TestFlight)
```bash
# Génère une archive .ipa signée pour l'App Store
eas build --platform ios --profile production
```
*EAS se connecte automatiquement à votre compte Apple Developer via clé API App Store Connect pour générer le certificat de distribution et le profil de provisionnement.*

### Étape 5 : Téléversement Automatisé sur les Stores
```bash
# Envoi automatique du build sur TestFlight
eas submit --platform ios --profile production

# Envoi automatique du build sur la piste de test interne Google Play
eas submit --platform android --profile production
```

---

## 4. Workflow B : Compilation Locale (Sans Cloud EAS)

Si vous préférez compiler les binaires en local sur votre poste de travail (macOS avec Xcode et Android Studio) :

### Étape 1 : Éjection Native (Prebuild)
```bash
cd mobile
npx expo prebuild --clean
```
Cette commande génère les dossiers natifs `/mobile/ios` (Projet Xcode Workspace) et `/mobile/android` (Projet Gradle).

### Étape 2 : Compilation Locale Android (`.aab`)
```bash
cd mobile/android
./gradlew bundleRelease
```
Le binaire de production est généré à l'emplacement :  
`mobile/android/app/build/outputs/bundle/release/app-release.aab`

### Étape 3 : Compilation Locale iOS (`.ipa`)
1. Ouvrez `mobile/ios/fider.xcworkspace` dans Xcode.
2. Dans l'onglet **Signing & Capabilities**, sélectionnez votre équipe de développement Apple (`Team`).
3. Choisissez la cible **Any iOS Device (arm64)**.
4. Menu **Product > Archive**.
5. Dans l'Organiseur Xcode, cliquez sur **Distribute App > App Store Connect > Upload**.

---

## 5. Déploiement TestFlight (Beta Testing Interne)

Avant l'ouverture au public, effectuez les vérifications de terrain suivantes via TestFlight :
1. Ajoutez les agents de l'agence pilote marocaine comme **Bêta-testeurs internes** dans App Store Connect.
2. Invitez les agents à installer TestFlight sur leur iPhone.
3. Testez le flux complet en situation réelle :
   - Connexion agent (`agent@carhub.os` ou compte réel d'agence).
   - Réalisation d'un état des lieux sortant sur un véhicule réel dans un parking souterrain.
   - Relevé kilométrique et jauge de carburant.
   - Prise de 5 photos de carrosserie.
   - Signature du locataire sur l'écran tactile.
   - Validation et synchronisation au serveur.
   - Vérification de l'apparition immédiate de l'état des lieux sur le tableau de bord web (`https://www.carhub.codes/dashboard/bookings`).

---

## 6. Déploiement Google Play (Piste de Test Interne)

1. Connectez-vous à la **Google Play Console**.
2. Sélectionnez l'application **Fider** (`codes.carhub.fider`).
3. Allez dans **Test > Test interne**.
4. Créez une nouvelle version et glissez-déposez le fichier `app-release.aab`.
5. Ajoutez les adresses Gmail des testeurs internes.
6. Partagez le lien d'invitation privé pour installation sur les appareils Android (API 34+ / Android 14+).

---

## 7. Checklist Finale avant Soumission aux Vérificateurs

- [x] Numéro de version `version = 1.0.0` et `versionCode = 1` / `buildNumber = 1`.
- [x] L'URL de production pointe vers `https://www.carhub.codes/api`.
- [x] Aucun jeton d'authentification ou secret serveur n'est présent dans le code bundle.
- [x] La politique de confidentialité est en ligne sur `https://www.carhub.codes/privacy`.
- [x] La page de suppression de compte est en ligne sur `https://www.carhub.codes/account-deletion`.
- [x] Les identifiants de test (`owner@carhub.os`, `agent@carhub.os`, `renter@carhub.os` / `admin123`) sont renseignés dans les notes de révision d'App Store Connect et Google Play Console.
