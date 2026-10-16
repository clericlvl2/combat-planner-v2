# REPORT: 1-domain-rest

## Commits

| Hash | Subject |
|------|---------|
| 94ff471 | feat(domain): project |
| 7b0da54 | feat(domain): undo |
| 5899b48 | feat(domain): index |
| 14bba24 | feat(domain): tests |

## Checks run

| Command | Result |
|---------|--------|
| `pnpm install --frozen-lockfile` | pass |
| `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` before each of the 4 commits and after the last | pass; from the `tests` commit on it includes `node scripts/check-domain-tests.mjs` (84 names) |
| `pnpm test` before each of the 4 commits and after the last | pass, 285 tests after the last commit (224 before `tests`) |
| `pnpm build` | pass |
| `node scripts/check-domain-tests.mjs` | pass, 84 name(s) |
| `node scripts/test/run.mjs` | pass, clean tree and 22 fixtures, including `domain-tests-missing` |
| `bash scripts/check-commit.sh master..agent/1-domain-rest` | pass, 4 commits; `tests` is 879 changed lines |
| `pnpm status` | no listeners on 5173/3000/6006/9222; Docker socket `permission denied`, as in phase 0; branch ahead 4, behind 9 of `master` (not rebased, per the integration rules) |
| export audit: every `export` name in `packages/domain/src/*.ts` against `index.ts` | 151 declared, 151 indexed, none missing, none twice |

## Questions

1. `position` on `PlayerUnit` is the 1-based index among the units the player receives: turn order in `active`, insertion order in `setup`, disabled units already dropped. The DM's index would leave gaps that reveal disabled units. Accept, or should it be the DM's index?
2. `project` is declared with overloads (`function project(combat, viewer: { kind: 'dm' }): Combat`, `(combat, viewer: { kind: 'player' }): PlayerCombat`, `(combat, viewer: Viewer): Combat | PlayerCombat`); the DM receives the same object reference. These are the only `function` declarations in the package; the rest are arrow constants.
3. `activeUnitId` in the player document can name a disabled unit that is not in the player's `units` (core decision 8 keeps a disabled active unit). `project` passes it through unchanged. Should `project` null it, or does the client ignore an unknown id?
4. Vision «Player view → Content» says the language is "the DM's setting, read from the combat document", but `Combat` has no language field; nothing in the domain carries it. Phase 3 (server) adds it to the document, or vision changes?
5. Result type of undo: `ApplyResult = Applied | Undone | DomainError`, `Undone = { combat, patch: null, undone: ActionId }`. The caller detects an undo by `'undone' in result`, sets `undoneBy` on the entry whose `action.id === result.undone`, and appends the undo's own entry with `patch: null`. `undoTarget` returns `UndoableEntry` (`LogEntry` with `patch: Patch`), which is what `applyUndo` reverts; both types are exported.
6. `applyUndo(combat, action, now, log)` keeps the brief's signature; `action` is not read (the target's id comes from the log). Lint accepts it.
7. Depth counting: the walk goes newest to oldest, skips `undo` entries, stops with `blocked` at the first entry without a patch, counts every patched entry (undone or not) and answers `blocked` at the 11th. Ten actions undone ten times leave «Nothing to undo» (`blocked`); an older 11th action is `blocked` by depth.
8. `check-domain-tests.mjs` rule cells: for «Transitions» the `From` column (`<Action> | <From>`), for «Unit → Actions» every cell other than `✓` or `—`. This required four tests the core batch did not have: `Clear, with confirm | any`, `Remove last unit, with confirm | active`, `Remove active unit, with confirm | active` (reduce.test.ts) and `Expand / collapse row | ✓, own row only` (authorize.test.ts). The `Effect` column is not a rule cell; the existing `Remove active unit, with confirm | when there is none…` name stays as an extra.
9. Owner bullets: the script requires a verbatim test for every bullet of «Решения владельца» except those starting with `Подпись сортировки`, `Не делать`, `Из стека`, `Ревью между пачками`, `Модели`, `Автокомпакт` (a skip list in the script, each prefix verified to match a bullet). A new dated bullet in the plan fails `pnpm check` until a test or a skip entry exists. The bullet «Удаление юнита с подтверждением и тостом с Undo…» got a domain test (undo of a removal restores the unit, no `redo` action type, stale version answers `version`).
10. The script counts only `it('...')` and `test('...')` with a string or template literal; `it.skip`, `it.only`, `it.each` and computed names are not counted, so a skipped required test reads as missing.
11. Commit scope: the `project` commit also edits `test/types.test.ts` (the `PlayerCombat` literal needs `healthSegments` and `position`), and the `undo` commit renames the stub test in `test/reduce.test.ts` to the empty-log case; both were needed for their pre-commit.
12. `playerUnitSchema` gains `healthSegments: z.literal([0, 1, 2, 3, 4])` and `position: z.number().int().positive()`; `healthSegments` is computed from the real HP for every column, so an enemy at 2/10 HP shows 1 segment without HP reaching the player.

## Differences from the renders

None; the brief names no renders.

## Dependencies needed

None.

## Left undone

None.

## Processes left running

none
