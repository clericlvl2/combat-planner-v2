# REPORT: 1-domain-core

## Commits

| Hash | Subject |
|------|---------|
| b4fa66d | feat(domain): types |
| e864aff | feat(domain): schemas |
| c285488 | feat(domain): actions |
| 86de14d | feat(domain): health |
| 640e05a | feat(domain): sort |
| 497b7ab | feat(domain): names |
| 5a01f52 | feat(domain): reduce |
| 00a59a7 | feat(domain): authorize |

## Checks run

| Command | Result |
|---------|--------|
| `pnpm install --frozen-lockfile` | pass |
| `pnpm check` before each of the 8 commits and after the last | pass (format, Oxlint, tsgolint, `tsc -b`) |
| `pnpm test` before each of the 8 commits and after the last | pass, 179 tests (unit + storybook projects) |
| `pnpm build` | pass |
| `node scripts/check-comments.mjs` | pass; the only `scripts/check-*.mjs` present on this branch |
| `bash scripts/check-commit.sh master..agent/1-domain-core` | pass, 8 commits; the `reduce` commit is 1494 changed lines against the 1500 cap |
| `pnpm status` | no listeners on 5173/3000/6006/9222; Docker socket not accessible (`permission denied`), as in phase 0 |

## Questions

1. `HpHistoryEntry` carries two fields beyond the brief's list: `absorbed` (temp HP consumed by a damage entry, 0 otherwise) and `previous` (the value before the change: HP for damage and heal, temp HP for temp, max HP for max). Vision «HP history» renders `(N temp)` and `old → new`, which need them. Accept, or should the UI derive them another way?
2. `healthSegments(status, hp?, maxHp?)`: vision fixes the Bloodied split at 25 % of max, which the status alone cannot tell, so the function takes optional `hp`/`maxHp`. A bloodied unit whose HP is hidden (an enemy in the player view) gets 2 segments. Should the projection instead carry a precomputed segment count for enemies?
3. Patch shape: `apply` returns `patch: null` for `claimUnit` and `releaseUnit` (vision Action log 9). An added or duplicated unit appears as `units[newId] = null`; any action that removes a unit (`removeUnit`, `clear`) snapshots the whole prior list in `fields.units` so undo restores position; every other change is a per-field prior-value snapshot. The batch `1-domain-rest` undo consumes this.
4. `applyUndo(combat, action, now)` is the stub signature. `apply(combat, action, author, now)` has no parameter for the target entry's patch, which lives in the server's log; `1-domain-rest` decides whether the undo action payload carries the patch or `apply` gains a parameter.
5. `claimUnit` carries `displayName` and writes `combat.players[playerId]` on claim; nothing else in vision writes the display name. A DM `claimUnit` is `forbidden`. `releaseUnit` on an unclaimed unit succeeds as a no-op.
6. `addUnit` always carries `roll` (1–20); in setup it is ignored, in Active the initiative is `clamp(roll + bonus, −9, 99)`. The same clamp applies to `rollInitiative` and `start`.
7. Duplicate resets `disabled` to `false` on the copy (vision names HP, temp HP, conditions, initiative only). Note is copied.
8. Disabling the active unit keeps it as the active unit; Next turn then skips it. Vision is silent.
9. Remove active unit: the turn moves to the next eligible unit, wrapping to the top of the order without changing round or escalation — the literal Transitions row. Should a wrap here count as a new round like Next turn?
10. Remove last unit in Active sets `status: setup`, `round: 1`, `escalation: 0`, `activeUnitId: null`, so a setup combat always has those values. Start resets them anyway.
11. Start sets the turn to the first unit in order that is neither disabled nor dead, falling back to the first unit in order when every unit is skipped.
12. `nextTurnBlockReason` returns codes, not copy: `'everyUnitDisabledOrDead'`, `'lastRound'`, and `'notActive'` for a setup combat. `nextTurnTarget(combat) → { unitId, wraps } | null` is exported for the Next turn button's second line (`· round N`).
13. `turnOrder` ties: initiative bonus, then insertion order, as vision «Active» says; the brief's fallback (role, name, id) was not needed. Units without initiative sort last in insertion order.
14. `PlayerCombat` keeps every combat-level field of `Combat` (the visibility table hides unit fields only); `PlayerUnit` carries `healthStatus` and omits `initiativeBonus` and `disabled`, with the per-column fields optional. Without the bonus a player cannot reproduce tie-breaks, so `project` (batch `1-domain-rest`) should emit `units` already in turn order or add a position field.
15. `hpHistory` is stored in chronological order (append); «Newest first» is treated as a display rule for the UI.
16. `editUnit` that changes `maxHp` or `tempHp` writes `max` / `temp` history entries and caps HP, the same as the calculator actions. Changing the type away from Hero releases the claim.
17. Exports beyond the brief's list: `presetFromUnit(unit, presetId, now)` and `copyCombat(combat, combatId, now)` (the Save as preset and Копия боя bullets listed under the `reduce` rules), `rolledInitiative`, `nextTurnTarget`, `NEXT_TURN_BLOCK_REASONS`, `isPlayerAction`, `PLAYER_ACTION_TYPES`, `ACTION_TYPES`, `unitFormSchema`, one schema per action and per field range, `intRange`, the `CONDITIONS`/`ROLES`/`COMBAT_STATUSES`/`HEALTH_STATUSES`/`HP_HISTORY_KINDS` arrays, `DOMAIN_ERROR_CODES`, `applyUndo`. `DomainError` lives in `packages/domain/src/errors.ts` (shared by `reduce.ts` and `authorize.ts`), an extra file in the `reduce` commit.
18. Test naming for `check-domain-tests.mjs`: a table row's test is named by its first cell verbatim (e.g. `Restart, with confirm`); where another cell carries a rule, a second test is named `<first cell> | <cell>` (e.g. `Edit in the form | ✓, type locked to Hero`). Rule sentences and owner bullets are verbatim, Russian included. Claims and player-column rows are in `authorize.test.ts`; DM-column rows, Transitions, Rules and HP history are in `reduce.test.ts`; the health rules are in `health.test.ts`, the turn-order rule in `sort.test.ts`, the name/tag bullets in `names.test.ts`.
19. One-unit-per-commit stretched three times: the `schemas` commit rewrote `types.ts` to `z.infer` (the brief asks schemas to be the source of types); the `reduce` commit made `HpHistoryEntry.previous` non-null in `schemas.ts`; the `authorize` commit added the `authorize` call to `apply` in `reduce.ts`, which did not exist at commit 7. The `types` commit also carries the `tsconfig.json` and `vite.config.ts` include changes the tests need.
20. The `reduce` commit sits at 1494 changed lines. Claim-related tests were moved to `authorize.test.ts` and fixtures were tightened to stay under the 1500 cap; a fix batch that grows `reduce.test.ts` will need a second test file.
21. The `ulid` dependency of `packages/domain` is unused by this batch: every id comes from the caller (client or server).

## Differences from the renders

None; the brief names no renders.

## Dependencies needed

None.

## Left undone

None. The `undo.ts` stub returns `DomainError` `invalid` as the brief specifies; `1-domain-rest` replaces it.

## Processes left running

none
