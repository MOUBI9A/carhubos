# Project Overview — CarHub OS / Fider

**Summary:** B2B multi-tenant ERP and trust platform for Moroccan car-rental agencies, with platform, agency and renter roles.
**Stack:** NestJS + Prisma + PostgreSQL backend; Next.js 16 + React 19 frontend; Vercel multi-service production.
**Team:** founder-led, assisted by coordinated coding agents

## Architecture
One repository contains a Nest API and Next.js App Router frontend. Tenant business data is scoped from the authenticated agency identity; cross-tenant trust is explicit and consent-controlled. Vercel routes `/api/*` to the backend container and all other requests to the frontend service.

## Key Components
- Guardian Vision — vehicle condition evidence, corrections and mutual approval
- Consent Vault — renter-controlled document access
- SaaS billing and entitlements — founder-to-agency subscription layer
- Operations Intelligence — deterministic read-only summaries with default-off AI governance

## Design Decisions
See [[decisions/]] directory.

## Sources
- [Integration roadmap](../docs/INTEGRATION_ROADMAP_20261116.md) — 2026-11-16
- [Architecture](../docs/ARCHITECTURE.md) — current repository source
