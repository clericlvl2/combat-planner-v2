# Report: fix-12-terms (hand-back message, saved by the orchestrator)

## Commits
- c7594ad fix: use 13th Age terms Staggered and hampered

## Checks run
pnpm test green (2181); visual update (17 deleted, 16 added, 137 modified) and verify green (1371); migration test green (3); acceptance 1 grep clean.
pnpm check red only on check-stories (handoff labels) and check-domain-tests (vision.md:301,303) — resolved by fix-17-checks (plan step 6.3–6.5 moved ahead).

## Questions
1. check-stories handoff labels — see above.
2. check-domain-tests vision lines — see above.
3. HistoryRow Temp used the staggered condition colours: new `historyTemp` token (`--cp-history-temp-fill/text`).
4. presets have no condition columns; migration touches combats.document and action_log only.

## Left undone
none

## Processes left running
none
