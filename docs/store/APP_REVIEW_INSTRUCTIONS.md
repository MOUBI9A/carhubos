# App Review & Test Account Instructions (Apple & Google)

This document contains dedicated reviewer instructions, test credentials, and demo workflows for **Apple App Review** and **Google Play Review** teams reviewing the **Fider** mobile application (`codes.carhub.fider`).

---

## 1. Overview of the Application

**Fider** is a B2B multi-tenant Enterprise Resource Planning (ERP) and field operation companion mobile app engineered for car-rental agencies operating in Morocco.

The mobile app enables:
- **Agency Owners & Managers:** Fleet management, command centre operational metrics, vehicle document expirations, and reservation tracking.
- **Front-Desk & Garage Agents:** Instant handovers (Check-out/Check-in), contradictory vehicle inspections (odometer, 8-level fuel gauge, damage recording, photographic evidence, and on-screen client digital signature), and QR-code customer verification.
- **Renters / Drivers:** Access to certified rental agreements, sovereign encrypted document vault (driver's license, ID), active consent management compliant with privacy laws, and dynamic Driver Pass QR code.

---

## 2. Test Account Credentials for App Reviewers

We have provisioned three pre-configured test accounts covering all key roles. All accounts use password: `admin123`.

### Account 1: Agency Owner Experience (Fleet & Command Centre)
- **Email:** `owner@carhub.os`
- **Password:** `admin123`
- **Role:** `OWNER`
- **Recommended Workflow:**
  1. Sign in with the credentials above.
  2. The app directs you to the **Owner Command Centre** (`Tableau de Bord`).
  3. Explore **Fleet Management** (`Flotte`) to view vehicle statuses (Available, Rented, Maintenance).
  4. Explore **Bookings** (`Réservations`) to inspect upcoming and active customer contracts.
  5. Explore **Settings** (`Paramètres`) to review agency info, multi-lingual language switcher (French, Arabic RTL, English), legal links, and compliant account deletion.

### Account 2: Front-Desk & Garage Agent Experience (Vehicle Inspection Wizard)
- **Email:** `agent@carhub.os`
- **Password:** `admin123`
- **Role:** `AGENT`
- **Recommended Workflow:**
  1. Sign in with the credentials above.
  2. The app opens to **Today's Operations** (`Aujourd'hui`), showing scheduled departures and arrivals.
  3. Tap **"Démarrer l'État des Lieux Sortant"** on any booking card to launch the **3-Step Inspection Wizard**:
     - **Step 1 (Odometer & Fuel):** Enter mileage and tap the 8-segment fuel gauge picker (0 to 8 eighths).
     - **Step 2 (Photos & Damages):** Capture or select test vehicle photos, tap "Ajouter" to record test damage notes.
     - **Step 3 (Signature & Legal Certification):** Sign on the on-screen contradictory canvas pad, then tap **"Certifier & Clôturer"**.
  4. Explore the **Inspections Tab** (`Inspections`) to observe offline draft storage and sync capabilities.
  5. Explore the **QR Scanner Tab** (`Scanner QR`) to test camera permissions or use the **"Saisir Manuellement"** button to simulate scanning a driver verification code (e.g., enter `FIDER-784920`).

### Account 3: End Renter Experience (Driver Pass & Sovereign Consent Vault)
- **Email:** `renter@carhub.os`
- **Password:** `admin123`
- **Role:** `RENTER`
- **Recommended Workflow:**
  1. Sign in with the credentials above.
  2. View **Active Rental** with dates, deposit information, and access to certified contracts.
  3. Switch to the **Vault Tab** (`Coffre-fort & Consentement`) to view the **Dynamic Driver Pass QR Code** and uploaded identity proofs.
  4. Test **Consent Revocation** by tapping "Révoquer l'accès immédiatement" on an active agency grant.

---

## 3. Business Model & In-App Purchase Compliance

- **Compliance with Apple Guideline 3.1.3(a) & 3.1.3(c) (Enterprise Multiplatform SaaS):**  
  Fider is a companion app to the existing enterprise cloud platform (`https://www.carhub.codes`). Paying car-rental agencies subscribe to their business tier via their corporate billing relationship outside the app. The mobile app strictly provides companion operational mobility for agency employees.
- **Zero In-App Web Checkouts:**  
  The app contains no purchase buttons, external links to web payment gateways, or webviews diverting users to bypass store billing. Account settings neutrally display current SaaS plan status without upgrade paywalls.

---

## 4. Hardware & Permission Disclosures

The application requests the following device permissions only when actively needed:
1. **Camera (`NSCameraUsageDescription` / `android.permission.CAMERA`):**  
   Required for capturing vehicle condition photos during pre/post-rental inspections, and for scanning customer QR passes. A manual entry fallback is always provided.
2. **Photo Library (`NSPhotoLibraryUsageDescription` / `READ_MEDIA_IMAGES`):**  
   Required when uploading identity document proofs to the sovereign vault.
3. **Notifications (`expo-notifications`):**  
   Used for sending important operational reminders (overdue returns, maintenance alerts).

---

## 5. Account Deletion Disclosure

Conformant with Apple Guideline 5.1.1(v) and Google Play Data Safety rules:
- Users can delete their account directly within the app by going to:  
  `Paramètres` ➔ `Gestion du compte` ➔ `Supprimer mon compte`.
- A public web deletion page is also available at:  
  `https://www.carhub.codes/account-deletion`.

---

## 6. Reviewer Support Contact

If you have any questions or require additional test configurations during the review process, please reach out directly:
- **Lead Developer Email:** `support@carhub.codes`
- **Technical Hotline:** `+212 5 22 00 00 00`
- **Production Anchor Domain:** `https://www.carhub.codes`
