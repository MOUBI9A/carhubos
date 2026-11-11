# Fider / CarHub Mobile Engineering Audit

**Document:** `docs/mobile/MOBILE_AUDIT.md`  
**Status:** Canonical Reference & Baseline  
**Date:** October 2026  
**Target Stores:** Apple App Store (iOS) & Google Play Store (Android)  
**Author:** Lead Mobile Architect & Release Manager  

---

## 1. Current Architecture Overview

The CarHub / Fider platform is a multi-tenant SaaS ERP localized specifically for Moroccan car rental agencies (currency **MAD**, **20% VAT**, bilingual French/Arabic environment).

### System Topology
* **Backend:** Modular NestJS application running on Node 22+ with Prisma ORM connecting to PostgreSQL 15 (local Docker / production Supabase).
* **API Ingress:** Base route `/api`, served over HTTPS on `carhub.codes` (production) and `http://localhost:5406/api` (local development).
* **Web Frontend:** Next.js 16 (React 19 + Tailwind CSS) running on `http://localhost:3002` and `https://www.carhub.codes`.
* **Database & Persistence:** PostgreSQL with strict tenant scoping (`agencyId`), Prisma `@db.Decimal(12,2)` for financial ledger tables, and soft-delete tombstones (`deletedAt`).
* **Security & Auth:** JWT tokens containing claims (`sub`, `email`, `role`, `agencyId`, `isVerified`, `onboardingStatus`).
  * On web: Tokens are exchanged via HttpOnly cookie `infinity_token`.
  * In NestJS `AuthGuard`: Supports BOTH `req.cookies['infinity_token']` AND `Authorization: Bearer <token>` in incoming headers.

---

## 2. Existing APIs Reusable by Mobile

The existing NestJS API provides a comprehensive suite of domain endpoints that can be consumed directly by native mobile applications:

