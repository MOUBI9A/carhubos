# 🚗 CarHub (Titan ERP Console)
## Architecture & Product Vision

---

### 1. Executive Summary & Product Vision

**CarHub** (internally recognized as the *Titan ERP Console*) is a comprehensive, multi-tenant SaaS Enterprise Resource Planning (ERP) platform explicitly engineered for car rental agencies. 

For decades, the car rental industry has relied on fragmented systems, relying heavily on messy Excel spreadsheets, disjointed paper trails, and a combination of isolated tools to track vehicles, bookings, and finances. This operational chaos leads to missed maintenance schedules, uncollected payments, vehicle damage disputes, and untracked expenses.

**The Core Value Proposition:**
CarHub transforms these chaotic workflows into a **centralized, automated, and intelligent command center**. By migrating agencies to CarHub, owners gain real-time visibility into their fleet's ROI, predictive alerts for maintenance and documentation renewals, strict security auditing, and streamlined financial controls. It empowers rental businesses to scale efficiently, minimize risks, and maximize fleet utilization through a singular, cohesive digital experience.

---

### 2. High-Level System Architecture

The CarHub platform adopts a modern, decoupled architecture designed for high performance, scalability, and strict tenant isolation.

```mermaid
flowchart TD
    %% External Actors
    Owner([Agency Owner / Manager])
    Agent([Front-desk Agent])
    
    Owner -->|HTTPS / Web| Frontend
    Agent -->|HTTPS / Web| Frontend
    
    %% Frontend Layer
    subgraph Frontend_Layer [Presentation Layer]
        Frontend[Next.js App Router]
        UI[Tailwind CSS + React Components]
        State[Client-side State / SWR]
        Frontend --- UI
        Frontend --- State
    end
    
    Frontend -->|REST API / JSON| Backend
    
    %% Backend Layer
    subgraph Backend_Layer [Application Layer]
        Backend[NestJS Framework]
        
        subgraph Core_Modules [NestJS Modules]
            AuthM[Auth & Permissions]
            FleetM[Fleet & Cars]
            CRM[Customers & Bookings]
            FinanceM[Invoices & Payments]
            AuditM[Security & Audit Logs]
            Analytics[Analytics & Command Centre]
        end
        
        Backend --- Core_Modules
        
        ORM[Prisma ORM]
        Core_Modules --> ORM
    end
    
    %% Data Layer
    subgraph Data_Layer [Persistence Layer]
        ORM -->|Connection Pool| DB[(Relational Database)]
        DB_Engine[SQLite / PostgreSQL]
        DB --- DB_Engine
    end
    
    %% External Systems
    subgraph External_Integrations [Third-party Integrations]
        Storage[Cloud Storage / S3]
        Webhooks[Webhook Subscribers]
    end
    
    Core_Modules -.->|Upload Documents/Photos| Storage
    Core_Modules -.->|Trigger Events| Webhooks
    
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef backend fill:#ef4444,stroke:#b91c1c,stroke-width:2px,color:#fff;
    classDef database fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    
    class Frontend,UI,State frontend;
    class Backend,Core_Modules,ORM backend;
    class DB,DB_Engine database;
```

**Architecture Stack Breakdown:**
* **Frontend:** Next.js (App Router) heavily leveraging React Server Components for performance, combined with Tailwind CSS for rapid, unified styling across the dashboard.
* **Backend:** NestJS, providing a robust, modular architectural pattern with built-in dependency injection, DTO validation, and strict type-safety via TypeScript.
* **Data Access:** Prisma ORM, enabling type-safe database queries and automated migrations.
* **Database:** Designed to be agnostic (currently SQLite for rapid development/edge deployments, scaling easily to PostgreSQL for massive concurrent workloads).

---

### 3. Core Business Domains & Features

The platform is strictly divided into five principal domains that govern the agency's lifecycle.

#### 📊 Command Centre (Analytics)
The central intelligence hub of the operation. This module aggregates data across all other domains to provide high-level, actionable insights. 
* **Capabilities:** Real-time calculation of Fleet Utilization, Revenue metrics, expense leakages, and per-vehicle Return on Investment (ROI) tracking.

#### 🚘 Fleet Management & Maintenance (The Guardian)
Dedicated to protecting the agency's primary assets. It provides granular tracking of every vehicle in the fleet.
* **Capabilities:** Tracking physical location/status of cars, logging historical maintenance, predicting next service intervals (e.g., Vidange), and actively monitoring expiring documents like Insurance and Technical Inspections to prevent operational blocks.

#### 🤝 CRM & Bookings
The operational heart for day-to-day business. This manages the delicate relationship between the vehicles, time, and the clients.
* **Capabilities:** Registering customer profiles, securely storing identity documents (CIN, Passports), managing active/upcoming/historical rentals, executing vehicle inspections (pre and post-rental), and issuing dynamic digital contracts.

