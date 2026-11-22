# Next Engineering Priorities

The canonical queue is docs/progress/EXECUTION_BOARD.md.

1. **P0-07:** finish review and PR for docs/operations/PR_DISPOSITION.md.
   Inventory only; selective code ports and closures belong to P2-03.
2. **P0-05 / PR #39:** all protected checks pass; merge approval is pending.
   Refresh head/checks and reconcile shared state with P0-07 before merge.
3. **P0-06:** define environment/provider/data rules after P0-05 acceptance.

AI PRs remain deferred until after the core pilot; vehicle-control scope in #8
must not be ported. Production-affecting changes retain their release gates.
