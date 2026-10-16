# Guard: 1-domain-rest

Range 7238cc2..f39f257, guard-bee Fable 5.1 higher, read-only.

CRIT 1 PASS .claude/run/1-domain-rest/summary.log:1
CRIT 2 PASS scripts/check-domain-tests.mjs:111-150; scripts/test/domain-tests-missing/fixture.json:1-11
CRIT 3 PASS packages/domain/src/project.ts:8-46; packages/domain/test/project.test.ts:142-213
CRIT 4 PASS packages/domain/src/undo.ts:29-69; packages/domain/src/reduce.ts:478-493; packages/domain/test/undo.test.ts:160-295
CRIT 5 PASS packages/domain/src/index.ts:124,138-139
CRIT 6 PASS git log 7238cc2..f39f257

## Findings

- P3 packages/domain/src/project.ts:47 `{ ...combat, units }` forwards every combat-level key (`linkGeneration`, `lastPlayedAt`, `description`, `color`, `createdAt`) to the player document; follows the frozen `playerCombatSchema` (schemas.ts:166-169).
- P3 scripts/check-domain-tests.mjs:86-104 a required name is satisfied by any `it('<name>')` whatever its body.
- P3 packages/domain/test/undo.test.ts:254 test name promises "with its claim" but the removed unit carries no claim; the claimed path is covered at :264-267.

6 pass / 0 fail / 0 unverifiable; scope held.
