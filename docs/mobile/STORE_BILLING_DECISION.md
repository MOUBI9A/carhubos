# Fider Mobile — Store Billing & Subscription Policy Decision

**Document:** `docs/mobile/STORE_BILLING_DECISION.md`  
**Status:** Approved Architectural Decision  
**Date:** October 2026  
**Regulatory References:** Apple App Store Guideline 3.1.3(a) & 3.1.3(c) · Google Play Payments Policy (Enterprise Services)  

---

## 1. Regulatory Context & Store Review Risks

Both Apple and Google strictly monitor applications offering digital subscriptions or SaaS plans. Apps that attempt to bypass App Store In-App Purchases (IAP) or Google Play Billing using embedded web checkout links (e.g. Stripe checkout inside a WebView) face immediate rejection under:
* **Apple Guideline 3.1.1 (In-App Purchase):** Disallows apps from directing users to external purchase mechanisms within the binary.
* **Google Play Payments Policy:** Mandates Google Play billing for in-app purchases unless qualifying for explicit exemptions.

---

## 2. Platform Business Model & Exemption Analysis

Fider is an **Enterprise Multi-Tenant B2B SaaS ERP** marketed to registered Moroccan car rental businesses:
* Agency owners purchase organizational subscription tiers (`STARTER`, `PRO`, `BUSINESS`) via commercial enterprise agreements, bank transfer, or invoice settlement on the desktop web application (`carhub.codes`).
* The mobile application is a **companion field tool** designed for agency owners, fleet managers, and front-desk agents to manage their vehicles, perform check-in/check-out inspections, and verify renter identities.
* End renters use the app solely to access their rental dossiers and approve consent grants.

### Store Policy Exemption: "Multiplatform Services" / "Reader Apps"
* **Apple App Store Guideline 3.1.3(a) (Multiplatform Services):**  
  > *"Apps that operate across multiple platforms may allow users to access content, subscriptions, or features they have acquired elsewhere, including consumable items in multi-platform games, provided those items are also available as in-app purchases within the app [or qualify as enterprise multiplatform services]."*
* **Apple Guideline 3.1.3(c) (Enterprise / Corporate Services):**  
  > *"Apps that are sold directly to an enterprise or organization to provide access to content or services to its employees or customers do not require in-app purchases."*

---

## 3. Approved Mobile Billing Architecture: The Companion Model

For the initial and ongoing production App Store and Google Play releases:

1. **Zero In-App Checkout / Upgrade Links:**
   * The mobile app will NOT contain checkout buttons, payment gateways, or web links directing users to purchase or upgrade SaaS subscription tiers.
   * There are no WebViews opening billing portals.
2. **Neutral Subscription Status Display:**
   * Agency settings in mobile present an informative, read-only subscription badge (e.g. *"Abonnement Agence: BUSINESS"* or *"Plan: Actif"*).
   * If an agency reaches a plan limit (e.g., maximum vehicle capacity), the mobile app renders a neutral informational message:
     > *"Limite de flotte atteinte. Pour modifier les paramètres de votre agence, veuillez contacter votre administrateur ou accéder à la console web Fider."*
3. **Lowest-Risk Store Review Clearance:**
   * By operating strictly as a complementary mobile client for an existing multi-tenant enterprise ERP, the application qualifies cleanly for store approval without the multi-month delay, financial complexity, and 30% store fees associated with in-app consumable billing.

---

## 4. Store Review Verification Checklist
* [x] No `Stripe`, `PayPal`, or external payment gateway SDKs bundled in the mobile binary.
* [x] No external checkout URL buttons in the mobile navigation.
* [x] Reviewer test accounts provided with pre-activated agency subscriptions for both Apple and Google testing teams.
