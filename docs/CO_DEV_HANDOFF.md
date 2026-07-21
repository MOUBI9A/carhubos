# CO-DEV HANDOFF — two AI agents, one repo

**Read this before editing if you are an AI agent working in this repo.**

The founder runs **two** AI developers against this same checkout:

| | Lead Developer | Co-Developer |
|---|---|---|
| Role | Writes the main codebase; owns phase execution | Review, QA/tests, UI/a11y, targeted backend hardening |
| Scope | Anything | Only what the founder assigns, task by task |
| Commits | Freely, per `CLAUDE.md` §9 | Only verified-green work, never mid-phase |

This file is the **async channel between them**. Neither agent sees the other's
conversation, so anything one needs the other to know goes here, not in chat.

---

## Protocol (both agents)

1. **`git status` before the first write of any session.** A dirty file you did
   not touch means the other agent is mid-task — do not edit it, note it here.
2. **Never leave the tree dirty at the end of a session.** Uncommitted work is
   invisible to the other agent and is the single biggest conflict source here.
   Commit it green, or revert it, or record it in "In flight" below.
3. **Verify before commit**, both sides, no exceptions:
   `cd backend && npx tsc --noEmit && npx jest && npx eslint .`
   `cd frontend && npx tsc --noEmit && npx vitest run && npx eslint .`
   Frontend tests are **vitest, not jest** — `npx jest` there fails with a
   misleading babel parse error rather than a clear "wrong runner".
4. **Serialize schema work.** `prisma/schema.prisma` and `migrations/` are
   single-owner at any moment. Claim it in "In flight" before touching it.
5. **Hot files** — historically contended, check twice:
   `backend/src/bookings/*`, `backend/src/payments/*` (the Codex fleet's usual
   working set, see `CLAUDE.md` §10), plus `CLAUDE.md` and `PROGRESS.md`
   themselves, which both agents update.

---

## In flight (claim your work here; clear it when committed)

_Nothing currently claimed._

---

## Open findings — handed to the Lead, deliberately NOT fixed by the Co-Dev

These are real but too cross-cutting for a co-developer to change unilaterally.

### 1. Email case is unnormalized app-wide — needs a data migration
`auth.service.ts` (register + login) and `saas-admin.service.ts`
(`provisionTenant`) all store and look up `email` verbatim, and Prisma's
`findUnique({ where: { email } })` is **case-sensitive** on Postgres.

Consequences: `Owner@x.ma` and `owner@x.ma` are two distinct accounts, and an
owner who signs in with different capitalization than they registered with gets
"invalid credentials". It bites hardest in founder provisioning, where the
founder types *someone else's* address into the wizard.

Fixing it properly means normalizing at **write and read** plus backfilling
existing rows — a data migration, so it belongs to the Lead, not a drive-by.

### 2. Chart a11y — the "tap/focus" half is still open
`fbbaf2b` shipped the screen-reader half (`SrDataTable`). Still outstanding on
`frontend/src/app/(owner)/dashboard/page.tsx`:

- **Touch users still cannot read revenue.** The tooltip (line ~387) is
  `group-hover/bar:` only, and there is no hover on touch. Minimal fix: add
  `group-active/bar:opacity-100` / `group-active/bar:scale-100` alongside the
  hover classes. Deliberately **not** `focus` — the parent is `aria-hidden`, and
  a focusable child inside `aria-hidden` is an axe violation.
- **`toLocaleString()` ignores the app locale** (line ~379 in the SR table, ~388
  in the tooltip). It formats with the *browser's* locale, not next-intl's, so a
  user running the app in FR with an en-US browser sees `12,345` not `12 345`.
  It matters most in the SR table, which a screen reader reads verbatim. Fix:
  `useFormatter().number(...)` from next-intl (already a dependency).
  Not a hydration bug — the data is react-query client-fetched.
- **Double announcement.** The `<figure aria-label="Daily intensity — …">` and
  the table's `<caption>` say nearly the same sentence; drop the `aria-label`.
  `SrDataTable`'s JSDoc also says "pair with `<figure aria-labelledby>`" while
  the call site uses `aria-label` — doc/usage drift.
- **Untouched chart surfaces:** `dashboard/erp/page.tsx` and
  `(public)/landing/_components/TrustConsole.tsx`.

---

## Changelog of Co-Dev contributions

| Commit | What | Verified |
|---|---|---|
| _(pending)_ | `subdomain` validation + DTO spec on founder provisioning | tsc + 119 jest + eslint green |
