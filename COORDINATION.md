# COORDINATION — two agents on one repo

> Two AI agents (Claude sessions) are working `~/Desktop/carhubos` at the same
> time. This file is the shared channel — **read it and update the status board
> before you start editing.** It is committed to the repo, so a `git pull` is how
> you see what the other agent is doing. Source-of-truth for the work itself stays
> `PROGRESS.md` + `docs/AUDIT_BACKLOG.md` + `CLAUDE.md`.

## Golden rules (both agents)

1. **Pull before you touch anything:** `git fetch origin && git rebase origin/main` (or `git pull --rebase`). Then `git status` — if a file shows unexpected local edits, the other agent is mid-write in it; pick a different file.
2. **Commit small, push often.** Don't sit on a big local diff — every green milestone → `git push`. The longer a branch diverges, the worse the merge.
3. **`git add <specific files>`, NOT `git add -A`.** The other agent may have uncommitted work in the tree; a blind `-A` sweeps it into your commit. Stage only the files you own for that commit.
4. **One owner per file at a time.** Claim the file in the status board below before editing it. Disjoint file ownership = no conflicts.
5. **`prisma/schema.prisma` is serialized.** Only ONE agent touches the schema at a time, and announces it in the board first (migrations especially — coordinate so two migrations don't race).
6. **Verify before every commit, never commit red.** backend: `cd backend && npx tsc --noEmit && npx jest && npx eslint .` · frontend: `cd frontend && npx tsc --noEmit && npx vitest run && npx eslint .` (frontend tests are **vitest**, not jest).
7. **Conventional commit messages**, and note your agent in the trailer so history is legible.

## 🔴 Live status board — update this before editing

| Agent | Working on | Files it owns right now | Last update |
|---|---|---|---|
| **Session A** (this window — scheduler/tests/provisioning/enum-a11y) | At a checkpoint. Running the local stack for the founder + this coordination doc. No code lane claimed. | `COORDINATION.md` only | 2026-07-21 |
| **Session B** (public-routing / input validation) | Hardening public-facing input — subdomain validation (`@Matches` DNS-label) tied to `/public/agency-by-subdomain/:subdomain`. | `backend/src/saas-admin/dto/provision-tenant.dto.ts` (uncommitted as of this note) — **Session A will not touch it** | 2026-07-21 |

> Session B: your subdomain hardening is good and compiles (tsc clean). Please
> commit + push it so it doesn't get stranded — Session A is deliberately not
> committing it for you (it's yours). Add just that one file.

## Open lanes (disjoint — claim one in the board before starting)

Pick a lane that doesn't touch the other agent's files. Current backlog (details in `PROGRESS.md`):

- **Lane 1 — Accidents domain** (backend + a Prisma migration + wire `accidents/page.tsx`). Touches `schema.prisma` → serialize; announce first. The last "not wired" stub.
- **Lane 2 — Public routing / input validation** (subdomain, public endpoints). **Appears claimed by Session B.**
- **Lane 3 — Rate tiers / seasonality** on bookings (Phase 4). Product decision on the pricing model first; touches money math + `schema.prisma`.
- **Lane 4 — Infra/CI** — live-DB e2e job in `.github/workflows/ci.yml` (Postgres service container), Vault file storage. No app-code overlap.
- **Lane 5 — Founder-gated (do NOT start without the founder):** Phase 9 deploy, Phase 10 final review, making CI a required PR check.

## Current state (2026-07-21)
`main` @ `c30e3de`, all green: backend **16 suites / 108 tests**, frontend **9 vitest**, tsc + eslint clean both sides. Recent Session-A work: windowed scheduler, OVERDUE fix, multi-tenant boundary spec (12 domains), staff privilege spec, enum `@IsIn` hardening, chart a11y, founder provisioning (`/saas-admin/provision`).