| Domain | Route / Method | Mobile Reusability | Capabilities / Notes |
| :--- | :--- | :--- | :--- |
| **Authentication** | `POST /api/auth/login` | **Direct** | Returns `{ access_token, user }`. Mobile saves Bearer token. |
| **User Profile** | `GET /api/auth/me` | **Direct** | Returns fresh profile, verification state, and agency details. |
| **Session End** | `POST /api/auth/logout` | **Direct** | Clears cookies and signals session termination. |
| **Fleet & Cars** | `GET /api/cars` | **Direct** | Lists agency fleet with status (`AVAILABLE`, `RENTED`, `MAINTENANCE`), mileage, plate. |
| **Vehicle Detail** | `GET /api/cars/:id` | **Direct** | Vehicle inspection history, documents, specifications. |
| **Bookings** | `GET /api/bookings` | **Direct** | List bookings with date ranges, customer, car, status (`CONFIRMED`, `ACTIVE`, `COMPLETED`, `CANCELLED`). |
| **Booking Detail** | `GET /api/bookings/:id` | **Direct** | Full rental dossier with financial breakdown, contract ID, payments. |
| **Booking State** | `POST /api/bookings/:id/check-out` | **Direct** | Vehicle handover state transition. |
| **Booking State** | `POST /api/bookings/:id/check-in` | **Direct** | Vehicle return state transition. |
| **Inspections** | `GET /api/inspections` | **Direct** | Inspection records linked to bookings/vehicles. |
| **Create Inspection**| `POST /api/inspections` | **Direct** | Records mileage, fuel level (eighths), damage map, photos array, inspector ID. |
| **Contracts** | `GET /api/contracts/:id` | **Direct** | Agreement status, terms, signature state. |
| **Customers** | `GET /api/customers` | **Direct** | Searchable CRM directory by name, CIN/passport, phone. |
| **Customer Detail**| `GET /api/customers/:id` | **Direct** | Rental history, loyalty stats, verification flags. |
| **Trust Network** | `GET /api/trust/renter/:hash` | **Direct** | Renter reputation, blacklist check without leaking PII. |
| **Renter Portal** | `GET /api/portal/profile` | **Direct** | Renter self-service details and trust score. |
| **Renter Vault** | `GET /api/portal/documents` | **Direct** | Uploaded identity documents (CIN, driver's license). |
| **Consent** | `GET /api/consent/pending` | **Direct** | Pending consent requests for document sharing. |
| **Consent Action** | `POST /api/consent/:id/approve` | **Direct** | Approve or reject agency access to renter documents. |
| **Analytics** | `GET /api/analytics/command-centre`| **Direct** | Real-time utilization, revenue snapshot, overdue returns. |
| **Maintenance** | `GET /api/maintenance` | **Direct** | Preventive maintenance alerts and service records. |
| **Notifications** | `GET /api/notifications` | **Direct** | In-app user notifications and activity logs. |

---

## 3. Missing APIs for Mobile

To meet production App Store and Google Play standards, the following backend gaps are identified and must be bridged:

1. **Compliant Account Deletion (`DELETE /api/auth/me`):**
   * *Requirement:* Apple App Store Guideline 5.1.1(v) and Google Play Account Deletion Policy mandate that any app supporting account registration MUST allow users to delete their account directly from the app and via a public web URL.
   * *Status:* Currently missing. Must be added to `AuthController` with cryptographic password confirmation, personal data scrubbing/anonymization, and audit log generation.
2. **Push Notification Device Token Registration (`POST /api/notifications/push-token`):**
   * *Requirement:* Registering Expo Push Tokens / APNs / FCM tokens against authenticated users and agencies so real-time push alerts can be dispatched.
   * *Status:* Currently missing. Must be added with device metadata (`platform`, `token`, `lastActive`).
3. **Public Web Policy & Deletion Routes:**
   * *Requirement:* External store review links for Privacy Policy, Terms of Service, Support, and Web Account Deletion (`https://www.carhub.codes/privacy`, `/terms`, `/support`, `/account-deletion`).

---

## 4. Authentication Challenges: Web vs. Mobile

### The Web Flow (HttpOnly Cookies)
The Next.js frontend relies on `document.cookie` / HttpOnly `infinity_token`. While secure against browser XSS, native mobile operating systems (iOS and Android) interact via standalone HTTP clients (Fetch / Axios / OkHttp / NSURLSession). Relying on cookie jars across native cold starts, background fetch, and deep links is brittle and prone to session loss.

### The Mobile Architecture Solution
1. **Bearer Authentication:** As verified in `backend/src/auth/auth.guard.ts:134-140`, the backend already supports `Authorization: Bearer <token>` natively!
2. **Hardware-Backed Secure Storage:** The mobile app will store the `access_token` in **iOS Keychain** and **Android Keystore** via `expo-secure-store`. Tokens are NEVER placed in unencrypted `AsyncStorage`.
3. **Session Lifecycle & Auto-Refresh:** The JWT has a 7-day expiration (`maxAge: 604800s`). When the API returns `401 Unauthorized`, the mobile app will gracefully purge secure storage, reset the reactive auth state, and prompt the user to re-authenticate without crashing.
4. **Biometric Unlock (Optional):** Devices supporting Face ID / Touch ID / Biometric Prompt can re-authenticate the user locally before unlocking sensitive actions (e.g., signing a contract or deleting an account).

---

## 5. Mobile-Critical Business Workflows

Mobile usage for a Moroccan rental agency centers on **speed, field reliability, and real-time operations**:

### Workflow A: Vehicle Handover (Check-Out)
1. **Renter Verification:** Agent searches customer by CIN/passport or scans Renter QR Code.
2. **Inspection Capture:** Agent walks around car, records current odometer and fuel level (fractional gauge), notes pre-existing damage.
3. **Camera Evidence:** Agent takes native high-resolution photos of all 4 vehicle sides + interior.
4. **Signature:** Renter signs digitally on screen.
5. **Handover Finalized:** Booking status transitions to `ACTIVE`, generating contractual timestamp.

### Workflow B: Vehicle Return (Check-In)
1. **Return Audit:** Agent inputs end odometer and fuel level. System automatically flags excess mileage or fuel deficit.
2. **Damage Check:** Photos compared with check-out photos.
3. **Security Deposit Reconciliation:** Agent records deposit release or deduction.
4. **Return Finalized:** Vehicle returns to `AVAILABLE` status immediately.

### Workflow C: Owner Command Centre
1. **Fleet Utilization Glance:** Total fleet, cars rented, cars available, vehicles in workshop.
2. **Urgent Operational Alerts:** Overdue vehicle returns, expiring insurance / visite technique, pending maintenance.
3. **Financial Snapshot:** Today's collections in MAD, month-to-date revenue.

---

## 6. Security and Privacy Risks

1. **Renter Identity Documents (CIN / Driving License):**
   * Handling identity documents on a mobile device requires zero local caching of raw unencrypted photos in the public device gallery.
   * All captured documents must be uploaded directly or held in sandboxed app-private temporary cache, cleaned immediately upon upload.
2. **Tenant Isolation Guarantee:**
   * Mobile client MUST never send `agencyId` to gain unauthorized tenant data. Every request derives `agencyId` strictly from the server-verified JWT claims.
3. **Identity HMAC Salt Protection:**
   * The server-side `IDENTITY_PEPPER` must NEVER be embedded or exposed to the mobile app bundle. The mobile app sends normalized document strings or receives opaque hashes computed on the server.
4. **Offline Data Tampering:**
   * Inspection drafts stored locally while in dead zones (underground parking) must be validated server-side upon synchronization (e.g. odometer readings cannot be lower than prior recorded odometer).

---

## 7. Store-Policy Risks & Compliance Strategy

### Apple App Store
* **Guideline 3.1.1 (In-App Purchase vs. Multiplatform SaaS):**
  * *Risk:* Apple rejecting the app for not using Apple In-App Purchases for agency subscriptions.
  * *Resolution:* Under **Guideline 3.1.3(a) "Reader Apps" and Enterprise Multiplatform Services**, B2B SaaS accounts purchased outside the app by an organization may be accessed freely without IAP, provided the app does not link directly to external payment pages inside the app. Agency owners and staff sign into their existing subscription. Plan management remains on web.
* **Guideline 5.1.1(v) (Account Deletion):**
  * The app must provide a direct in-app account deletion flow and an external public deletion URL.
* **Guideline 5.1.2 (Data Minimization & Transparency):**
  * Full Apple Privacy Nutrition labels prepared in `docs/store/APP_STORE_PRIVACY_INVENTORY.md`.

### Google Play Store
* **Target SDK Policy (2026/2027):** Target API 35/36 (Android 15/16).
* **Data Safety Section:** Complete disclosure of data collected (photos, contact info, device IDs) with explicit declarations that data is encrypted in transit and can be deleted upon request.
* **Account Deletion Web Requirement:** Google Play requires a publicly accessible web page explaining how users can request data deletion.

---

## 8. Proposed Mobile Architecture

```
/mobile
├── app/                       # Expo Router File-Based Navigation
│   ├── (auth)/                # Public Auth: Login, Forgot Password, Reset
│   ├── (owner)/               # Agency Owner/Manager: Command Centre, Fleet, Bookings, Finance
│   ├── (agent)/               # Front-Line Agent: Today's Handovers, Inspection, QR Scan
│   ├── (renter)/              # Customer / Renter: Rentals, Vault, Consent Approvals
│   ├── inspection/            # Dedicated Native Vehicle Handover & Return Wizard
│   ├── settings/              # Profile, Language (FR/AR/EN), Account Deletion, Privacy
│   └── _layout.tsx            # Global Root Layout (Providers, Theme, Auth Gate)
├── src/
│   ├── api/                   # Typed Axios API Client with Bearer Interceptor & Offline Retry
│   ├── components/            # Fider Lux Mobile UI Kit (Button, Card, Badge, Modal, Signature, Photo)
│   ├── context/               # AuthContext, NetworkContext, LocaleContext, DraftContext
│   ├── hooks/                 # useAuth, useFleet, useBookings, useCamera, useInspectionDraft
│   ├── i18n/                  # Localization (French default, Arabic with RTL, English)
│   ├── storage/               # SecureStore (Keychain/Keystore) & DraftStore (AsyncStorage)
│   ├── types/                 # Shared TypeScript models (Car, Booking, Inspection, User)
│   └── utils/                 # Money formatting (MAD), date formatting, inspection math
├── app.json                   # Expo App Manifest (Bundle ID, Permissions, Plugins)
├── eas.json                   # Expo Application Services Build Configurations
└── package.json               # Mobile Workspace Dependencies
```

### Core Technologies
* **Framework:** React Native 0.76+ with Expo SDK 52/53
* **Navigation:** Expo Router v4 (typed, file-based, deep linking ready)
* **Design & Styling:** Custom StyleSheet design system matching Fider Lux (warm graphite `#121110`, surface `#1C1A18`, cream `#F7F6F2`, brass `#D4AF37`)
* **Hardware APIs:** `expo-camera`, `expo-image-picker`, `expo-secure-store`, `expo-notifications`, `expo-localization`
* **Icons:** `lucide-react-native` with `react-native-svg`
* **State & Sync:** React Context + resilient offline storage queues

---

## 9. Proposed Release & CI/CD Architecture

* **Build Engine:** Expo Application Services (EAS Build)
* **Profiles in `eas.json`:**
  * `development`: Client build with local debugger support
  * `preview`: Internal testing `.apk` (Android) and Ad-Hoc/Simulator `.ipa` (iOS)
  * `production`: Optimized Android App Bundle (`.aab`) and iOS Release Archive (`.ipa` for TestFlight / App Store)
* **Continuous Integration:** GitHub Actions (`.github/workflows/mobile-ci.yml`) enforcing:
  * TypeScript typecheck (`npx tsc --noEmit`)
  * ESLint validation
  * Jest mobile unit & component test suite
  * EAS build dry-run validation

---

## 10. Key Engineering Decisions & Assumptions

1. **Brand Name:** Canonical public brand is **Fider** (*"The trust layer for mobility"* / *"La couche de confiance pour la mobilité"*). Bundle ID: `codes.carhub.fider`.
2. **Root Admin Mobile Scope:** `ROOT_ADMIN` (platform founder) functionality is intentionally kept web-only for operational security. Mobile app is dedicated to agency operations (`OWNER`, `MANAGER`, `AGENT`) and customer self-service (`RENTER`).
3. **Moroccan Localization Baseline:** Default language is French (`fr`), with full Arabic (`ar`) RTL support and English (`en`) for international visitors. All currency amounts formatted in MAD.
4. **Offline Inspection Drafts:** Field agents can inspect vehicles without cellular signal; inspection data and photos are stored securely in local cache and automatically synchronized once connectivity is restored.
