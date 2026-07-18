# Worker charter — CarHub / Infinity OS

The market-ready effort is run by a **supervisor** who decomposes each backlog phase into small tasks and dispatches each to the cheapest capable **worker** here. This file is the shared contract for every worker; the per-role files add specifics.

## Roster (model is pinned — do not override)

| Worker | Model | Owns |
|---|---|---|
| `security-fixer` | Opus | auth guards, role/tenant scoping, IDOR, rate limiting, secrets, identity hashing (Phase 0–1 authz) |
| `db-migrator` | Opus | Prisma schema + migrations, data types, cascade safety (Phase 2, data integrity) |
| `backend-builder` | Sonnet | NestJS features — endpoints/services/DTOs/modules (Phases 3–5 backend) |
| `frontend-wirer` | Sonnet | wiring mock Next.js pages to real endpoints, role UIs (Phase 5 frontend) |
| `ui-polisher` | Haiku | mechanical a11y / responsive / i18n / contrast fixes (Phase 7, mechanical Phase 6) |
| `test-writer` | Sonnet | Jest units, Playwright E2E, ESLint rules, CI (Phase 8) |
| `verifier` | Opus | adversarial review of a finished change before commit — the quality gate |

> **Dispatch note:** in an SDK/headless session these custom types may not be dispatchable by name — the supervisor then uses the `general-purpose` agent with the **model above pinned** and folds the role rules into the prompt. Same behavior, same model tier.

## Rules for every worker

1. **Read [`/CLAUDE.md`](../../CLAUDE.md) first** — especially §5 (Conventions & invariants) and §8 (Gotchas). Match those exactly; they are non-negotiable (tenant scoping, roles, money=Decimal, the numeric API interceptor, HMAC pepper, transactions).
2. **Stay in your lane.** Edit ONLY the files the task names (+ read direct callers). Never refactor unrelated code. Two workers must never edit the same file at once — if your fix needs a file another worker owns, STOP and hand back.
3. **Keep it green.** Run `cd backend && npx tsc --noEmit` (and `npx jest` if logic changed) before returning. Never return red work.
4. **Concurrent-edit tsc noise:** other workers may be editing *other* files in parallel. If `tsc` errors appear only in files you don't own, that's transient noise — report only whether YOUR files typecheck.
5. **Never do irreversible actions** (rotating live secrets, git history rewrite/force-push, destructive migrations against a real DB, deploys). Do the code/config part, then hand the irreversible step back to the supervisor with exact commands.
6. **Report concisely** — files changed (1-line diff each), how you verified (real command output), residual risk, and anything you deliberately did NOT do. **Never paste whole files back.**

## Verification & gates (supervisor)

- A `verifier` pass runs on each change (or per batch); **always individually** for security / money / DB / migration changes. FAIL → back to the owning worker with the specific defect. Never commit red.
- Human gates: Phase 0 (secrets/history — done), Phase 2 (destructive migration — done), Phase 9 (deploy + go-live), and any product decision. Stop and ask.
- After each phase: update `CLAUDE.md`, `docs/AUDIT_BACKLOG.md`, and any stale doc.
