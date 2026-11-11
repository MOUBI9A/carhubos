# Fider Mobile — Authentication Architecture & Security Specification

**Document:** `docs/mobile/MOBILE_AUTH.md`  
**Status:** Approved Architectural Standard  
**Date:** October 2026  

---

## 1. Executive Summary

Web browsers manage sessions via `Set-Cookie: infinity_token=...; HttpOnly; SameSite=Lax`. In contrast, native mobile applications running on iOS and Android operate in a sandboxed runtime outside the browser engine. 

Attempting to coerce native mobile network stacks into simulating cookie jars creates fragile session handling across native app terminations, background refresh tasks, and deep-link launches.

**The Solution:** The Fider mobile application utilizes **hardware-encrypted Bearer Token authentication** backed by **iOS Keychain** and **Android Keystore** via `expo-secure-store`. The backend NestJS `AuthGuard` natively accepts both cookie tokens and `Authorization: Bearer <token>` headers without weakening web security.

---

## 2. Token Lifecycle & Storage Architecture

```
                    ┌──────────────────────────┐
                    │    Native Mobile Client  │
                    └─────────────┬────────────┘
                                  │ 1. POST /api/auth/login { email, password }
                                  ▼
                    ┌──────────────────────────┐
                    │      NestJS Backend      │
                    │  (Throttled: 5 req/min)  │
                    └─────────────┬────────────┘
                                  │ 2. Returns { access_token, user }
                                  ▼
                    ┌──────────────────────────┐
                    │    Native Mobile Client  │
                    │  - Save token in Keychain│
                    │  - Save profile in state │
                    └─────────────┬────────────┘
                                  │ 3. All API calls include:
                                  │    Authorization: Bearer <token>
                                  ▼
                    ┌──────────────────────────┐
                    │      NestJS Backend      │
                    │  - AuthGuard verifies JWT│
                    │  - Scopes req.user       │
                    └──────────────────────────┘
```

### Storage Security Matrix
* **Secure Storage:** The JWT `access_token` is stored exclusively in `expo-secure-store`:
  * **iOS:** Encrypted using the iOS Keychain Services with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
  * **Android:** Encrypted using Android Keystore System with AES-256 GCM backed by hardware Security Module (Titan M / Knox / TEE where available).
* **Zero AsyncStorage Exposure:** Plaintext or unencrypted `AsyncStorage` is strictly prohibited for sensitive credentials, JWTs, or passwords.
* **Non-Sensitive Cache:** User display preference, active locale (`fr`, `ar`, `en`), and offline inspection drafts are stored in sandboxed app-private storage.

---

## 3. Session Expiration & Refresh Flow

1. **Token Duration:** JWTs issued by `AuthService` are cryptographically signed using HMAC-SHA256 (`JWT_SECRET`) with a validity of **7 days** (`604800` seconds).
2. **Graceful 401 Interception:**
   * An Axios response interceptor detects `HTTP 401 Unauthorized` responses.
   * Upon receiving a 401:
     1. The client immediately wipes the access token from `expo-secure-store`.
     2. Clears the in-memory React auth context (`user: null`, `role: null`).
     3. Emits an event to smoothly route the user to the Login screen with an informative alert: *"Votre session a expiré. Veuillez vous reconnecter."*
3. **No Infinite Background Drift:** If an agency revokes a staff member or deletes an account, the server returns 401 or 403, instantly locking the mobile app on the next network sync.

---

## 4. Role Gating & Navigation Redirection

Upon successful authentication or initial app launch with a cached valid token:
1. The app invokes `GET /api/auth/me` to retrieve the latest verified user payload.
2. Based on the user's `role` claim, the app routes into the appropriate workspace:
   * **`OWNER` & `MANAGER`:** Navigates to `(owner)` layout — Command Centre, Fleet Status, Bookings, Analytics.
   * **`AGENT`:** Navigates to `(agent)` layout — Today's Departures/Arrivals, Fast Inspection Wizard, QR Scanner.
   * **`RENTER`:** Navigates to `(renter)` layout — Active Rentals, Document Vault, Consent Requests.
   * **`ROOT_ADMIN`:** The platform founder console is deliberately excluded from mobile for security; users with this role are informed to access the console via desktop browser (`https://www.carhub.codes/admin`).

---

## 5. Security & Invariant Guarantees

* **No Hardcoded Credentials:** Test accounts and passwords are removed from all mobile source code and production bundles.
* **Brute-Force Protection:** Mobile login requests hit the global NestJS `ThrottlerGuard` which enforces a rate limit of **5 login attempts per 60 seconds** per IP/device.
* **Tenant Isolation:** The mobile app never transmits `agencyId` in query parameters or request bodies to read or modify resources. All business logic in the backend extracts `agencyId` strictly from `@CurrentUser()` decoded from the cryptographically verified JWT.
* **Zero Web Regression:** The backend `main.ts` CORS policy and `auth.guard.ts` cookie extraction continue to function identically for web browsers. Mobile uses the standard HTTP `Authorization` header.
