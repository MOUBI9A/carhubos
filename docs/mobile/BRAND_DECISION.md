# Fider — Canonical Branding & Mobile Identity Decision

**Document:** `docs/mobile/BRAND_DECISION.md`  
**Status:** Approved Architectural Standard  
**Date:** October 2026  

---

## 1. Context & Historical Naming Audit

Across the evolution of the codebase, five distinct names have appeared:
1. **CarHub / CarHub OS:** The original name of the project repository (`MOUBI9A/carhubos`) and development domain.
2. **Titan ERP Console:** Early internal prototype designation used in architectural wireframes.
3. **Infinity:** Previous product moniker (retained in internal token names like `infinity_token` and legacy CSS classes like `.btn-infinity`).
4. **carhub.codes:** The active production domain and infrastructure host.
5. **Fider:** The official, contemporary public brand established in Phase 12 and documented across `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN_VISION.md`, and the live production marketing surface.

---

## 2. Canonical Brand Decision: "Fider"

The official, canonical public brand for the mobile application and all customer-facing surfaces is:

### **Fider**
*(tagline: "The Trust Layer for Mobility" / "La couche de confiance pour la mobilité" / "منصة الثقة لقطاع تأجير السيارات")*

### Strategic Rationale
* **Linguistic Resonance:** "Fider" bridges French (*fidélité*, *confiance*), English (*fidelity*, trust), and Moroccan Arabic (*فدّر / تأمين / أمان*), perfectly communicating trust, security, and institutional reliability in the automotive mobility ecosystem.
* **Consistency with Live Web:** The live marketing site on `https://www.carhub.codes` prominently displays **Fider** as its brand mark, title, and public persona.
* **Separation of Concerns:**
  * **Public Brand (Store, App, UI):** **Fider**
  * **Production Domain / Infrastructure:** `carhub.codes`
  * **Repository & Internal Directory:** `carhubos`
  * Internal database columns and JWT cookies (`infinity_token`) remain untouched to avoid high-risk data migrations.

---

## 3. Normalized Mobile Identity Specification

| Property | Normalized Specification | Notes |
| :--- | :--- | :--- |
| **App Display Name (iOS & Android)** | **Fider** | Clean, uncluttered name below the home screen icon. |
| **Extended App Store Title (iOS)** | **Fider — Location & Flotte ERP** | 30-character limit optimized for Moroccan / Francophone search. |
| **Google Play App Title** | **Fider — Gestion Location Voitures** | Descriptive, localized for car rental agency operations. |
| **iOS Bundle Identifier** | `codes.carhub.fider` | Rooted in official domain `carhub.codes`. |
| **Android Package Name (`applicationId`)**| `codes.carhub.fider` | Aligned with iOS bundle ID for unified push & store tracking. |
| **Deep Link Scheme** | `fider://` | Native protocol for deep links and QR scan callbacks. |
| **Universal Links / App Links** | `https://www.carhub.codes/app/*` | Verified domain association via Apple App Site Association & assetlinks.json. |
| **Primary Brand Colors** | `#121110` (Graphite), `#1C1A18` (Surface), `#7C5CFC` (Restrained Violet), `#D4AF37` (Brass/Gold), `#F7F6F2` (Cream text) | Fider Lux premium hospitality design system. |
| **Official Support Email** | `support@carhub.codes` / `contact@fider.ma` | Public agency support contact. |
| **Official Website URL** | `https://www.carhub.codes` | Landing and marketing web anchor. |
| **Official Privacy Policy URL** | `https://www.carhub.codes/privacy` | Live store compliance URL. |
| **Official Terms URL** | `https://www.carhub.codes/terms` | Live store terms URL. |
| **Account Deletion Request URL**| `https://www.carhub.codes/account-deletion` | Mandated by Apple & Google Play guidelines. |

---

## 4. Visual Identity & Assets

* **App Icon:** Rich dark obsidian background (`#121110`) featuring the refined Fider geometric monogram rendered in elegant warm brass (`#D4AF37`) and subtle violet illumination.
* **Android Adaptive Icon:** Foreground vector monogram + background dark obsidian base, compatible with Android 13+ monochrome icon themer.
* **Splash Screen:** Seamless dark canvas (`#121110`) with centered Fider mark and delicate serif typography in cream (`#F7F6F2`).
