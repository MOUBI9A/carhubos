# Operational Blockers & Resolutions

## Active Blockers
*None currently blocking progress.* Engineering continues autonomously.

---

## Resolved Blockers & Safeguards
1. **Divergent Diagnostics Branch**:
   - *Status*: Resolved.
   - *Detail*: Initial diagnostics implementation in `feat/production-diagnostics` had diverged from main/mobile branches with package-lock conflicts.
   - *Resolution*: Created unified branch `feat/automotive-os-platform` to cleanly integrate and advance the automotive domain models and services.
2. **AI Provider Availability in CI/Local**:
   - *Status*: Resolved via design.
   - *Detail*: Integration tests and local development cannot depend on live Anthropic API keys.
   - *Resolution*: Implemented `MockDiagnosticProvider` and fallback mechanisms so unit/integration test suites execute deterministically without external API requirements.
