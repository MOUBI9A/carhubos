# Production Dependency Audit

**Project:** Fider / CarHub OS  
**Verification date:** 2026-10-10

## Scope

This audit distinguishes production/runtime dependencies from development and test tooling. The relevant release command is:

```bash
npm audit --omit=dev
```

The CI release gate additionally runs:

```bash
npm audit --omit=dev --audit-level=high
```

for both backend and frontend.

## Finding

The repository initially showed large raw `npm audit` counts during `npm ci`. Those totals included development/test packages and also included real production findings. The earlier claim that all dependency findings were non-reachable was therefore not accepted without package-level evidence.

An isolated production dependency audit identified runtime findings in both applications, including critical/high advisories in the frontend stack and high/critical transitive findings in the backend stack.

## Remediation

The production patch updated or constrained the affected runtime packages while avoiding force/major upgrades where possible:

### Backend

- NestJS core/platform packages updated within the 11.x line.
- `compression` updated to the patched release line.
- Puppeteer updated to the patched 25.x line.
- Puppeteer is now loaded lazily with native dynamic import because modern Puppeteer is ESM-only; this preserves Jest/CommonJS application-loading compatibility.
- Safe transitive lockfile fixes were applied with non-force npm audit remediation.

### Frontend

- Axios updated to the patched release line.
- Next.js and `eslint-config-next` updated to the patched 16.4.x line.
- `shadcn` CLI tooling was moved out of production dependencies into devDependencies because the runtime application does not import it.
- Patched transitive versions of `baseline-browser-mapping` and `source-map-js` are pinned with npm overrides.
- Safe transitive lockfile fixes were applied with non-force npm audit remediation.

## Verification Evidence

After remediation, the isolated production-only audit reported:

| Application | Critical | High | Moderate | Low | Total production findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| Backend | 0 | 0 | 0 | 0 | 0 |
| Frontend | 0 | 0 | 0 | 0 | 0 |

The dependency patch then passed the normal project gate:

- backend typecheck
- backend unit tests
- backend lint
- backend production build
- backend live-PostgreSQL E2E
- frontend typecheck
- frontend unit tests
- frontend lint
- frontend production build
- full Playwright browser E2E

## Dev-only findings

Raw `npm audit` may still report development/test-tool findings, particularly in older transitive Jest/coverage tooling. These are not installed in the production backend image (`npm ci --omit=dev`) and are intentionally separated from the production release decision. They should still be reviewed during normal maintenance rather than misrepresented as zero total repository advisories.

## Continuous Gate

The main CI workflow now runs `npm audit --omit=dev --audit-level=high` for both backend and frontend. A newly disclosed high or critical production dependency advisory will block CI until it is triaged or remediated.

## Verdict

**Production dependency gate: PASS as of 2026-10-10.**

This is a point-in-time result. Dependency risk must be re-evaluated continuously as advisories and package versions change.
