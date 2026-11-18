# Dependency exception — GHSA-fc5q-39xc-vjpf

> **Status: APPROVED — ACTIVE (expires 2026-12-02T23:59:59Z)**
>
> Approved by founder & security owner Hamza El Moueddane on 2026-11-18. Compensating controls enforce exact advisory/version match, hard UTC expiry, extractor-disabled guard, and artifact retention.

## Decision requested

Approve a maximum 14-day exception for GitHub advisory `GHSA-fc5q-39xc-vjpf` / npm advisory source `1247710`, limited to the exact installed chain:

```text
next-intl@4.13.2
└── @parcel/watcher@2.5.6
    └── picomatch@4.0.5
```

If activated on 2026-11-18, the exception must expire no later than `2026-12-02T23:59:59Z`. Expiry is automatic and fail-closed. Renewal requires a new written decision and evidence; it is not implicit.

## Why this is blocked

- `npm audit --omit=dev --audit-level=high` reports a high-severity ReDoS advisory with CVSS 7.5.
- The advisory covers published `picomatch` releases through current npm latest `4.0.7`, so a normal patched upgrade is not available.
- An exact override to the older compatible `@parcel/watcher@2.5.1` was tested. It changed the chain to `micromatch -> picomatch`, remained vulnerable according to the same audit, and was fully reverted.
- Open upstream patch proposals are not merged or published. Pinning an unreviewed Git branch or fork would replace a known, bounded risk with an unverified supply-chain and maintenance risk.

The audit threshold, production scope and advisory data must not be weakened or hidden.

## Exposure analysis

The vulnerable function compiles attacker-controlled repeated extglob patterns into an expensive regular expression. In this repository:

- `next.config.ts` calls `createNextIntlPlugin` only with `./src/i18n/request.ts`.
- The project does not enable `next-intl`'s experimental extraction or message-catalog watcher options.
- `next-intl` returns before constructing its extraction compiler when no extraction configuration exists.
- The watcher calls `picomatch.makeRe` only while normalizing `ignore` glob patterns for a started subscription.
- When the extractor is enabled upstream, its ignore patterns are constructed from package-owned directory names; this repository does not pass renter, agency, request, database, provider or environment values into those patterns.
- The Next.js plugin is build/configuration tooling. Application request handlers and browser bundles do not accept or evaluate glob patterns through this dependency path.

These facts make the currently known exploit path unlikely to be reachable, but they do not prove that an installed vulnerable package is harmless. Configuration drift, a future `next-intl` behavior change, a second dependency path or an incorrect reachability assumption remain residual risks.

## Required compensating controls

Activation is allowed only if one reviewed implementation provides all controls below:

1. Run `npm audit --omit=dev --json` without changing its production scope.
2. Allow only advisory source `1247710`, package `picomatch`, severity `high`, and the exact `next-intl -> @parcel/watcher -> picomatch` chain and locked versions recorded above.
3. Fail on every other high or critical finding, a changed dependency path/version, malformed audit output, an audit command error, or missing lockfile evidence.
4. Fail after the approved UTC expiry with no grace period or environment-variable override.
5. Fail if `next.config.ts` enables `experimental.extract`, `experimental.messages`, or another extractor/watcher configuration while the exception is active.
6. Preserve the complete audit JSON and dependency-tree evidence as CI artifacts for each run.
7. Add fixture tests proving: exact-match pass; expiry fail; path/version drift fail; additional high fail; critical fail; malformed-output fail; command-error fail; extractor-enabled fail.
8. Recheck npm and the upstream advisory daily. Remove the exception as soon as a reviewed patched release is available, even if time remains.
9. Do not use an unreviewed Git dependency, fork, advisory suppression, lower severity threshold or blanket allowlist.

## Proposed implementation after approval

- Add a small frontend audit wrapper with the exception tuple and immutable expiry in source control.
- Add unit fixtures for every fail-closed condition above.
- Replace only the frontend audit command in `.github/workflows/ci.yml` with the wrapper; keep the backend audit unchanged.
- Upload the raw audit and dependency-tree JSON from the frontend job.
- Run the complete frontend gate locally, then require one exact-head five-job CI run on draft PR #29.
- Record approval, implementation SHA, CI run, expiry and remediation owner below.

No implementation in this section is active until the approval record is completed.

## Monitoring and removal

Owner: Codex for implementation evidence; founder/security owner for risk acceptance.

Removal trigger, earliest wins:

- a patched `picomatch`, `@parcel/watcher` or `next-intl` release passes the unchanged production audit and frontend gate;
- the dependency path is removed through a reviewed upstream change;
- reachability changes or the extractor is enabled;
- a new exploit or severity change invalidates this analysis; or
- the UTC expiry is reached.

On removal, delete the exception code and tests that exist only for the allowlist, restore the direct audit command, rerun all required CI jobs, and update the operational state.

## Evidence

- Advisory: <https://github.com/advisories/GHSA-fc5q-39xc-vjpf>
- Failed manual CI run: `44230394964`
- Draft CI PR: <https://github.com/MOUBI9A/carhubos/pull/29>
- Current npm latest observed on 2026-11-18: `picomatch@4.0.7`
- Independent Antigravity read-only assessment: `PASS` only with exact-path scoping, hard expiry, fail-closed handling, artifact retention, daily monitoring and formal approval. This opinion is supporting evidence, not authorization or proof of runtime safety.

## Approval record

- Founder/security decision: **APPROVED**
- Approver: Hamza El Moueddane (Founder & Security Owner)
- Approval timestamp (UTC): 2026-11-18T08:11:28Z
- Expiry timestamp (UTC): 2026-12-02T23:59:59Z
- Remediation owner: Codex / Antigravity
- Implementation commit: pending commit
- Exact-head CI run: pending PR check
- Notes: Option 1 approved via interactive decision prompt. 14-day fail-closed compensating controls implemented in frontend/scripts/audit-production.mjs and tested in frontend/scripts/audit-production.test.mjs.

