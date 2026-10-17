# CarHub OS — Production Gate & Verification Protocol

No code may be designated as "production-ready" without meeting the concrete verification criteria in this gate document.

---

## 1. Mandatory Gate Verification Criteria

| Verification Check | Target Standard | Verification Command |
|---|---|---|
| **Clean Working Tree** | No uncommitted changes or untracked artifacts | `git status --porcelain` |
| **Backend TypeScript** | Zero compiler errors | `cd backend && npx tsc --noEmit` |
| **Backend Unit Tests** | 100% test suites pass | `cd backend && npx jest` |
| **Frontend TypeScript**| Zero compiler errors | `cd frontend && npx tsc --noEmit` |
| **Frontend Unit Tests** | 100% Vitest suites pass | `cd frontend && npx vitest run` |
| **Mobile TypeScript**   | Zero compiler errors | `cd mobile && npm run typecheck` |
| **Tenant Isolation**   | Zero IDOR or cross-tenant leaks | `multi-tenant-boundary.spec.ts` |
| **Financial Integrity**| All monetary values Decimal(12,2) | Decimal math tests pass |
| **Database Migrations**| Migrations deploy cleanly | `npx prisma migrate status` |

---

## 2. Release Evidence Standard

Evidence of successful runs must be documented in `.agents/state/CURRENT.md` with:
- Exact date/time of run.
- Test counts and pass rates.
- Git commit SHA.
- Signed-off operational status.