#### 💰 Financial Vault
The ledger that tracks the lifeblood of the agency.
* **Capabilities:** Issuing automated invoices, tracking multi-method payments (Cash, Transfer, Card), managing rental deposits, and logging operational expenses (salaries, rent, utilities) to generate true net-profit reports.

#### 🛡️ Security & Auditing
The invisible watchdog. In a multi-user environment, accountability is paramount.
* **Capabilities:** The **AuditLog** system silently records every critical action (creating a booking, changing a vehicle's price, deleting records). It captures the `actor`, the `action`, and the exact `before` and `after` states in JSON format, preventing internal fraud.

---

### 4. Entity-Relationship Diagram (ERD)

The Prisma Schema is constructed with strict referential integrity and multi-tenant isolation (`Agency` acts as the root tenant for almost all records).

```mermaid
erDiagram
    AGENCY {
        String id PK
        String name
        String subdomain
        String subscriptionTier
    }
    USER {
        String id PK
        String email
        String role
        String agencyId FK
    }
    CAR {
        String id PK
        String licensePlate
        String status
        Float pricePerDay
        String agencyId FK
    }
    CUSTOMER {
        String id PK
        String identityNumber
        String firstName
        String phone
        String agencyId FK
    }
    BOOKING {
        String id PK
        DateTime startDate
        DateTime endDate
        Float totalPrice
        String status
        String carId FK
        String customerId FK
        String agencyId FK
    }
    INVOICE {
        String id PK
        Float amount
        String status
        String bookingId FK
        String agencyId FK
    }
    PAYMENT {
        String id PK
        Float amount
        String method
        String invoiceId FK
    }
    EXPENSE {
        String id PK
        String category
        Float amount
        String agencyId FK
    }
    MAINTENANCE_RECORD {
        String id PK
        String type
        Float cost
        String carId FK
    }
    INSPECTION {
        String id PK
        String type
        Int mileage
        String carId FK
        String bookingId FK
    }
    CONTRACT {
        String id PK
        String status
        String bookingId FK
    }
    AUDIT_LOG {
        String id PK
        String action
        String entityType
        String beforeState
        String afterState
        String agencyId FK
    }
    HUB_LISTING {
        String id PK
        Float dailyRateB2B
        String carId FK
        String agencyId FK
    }

    %% Tenant Relationships
    AGENCY ||--o{ USER : "employs"
    AGENCY ||--o{ CAR : "owns fleet"
    AGENCY ||--o{ CUSTOMER : "serves"
    AGENCY ||--o{ BOOKING : "processes"
    AGENCY ||--o{ INVOICE : "issues"
    AGENCY ||--o{ EXPENSE : "incurs"
    AGENCY ||--o{ AUDIT_LOG : "audits"
    AGENCY ||--o{ HUB_LISTING : "shares"

    %% Core Operational Relationships
    CUSTOMER ||--o{ BOOKING : "reserves"
    CAR ||--o{ BOOKING : "is rented in"
    
    %% Vehicle Sub-Entities
    CAR ||--o{ MAINTENANCE_RECORD : "undergoes"
    CAR ||--o{ INSPECTION : "receives"
    
    %% Booking Sub-Entities
    BOOKING ||--o{ INVOICE : "generates"
    BOOKING ||--o{ INSPECTION : "mandates"
    BOOKING ||--o{ CONTRACT : "binds"
    
    %% Financial Relationships
    INVOICE ||--o{ PAYMENT : "is settled by"
    
    %% User Actions
    USER ||--o{ BOOKING : "rents (if customer portal)"
    USER ||--o{ PAYMENT : "verifies"
    USER ||--o{ INSPECTION : "conducts"
```

---

### 5. The Future Roadmap (The Upgrades)

While CarHub excels at operational management within a single agency, the overarching vision spans beyond isolated tenants.

#### Global Client Reputation & Blacklist Network 🌍
Currently, agencies operate in silos. If a customer damages a vehicle, steals parts, or refuses to pay at Agency A, there is no way for Agency B to know the risk before handing over their keys.

**The Upgrade:**
CarHub will introduce an opt-in **Global Client Reputation Network**. 
* **Mechanics:** While tenant data remains strictly isolated for privacy, standardized hashing of identity numbers (e.g., CIN/Passport) combined with an encrypted incident ledger will allow agencies to flag high-risk individuals.
* **Outcome:** When a customer attempts to book a vehicle at a new agency, the Command Centre will query the network using the hashed identity document. If the individual holds a severe penalty or is blacklisted across the Hub network, the system will instantly alert the front-desk agent, effectively protecting the fleet against repeat offenders across the entire region.
* **The B2B Hub Network:** Leveraging the `HubListing` infrastructure, the platform will also allow trusted agencies to cross-rent idle fleet inventory to one another during peak seasons, maximizing industry-wide utilization securely.
