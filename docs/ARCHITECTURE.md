# CarHub OS — System Architecture

**CarHub OS** is an AI-powered, multi-tenant automotive operating system engineered for repair shops, commercial garages, diagnostic specialists, fleet operators, parts vendors, and vehicle owners. It unifies vehicle hardware telemetry, deterministic OBD-II diagnostics, generative AI reasoning, technician copilot workflows, repair estimating, parts procurement, work orders, invoicing, and vehicle service histories into a single verifiable platform.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph Edge & Ingestion
        V[Vehicle OBD-II / CAN Device] -->|Raw PIDs / DTCs / Frames| G[Ingestion Gateway / Stream]
        SIM[Deterministic Telemetry Simulator] -->|Deterministic Scenarios| G
        G --> N[Telemetry Normalizer & Time-Series Aggregator]
    end

    subgraph Core Platform Backend (NestJS + PostgreSQL)
        N --> DS[Diagnostic Session Engine]
        DS --> RE[Deterministic Rules Engine]
        DS --> AI[AI Diagnostic Reasoning Provider / Claude]
        RE & AI --> EV[Diagnostic Evidence Store]
        EV --> TR[Technician Bay & Review Workflow]
        TR --> RECOM[Repair Recommendation Engine]
        RECOM --> PM[Parts Matching & Inventory Intelligence]
        RECOM --> EST[Estimate & Labor Calculator]
        EST --> APP[Customer Approval Gate]
        APP --> WO[Work Order State Machine]
        WO --> VER[Post-Repair DTC Verification]
        VER --> INV[Invoicing, Ledger & Service History]
    end

    subgraph Client Applications
        WEB[Next.js 16 Web Apps: Owner / Technician / Renter / Admin]
        MOB[Expo React Native Mobile App: Field Technician & Check-in]
    end

    WEB <-->|REST + SSE API /api/*| DS
    MOB <-->|REST API /api/*| DS
```

---

## 2. Core Architectural Pillars

### Pillar 1: Strict Multi-Tenancy & Tenant Boundaries
- Every automotive repair shop, garage, or fleet is modeled as a tenant (`Agency` / `Organization`).
- Tenant isolation is non-negotiable: all business queries enforce tenant context extracted server-side from JWT session via `@CurrentUser()`.
- Route guards reject cross-tenant accesses with **HTTP 404** (Not Found) rather than 403 to prevent identifier enumeration and IDOR attacks.

### Pillar 2: Dual Diagnostic Brain (Deterministic + AI)
- **Deterministic Rules Engine:** Fast, mathematically rigorous evaluation of standard SAE OBD-II DTCs (P, B, C, U codes), PID bounds (RPM, Coolant Temp, Fuel Trims, O2 Sensors, MAF/MAP), and freeze-frame telemetry.
- **AI Reasoning Engine (Provider-Neutral):** Evaluates multi-source evidence (symptoms, anomalies, vehicle history, mileage, ambient conditions) using Claude (`AnthropicProvider`) via clean domain interfaces (`DiagnosticReasoningProvider`).
- **Evidence Immutability:** AI never outputs ungrounded assertions. Every diagnosis links directly to concrete telemetry samples, DTCs, freeze frames, and confidence levels (`confirmed`, `high`, `probable`, `possible`, `insufficient_evidence`).

### Pillar 3: Resumable Telemetry & OBD Simulator
- Ingestion pipeline supports batch streaming, timestamp alignment, unit normalization, out-of-order deduplication, and anomaly windowing.
- Deterministic simulator covers critical garage testing scenarios: normal idle, cylinder misfire (P0300/P0301), lean bank 1 (P0171), catalyst efficiency (P0420), coolant overheating, sensor disconnect, and noise spikes.

### Pillar 4: Shop Operations & Work Order State Machine
- Lifecycle transition: `Diagnostic Session` $\rightarrow$ `Diagnosis Confirmation` $\rightarrow$ `Repair Recommendation` $\rightarrow$ `Parts Matching` $\rightarrow$ `Customer Estimate` $\rightarrow$ `Work Order` $\rightarrow$ `Post-Repair Verification` $\rightarrow$ `Settled Invoice`.
- Work order state machine enforces strict, auditable states:
  `DRAFT` $\rightarrow$ `AWAITING_APPROVAL` $\rightarrow$ `APPROVED` $\rightarrow$ `SCHEDULED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_PARTS` $\rightarrow$ `BLOCKED` $\rightarrow$ `QUALITY_CHECK` $\rightarrow$ `COMPLETED` $\rightarrow$ `INVOICED`.

### Pillar 5: Monetary Precision & Accounting
- Financial quantities (labor rates, parts prices, subtotals, VAT, platform invoices) use PostgreSQL `@db.Decimal(12,2)`.
- Backend computations operate strictly via `Decimal.js` methods or integer cents math. No floating-point arithmetic.
- Serialized to numbers on wire via global `DecimalToNumberInterceptor`.

### Pillar 6: Technician-First Ergonomics & Customer Transparency
- **Diagnostic Bay View:** High-contrast, dense, responsive interface designed for garage tablets and tough workstation environments.
- **Customer Portal View:** Jargon-free translations of technical DTCs and freeze frames into plain-language health reports, urgency indicators, and digital estimate approvals.

---

## 3. Technology Stack

| Layer | Component | Version / Tech |
|---|---|---|
| **Backend** | NestJS | 11.x (Node 20+) |
| **ORM & DB** | Prisma + PostgreSQL | Postgres 15 (Docker / Azure PG) |
| **Frontend** | Next.js + React | Next.js 16 + React 19 + Tailwind CSS |
| **Mobile** | Expo + React Native | Expo 52 + React Native 0.76 |
| **AI Provider** | Anthropic Claude SDK | Provider-neutral adapter pattern |
| **Telemetry** | OBD-II Normalizer & Simulator | Custom deterministic engine |
| **Auth** | JWT HttpOnly Cookie | Capabilities-based RBAC |
| **Cloud Target** | Microsoft Azure | Container Apps, Bicep, Key Vault |
