# Guard: 1-domain-core

Range 519621c..7e02ae7, guard-bee Fable 5.1 higher, read-only.

CRIT 1 PASS .claude/run/1-domain-core/test-rerun.log
CRIT 2 PASS packages/domain/src/index.ts:4-138
CRIT 3 PASS packages/domain/src/reduce.ts:236,158-166,312-327,509-524,495-507; names.ts:24-25; authorize.ts:5-16
CRIT 4 PASS packages/domain/test/reduce.test.ts:126-325,416-652; authorize.test.ts:182-285
CRIT 5 PASS packages/domain/src/reduce.ts:480-490
CRIT 6 PASS packages/domain/src/reduce.ts:193-199
CRIT 7 PASS packages/domain/src, packages/domain/test, vite.config.ts

## Findings

- P2 packages/domain/src/reduce.ts:166 `setMaxHpOf` computes `hp = min(hp, newMax)` and leaves HP below `−newMax` (hp −8, maxHp 10, setMaxHp 4 → hp −8), contradicting vision Unit → Fields «Current HP −max … 999» and failing the package's own `unitSchema` refine (schemas.ts:98); same path through `editUnit` (reduce.ts:301).
- P3 packages/domain/src/reduce.ts:520 `copyCombat` reuses `restartedUnit` and resets `disabled` to false; vision Combat list Duplicate does not list `disabled` among the resets (hypothesis: preserve it); test reduce.test.ts:929 encodes the reset.
- P3 packages/domain/test/reduce.test.ts:835 and authorize.test.ts:388 named «Depth: 10 steps back from the newest action.» assert only `LIMITS.undoDepth === 10`; behaviour arrives in 1-domain-rest.

7 pass / 0 fail / 0 unverifiable; scope held.
