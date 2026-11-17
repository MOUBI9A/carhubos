# Fider Cross-AI Continuity Protocol

This protocol ensures that Codex, Claude, Gemini, Copilot, Antigravity, or another engineering assistant continues the same program instead of creating a new roadmap or repeating completed work.

## Universal start instruction

The founder can give any AI this instruction:

> Continue Fider from the canonical execution system. Read `AGENTS.md`, then follow `docs/operations/AI_CONTINUITY_PROTOCOL.md`. Verify the repository and remote state, resume the recorded in-progress task or claim the highest-priority unblocked ready task, and update the handoff state before you stop.

The AI must not require the founder to restate project history that is already recorded in the canonical files.

## Canonical truth hierarchy

Read and apply these in order:

1. `AGENTS.md` — safety invariants and mandatory operating rules.
2. `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md` — strategy, phase gates, architecture, release and rollback policy.
3. `docs/progress/EXECUTION_BOARD.md` — canonical task IDs, order, dependencies, status, owner, and acceptance evidence.
4. `.agents/state/CURRENT.md` — latest verified repository/program state and exact resume point.
5. `.agents/state/NEXT.md` — short queue for the next one to three tasks.
6. `.agents/state/BLOCKERS.md` — active external or technical blockers.
7. `.agents/state/DECISIONS.md` — binding decisions and superseded historical decisions.
8. `COORDINATION.md` — live file ownership and collision avoidance.

The repository, GitHub, hosting, and provider state can change after documentation is written. Re-verify cheap, drift-prone facts. If live evidence conflicts with a progress document, preserve evidence, update the stale document, and do not silently invent a new plan.

Historical documents use older phase numbers, including a legacy design “Phase 12.” Those labels do not override or extend the current Phase 0–8 execution board.

## Mandatory start checklist

Before any write or external mutation:

1. Confirm the exact working directory and repository root.
2. Read `AGENTS.md` completely and all canonical files above.
3. Run read-only Git checks: remotes, current branch, `origin/main`, status, recent commits, and relevant open PRs/checks.
4. Preserve all uncommitted/untracked files. Treat them as user-owned unless the current task explicitly owns them.
5. Check whether the recorded task is already complete, stale, blocked, or owned by another worker.
6. If an `IN_PROGRESS` task has an active owner, do not duplicate it. Continue it only with an explicit handoff; otherwise select the highest-priority `READY` task whose dependencies are `DONE`.
7. Update the task row and claim exact files in `COORDINATION.md`. Commit and push the coordination claim separately before editing task files.
8. Use a scoped branch named `codex/<task-id>-<slug>` or the equivalent tool-specific prefix. Never work directly on `main`.

## Task status contract

Only these statuses are allowed on the execution board:

| Status | Meaning |
|---|---|
| `NOT_STARTED` | Defined but not yet eligible or selected. |
| `READY` | Dependencies satisfied; may be claimed. |
| `IN_PROGRESS` | Exactly one owner is actively working it. |
| `BLOCKED` | Cannot advance; blocker and owner are recorded. |
| `REVIEW` | Implementation complete in a PR; acceptance/merge remains. |
| `DONE` | Acceptance evidence passed and the change is merged into the canonical base. |
| `DEFERRED` | Deliberately postponed with reason and re-entry condition. |

An AI may not mark a task `DONE` merely because code was written, a local check passed, or a preview deployed. `DONE` requires the task’s acceptance evidence and merge into the board’s canonical base.

## Execution rules

- Work on one board task at a time unless the board explicitly declares disjoint parallel lanes.
- Do not expand scope just because adjacent problems are visible. Record them as candidate tasks or blockers.
- Schema, migration, tenant, money, consent, authentication, payment, provider, and AI-policy changes require an adversarial review before acceptance.
- Production migrations, deployments, billing/provider activation, real customer imports, merges, and public releases remain human gates unless the founder explicitly authorizes the exact action.
- No AI may weaken a test, guard, invariant, or release gate to make a task pass.
- Provider-disabled, mocked, local-only, preview, staging, production, and published are distinct states.
- Do not expose secret values. Record only secret/environment variable names and verification outcomes.

## Required task evidence

Every task row or linked PR must record:

- exact base and head SHA;
- files and migrations changed;
- commands/scenarios run and results;
- tenant/money/consent/security/provider impact;
- environment used;
- what was not tested or remains disabled;
- rollback/containment path;
- reviewer or human gate still required.

Use the master plan’s evidence vocabulary. Avoid “done,” “production-ready,” or “deployed” without the corresponding proof.

## Pause and completion checklist

Before stopping:

1. Stop or identify any running processes.
2. Re-run proportionate verification and save concise evidence.
3. Update the task row in `docs/progress/EXECUTION_BOARD.md`.
4. Update `.agents/state/CURRENT.md` with branch, PR, task, completed work, exact verified state, changed files/config, risks, blockers, and next action.
5. Update `.agents/state/NEXT.md`, `BLOCKERS.md`, or `DECISIONS.md` when their facts changed.
6. Update architecture/progress/backlog documentation when the task changes those facts.
7. Commit and push only explicitly owned files; verify the staged file list before committing.
8. Open/update the PR and record its checks. Do not merge or deploy without the applicable gate.
9. Release the `COORDINATION.md` claim in a separate commit and push.

The final handoff must distinguish verified facts, assumptions, local-only results, preview/staging results, production facts, and blocked work.

## Recovery from stale or conflicting state

If the current branch, task, files, or remote state do not match the handoff:

1. Stop writes.
2. Re-read `COORDINATION.md` and inspect Git worktrees/branches/PRs.
3. Determine whether another worker advanced the task.
4. Preserve all work; never reset, delete, copy over, force-push, or reconcile checkouts without explicit authority.
5. Update the board/current state with the verified reality, then resume the correct task or record a blocker.

If a task is blocked, continue only with a different `READY` task that does not violate dependencies or file ownership. Never bypass the blocker by weakening the plan.
