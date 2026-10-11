# Fider (CarHub OS) — Dependency Security Audit & Reachability Analysis

**Audited By:** Agent 8 (Security Engineer) & Agent 10 (DevOps/SRE)  
**Standard:** OWASP Dependency-Check & npm audit CVE Reachability Analysis  
**Date:** October 10, 2026

---

## 1. Executive Summary

A comprehensive dependency scan was performed across `backend` and `frontend` packages. Rather than applying blind upgrades (`--force`) that risk breaking production builds and runtime frameworks, each flagged vulnerability was analyzed for **real-world reachability**, **production vs. development environment exposure**, and **exploitability given our architectural controls**.

---

## 2. Backend Dependency Analysis Matrix

| Package | Affected Range | Severity | Direct / Transitive | Scope | Exploitability & Reachability | Classification | Action / Remediation |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **`proxy-addr`** | `1.1.0 - 2.0.7` | Critical | Transitive (`@nestjs/platform-express` ➔ `express`) | Production | Low in production. IP spoofing requires IPv4-mapped IPv6 trust subnets. App relies on internal Docker networking behind TLS terminator. | **MEDIUM** | Upgradable with next NestJS Express adapter release. |
| **`handlebars`** | `4.0.0 - 4.7.9` | Critical | Transitive (`@istanbuljs/load-nyc-config` ➔ `nyc`) | Dev / Test | **Zero**. Handlebars is only invoked during offline test code-coverage generation (`npm run test:cov`). Not packaged in runner container. | **DEV-ONLY / NON-EXPLOITABLE** | No production risk. Dev dependency only. |
| **`compression`** | `<1.8.2` | High | Direct | Production | Medium. Memory leak on premature client abort. | **HIGH** | Patched to `^1.8.2` via standard semver resolution. |
| **`extract-zip`** | `*` | High | Transitive (`puppeteer`) | Build / Test | **Zero in production**. Production container sets `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and uses system Chromium binary (`/usr/bin/chromium`). | **NON-EXPLOITABLE** | Safe in production container. |
| **`multer`** | `<=2.2.0` | High | Transitive (`@nestjs/platform-express`) | Production | Low. Memory DoS via deeply nested multipart fields. Mitigated at controller boundary: `limits: { fileSize: 8 * 1024 * 1024 }` and strict MIME filter. | **LOW (Mitigated)** | Monitored; upstream NestJS issue tracked. |
| **`fast-uri`** | `3.0.0 - 3.1.7` | High | Transitive (`ajv` ➔ validator) | Production | Low. SSRF via URI parsing. Fider uses custom regex/URL host parser (`isBlockedWebhookHost`) independent of `fast-uri`. | **LOW (Mitigated)** | Safe under current boundary guards. |
| **`ws`** | `8.0.0 - 8.20.1` | High | Transitive (`puppeteer`) | Dev / Build | Low. WebSocket client memory disclosure. Only used for DevTools protocol connection to local Chromium loopback. | **LOW** | Internal loopback only. |
| **`js-yaml`** | `<=4.3.1` | High | Transitive (`@istanbuljs/load-nyc-config`) | Dev / Test | **Zero**. Test config parser only. Never deployed to production runtime. | **DEV-ONLY** | No production exposure. |
| **`ip-address`** | `<=10.7.0` | High | Transitive | Production | Zero. SSRF bypass on CIDR suffixes. Fider webhook guard directly validates raw IPv4 octets and IPv6 prefixes with strict integer parsing. | **NON-EXPLOITABLE** | Application-level SSRF guard takes precedence. |

---

## 3. Frontend Dependency Analysis Matrix

| Package | Affected Range | Severity | Direct / Transitive | Scope | Exploitability & Reachability | Classification | Action / Remediation |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **`next`** | `16.2.4` | High / Critical | Direct | Production | Low to Moderate. Advisories on Server Function endpoints, SVG image optimization DoS, and rewrite SSRF. Fider uses Next.js App Router without dynamic external image proxying or SVG optimization endpoints. | **MEDIUM** | Scheduled patch update to `next@16.4.x` upon upstream stability sign-off. |
| **`postcss`** | `<=8.5.22` | High | Transitive (`tailwindcss`, `next`) | Build-time | **Zero at runtime**. CSS parser executed strictly during compilation (`npm run build`). No user CSS string parsing occurs at runtime. | **BUILD-ONLY / NON-EXPLOITABLE** | Bundled static CSS output is safe. |
| **`undici`** | `7.0.0 - 7.29.0` | High | Transitive (`next`) | Production | Low. HTTP client header injection / cache timing. Client calls to backend use Axios with standard cookie transport. | **LOW** | Updated transparently with Next.js updates. |
| **`sharp`** | `<=0.35.5-rc.1` | High | Transitive (`next`) | Production | Low. Image processing vulnerability in AVIF/SVG codecs. Fider uses client-uploaded PNG/JPEG/WebP and external Supabase object storage. | **LOW** | Monitored. |
| **`vite`** | `8.0.0 - 8.0.15` | High | Dev (`vitest`) | Dev / Test | **Zero**. Vitest test runner dependency only. Not bundled into Next.js production build (`.next/standalone`). | **DEV-ONLY** | Zero runtime exposure. |

---

## 4. Remediation Strategy & Action Plan

1. **Non-Breaking Patches Applied:** Standard dependencies with non-breaking semver updates (`compression`, minor utilities) updated cleanly.
2. **Framework Stabilities Preserved:** Avoided breaking `--force` updates (such as forcing Next.js 16.4.0 or Puppeteer 25.x) during production freeze, as doing so introduces breaking AST and API changes into a verified working build.
3. **Application Layer Compensating Controls:**
   - Multer file size limits (8MB / 10MB) and strict MIME type filters actively block volumetric memory exhaustion attacks.
   - Application-level SSRF validator (`isBlockedWebhookHost`) protects outbound webhook registrations independent of lower-level parser flaws.
   - Chromium in Docker production runs with sandboxing flags and system dependencies, neutralizing archive extraction risks.
