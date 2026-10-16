# Guard: fix-1-domain-core

Range e65b534..5d1e547, guard-bee Fable 5.1 higher, read-only.

CRIT 1 PASS .claude/run/fix-1-domain-core/summary.log:1-3
CRIT 2 PASS packages/domain/src/reduce.ts:167,302; packages/domain/test/reduce.test.ts:770-780
CRIT 3 PASS packages/domain/src/reduce.ts:527-531; reduce.test.ts:959-970
CRIT 4 PASS packages/domain/src/schemas.ts:166-168; project.ts:47-64; project.test.ts:148-164; undo.test.ts:259
CRIT 5 PASS git log e65b534..5d1e547

## Findings

none

5 pass / 0 fail / 0 unverifiable; scope held.
