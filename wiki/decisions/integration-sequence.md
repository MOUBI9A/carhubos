# Decision: Integrate compliance, AI foundations and Guardian video separately
**Date:** 2026-11-16  **Status:** decided
## Context
Six mergeable draft PRs modify overlapping schema, frontend messages and operational behavior. Green preview CI does not clear their legal, provider or hosted-storage gates.
## Options
| Option | Pro | Con |
|--------|-----|-----|
| Merge all drafts | Fastest apparent feature accumulation | Large migration blast radius; hides distinct legal and storage blockers |
| Compliance → AI stack → Guardian video | Preserves dependency order and independent rollback/review boundaries | More release steps |
| Guardian video first | Visible user-facing capability | Hosted nonproduction storage acceptance is still missing |
## Decision
Finish compliance first, merge the AI stack only in dependency order while provider-disabled, and keep Guardian video draft until hosted staging storage passes.
## Consequences
- Each migration group gets exact-head rehearsal and role-flow validation.
- Legal copy and privacy operations remain human-gated.
- Guardian video cannot use production storage as a substitute for staging acceptance.
## Sources
- [Integration roadmap](../../docs/INTEGRATION_ROADMAP_20261116.md) — 2026-11-16
- [Guardian Vision QA](../../docs/GUARDIAN_VISION_QA_REPORT.md) — 2026-11-11
