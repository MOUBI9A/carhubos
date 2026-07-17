# CarHub SaaS Operating System 🚗💨

A production-grade, multi-tenant SaaS platform for car rental agencies, specifically localized for the Moroccan market (MAD currency, VAT 20%, local compliance).

## 🚀 Key Features

### 🏢 Multi-Tenant Agency Management
- **Complete Isolation**: Each agency operates in its own secure data silo.
- **Subscription tiers**: STARTER, PRO, and ENTERPRISE plans with feature gating.
- **Agency Dashboard**: Real-time stats on revenue, fleet status, and active bookings.

### 🚘 Fleet & Booking Management
- **Inventory Control**: Manage vehicles, maintenance records, and availability.
- **Booking Engine**: Sophisticated booking lifecycle with compliance hard-blocks (Insurance/Technical Inspection).
- **Pricing Engine**: Automated calculation with MAD currency, VAT, and security deposits.

### 🏛️ Platform Governance (Super Admin)
- **Global Pulse Dashboard**: See growth, MRR, and platform-wide health.
- **Forensic Search**: Universal search across all agencies, users, and cars.
- **Deep Analytics**: Operational intelligence and growth metrics.
- **Compliance Engine**: Automated nudges for agencies with expiring vehicle documents.
- **User Impersonation**: Securely assist agency admins by logging in as them.

### 🔒 Security & Hardening
- **JWT Authentication**: Secure role-based access control (RBAC).
- **Rate Limiting**: Multi-tier protection (Auth, API, Booking, Payment).
- **Input Validation**: Strict Zod-based validation on all endpoints.
- **Audit Logging**: Forensic tracking of all critical system actions.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, Prisma (SQLite/PostgreSQL)
- **Frontend**: Next.js (React), Tailwind CSS
- **Testing**: Jest, Supertest
- **Security**: jsonwebtoken, helmet, express-rate-limit, zod

## 📂 Project Structure

```bash
├── backend             # Express server & Prisma ORM
│   ├── src
│   │   ├── controllers # Request handlers
│   │   ├── services    # Business logic (Pure)
│   │   ├── middleware  # Security & Validation
│   │   └── routes      # API Endpoints
│   └── tests           # Jest test suite (78+ tests)
├── frontend            # Next.js Application
└── prisma              # Database schema & migrations
```

## 📖 Documentation

- [API Reference](./backend/API.md) - Detailed endpoint documentation.
- [Development Guide](./backend/DEVELOPMENT.md) - Setup, testing, and contribution instructions.

## ⚖️ License
Proprietary - Developed for CarHub SaaS Platform.
