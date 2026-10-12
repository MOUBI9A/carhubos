# Fider Mobile — Security Architecture & Privacy Threat Model

**Document:** `docs/mobile/SECURITY_AND_PRIVACY.md`  
**Status:** Approved Security Specification  
**Date:** October 2026  

---

## 1. Executive Summary & Regulatory Scope

Fider processes sensitive operational, financial, and personal data in the Moroccan car rental sector. The mobile application operates under strict compliance with:
* **Moroccan Law 09-08** (Protection of Individuals with regard to the Processing of Personal Data / CNDP guidelines).
* **Apple App Store Review Guidelines** (Section 5 — Legal and Privacy).
* **Google Play Developer Program Policies** (User Data and Data Safety).

---

## 2. Threat Modeling Matrix

| Threat Category | Potential Attack Vector | Impact | Engineering Mitigation / Countermeasure |
| :--- | :--- | :--- | :--- |
| **Token Theft / Compromise** | Malicious app reading app files or memory extraction on rooted/jailbroken device | High | Stored exclusively in **iOS Keychain** & **Android Keystore** with hardware-backed encryption. Zero tokens in plaintext storage. |
| **Identity Document Leakage** | Raw CIN / Passport photos saved to public camera roll | Critical | Camera capture is written to app-sandboxed private temporary cache (`FileSystem.cacheDirectory`), immediately wiped after upload. |
| **Cross-Tenant IDOR** | Manipulating requests to access competitor vehicle/booking data | Critical | Server enforces strict tenant isolation: queries ignore body-supplied tenant IDs and use `@CurrentUser().agencyId` from the verified JWT. Cross-tenant queries return 404. |
| **HMAC Salt Disclosure** | Reverse engineering APK/IPA to extract `IDENTITY_PEPPER` | Critical | **Zero secrets in bundle.** The mobile app never receives or computes HMAC hashes directly. All reputation matching is executed server-side. |
| **Inspection Tampering** | Manipulating offline vehicle odometer or damage records | Medium | All synchronized inspection records are verified server-side against the vehicle's last recorded odometer and chronological state. |
| **Man-in-the-Middle (MitM)**| Network sniffing on public Wi-Fi (airports/hotels) | High | HTTPS enforced with TLS 1.3. Strict Transport Security (HSTS) headers enabled on `carhub.codes`. |
| **Debug Log Exfiltration**| Production logs leaking customer names, CINs, or tokens | High | All `console.log` statements stripped in production builds via Babel plugin (`transform-remove-console`). |

---

## 3. Data Classification & Handling Standards

### A. Renter Identity & Documents (CIN / Driving License / Passports)
* **Storage:** Held exclusively in the server-side secure Document Vault backed by Supabase Private Storage (`vault-files` bucket, non-public).
* **Consent Verification:** Mobile agency users cannot view a renter's identity documents unless an active, unexpired `ConsentGrant` exists for their specific `agencyId`. If ungranted, the backend returns 403 Forbidden.
* **Ephemeral Device Presence:** Photos taken within the inspection or customer registration wizard are held in memory or isolated app-private sandbox and deleted immediately upon upload completion.

### B. Financial Information & Ledger Records
* **Monetary Accuracy:** All monetary amounts are formatted with standard Moroccan Dirham (MAD) conventions. Decimals are calculated on the backend using integer-safe math; the mobile client receives already serialized numbers.
* **No Local Credit Card Storage:** The mobile app never collects or stores raw credit card PANs or CVVs. Payments in Morocco are recorded as structured ledger events (`CASH`, `CARD`, `CHEQUE`, `TRANSFER`).

### C. Vehicle Inspection Photographs
* Photos taken during vehicle handover and return document pre-existing wear, dents, and current fuel gauge readings.
* Images are compressed natively (JPEG, 85% quality, max 1920px width) before upload to optimize mobile data bandwidth while retaining forensic detail.

---

## 4. Hardware Permissions Justification Matrix

| Permission | iOS Key (`Info.plist`) | Android Manifest (`uses-permission`) | Product Purpose & Justification |
| :--- | :--- | :--- | :--- |
| **Camera** | `NSCameraUsageDescription` | `android.permission.CAMERA` | Mandatory for capturing vehicle condition photos during check-in/check-out inspections and scanning renter verification QR codes. |
| **Photo Library** | `NSPhotoLibraryUsageDescription` | `android.permission.READ_MEDIA_IMAGES` | Allows agents to select previously captured vehicle documents or accident photos. |
| **Notifications** | N/A (Standard User Notification APNs) | `android.permission.POST_NOTIFICATIONS` | Used to alert staff to overdue vehicle returns, urgent maintenance, and pending renter consent approvals. |

> [!NOTE]
> Location, Microphone, Contacts, and Advertising ID permissions are **strictly omitted** from `app.json` and the mobile build, ensuring maximum privacy compliance and zero unnecessary store review scrutiny.
