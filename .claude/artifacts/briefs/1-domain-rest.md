# Brief: 1-domain-rest

Batch `1-domain-rest`, phase 1 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
Rules: `CLAUDE.md` at the worktree root. Spec: plan sections «Решения владельца»
and «Фаза 1», block `1-domain-rest` and the «Приёмка» paragraph; `docs/vision.md`
sections Roles → Visibility for players, Combat → Undo, Architecture (Actions,
Action log, Data flow), Player view (Content, Updates), Unit → HP history. The
batch `1-domain-core` is merged on `master`; its report
`.claude/artifacts/reports/1-domain-core.md` lists the decisions it took
(questions 1–21), all accepted by the orchestrator, and this brief builds on
them. No renders.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/1-domain-rest`, branch
  `agent/1-domain-rest`. Work only inside that path.
- Tool-call limit: 200. Node 24: `source ~/.nvm/nvm.sh && nvm use`;
  `pnpm install --frozen-lockfile` first.

## Existing code

`packages/domain/src/`: `types.ts`, `schemas.ts`, `actions.ts`, `errors.ts`,
`healthStatus.ts`, `sort.ts`, `names.ts`, `reduce.ts`, `authorize.ts`, the stub
`undo.ts` (`applyUndo(combat, action, now)` returns `DomainError` `invalid`),
`index.ts`. Tests in `packages/domain/test/*.test.ts` with `fixtures.ts`, named
per the convention in the core report, question 18. Read `reduce.ts` (`apply`,
the `patch` shape: `null` for claim and release; `units[newId] = null` for an
added or duplicated unit; a removed unit snapshots the prior `units` list in
`fields.units`; otherwise per-field prior values) and `types.ts` (`PlayerCombat`,
`PlayerUnit`) before writing.

## Units, in this order, one commit each

Subjects `feat(domain): <unit>`.

1. `project`: `packages/domain/src/project.ts`. `project(combat, viewer)`:
   `viewer.kind === 'dm'` returns the combat unchanged; a player receives
   `PlayerCombat` built from the vision table «Visibility for players» column by
   column (Own Hero = `claimedBy === viewer.playerId`; Other Hero, Ally; Enemy),
   disabled units left out, `units` in turn order when `status === 'active'`
   and in insertion order in setup, each `PlayerUnit` carrying `healthStatus`
   and `healthSegments` precomputed so the client never needs hidden HP. A
   field hidden by the table is absent from the object, not `null`. The
   projection of a combat where the player claims nothing is the Enemy /
   Other column view for every unit. `PlayerUnit` and `PlayerCombat` in
   `types.ts` / `schemas.ts` are adjusted to this (add `healthSegments`,
   `position`), nothing else in them changes.
2. `undo`: `packages/domain/src/undo.ts` replaces the stub. `LogEntry = { action,
   author: Viewer, at, patch: Patch | null, undoneBy: ActionId | null }`;
   `undoTarget(log: LogEntry[]) → LogEntry | DomainError` walks the log from the
   newest entry backwards per vision Action log 10 (newest undoable entry not
   already undone; an entry without a patch stops the walk with `DomainError`
   `blocked`; depth 10 counted in undoable entries from the newest action,
   beyond it `DomainError` `blocked`); `applyUndo(combat, action, now, log) →
   { combat, patch: null, undone: ActionId } | DomainError` reverts the target's
   patch (fields and units, including restoring a removed unit at its prior
   position and dropping an added one), bumps `version`, and leaves the target
   marked for the caller to set `undoneBy`. `apply` in `reduce.ts` gains the
   fifth parameter `log: LogEntry[] = []` and passes it to `applyUndo`; the
   undo action's own log entry carries no patch. Player actions are undone the
   same way as DM actions; only the DM may dispatch `undo` (already in
   `authorize.ts`; keep).
3. `index`: `packages/domain/src/index.ts` exports `project`, `undoTarget`,
   `applyUndo`, `LogEntry`, `Patch` and every public symbol of the package in
   one place, grouped by module; nothing exported twice; `healthSchema` and
   `tickSchema` stay.
4. `tests`: `packages/domain/test/project.test.ts` (one test per row of the
   visibility table per column, named `<Field> | <Column>`, plus «Disabled
   units are not sent to players» and a walk over every key of every projected
   unit asserting no hidden key is present for any column),
   `packages/domain/test/undo.test.ts` (vision Undo bullets and Action log 8–10
   verbatim, depth 10, claim/release stop, undo of a removed unit restores
   position, undo of a player action by the DM, `version` bump, second undo
   skips the undone entry), and `scripts/check-domain-tests.mjs`: reads
   `docs/vision.md` tables «Transitions», «Unit → Actions», «Visibility for
   players» and the «Unit → Rules» list, and the plan's «Решения владельца»
   bullets about combat behaviour, and fails with the missing name when no test
   in `packages/domain/test/**` is named by that row (first cell verbatim, the
   `<first cell> | <cell>` form for rule cells, `<Field> | <Column>` for
   visibility) or that sentence; prints the offending source line. Root
   `package.json` `check` adds `node scripts/check-domain-tests.mjs`;
   `CLAUDE.md` Commands line of `pre-commit` lists it; `scripts/check-commit.sh`
   allows `CLAUDE.md` in the unit `tests`. A fixture under
   `scripts/test/domain-tests-missing/` and a case in `scripts/test/run.mjs`.

## Allowed paths

`packages/domain/src/**` (not `health.ts`, `health.test.ts`),
`packages/domain/test/**`, `scripts/check-domain-tests.mjs`,
`scripts/check-commit.sh`, `scripts/test/**`, root `package.json` (`check`
only), `CLAUDE.md` Commands section only. Nothing else.

## Tests

Import only from `../src/index.ts`. Every branch of `project.ts` and `undo.ts`
has a test. A commit stays under 1500 changed lines; split a test file rather
than trim coverage.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build`,
   `node scripts/check-domain-tests.mjs`, `node scripts/test/run.mjs` exit 0.
2. Every row of «Transitions», «Unit → Actions» and «Visibility for players»
   and every sentence of «Unit → Rules» has a test with that name, enforced by
   `scripts/check-domain-tests.mjs`, which fails on a planted deletion.
3. `project` never places a hidden field in a player's document: a test
   enumerates every key of every projected unit for Own Hero, Other Hero, Ally
   and Enemy and compares with the table; disabled units are absent.
4. `applyUndo` reverts the newest undoable entry, stops at claim/release and at
   depth 10, skips undone entries, restores removed units at their position, and
   bumps `version`; `apply(combat, { type: 'undo' }, dm, now, log)` reaches it.
5. `packages/domain/src/index.ts` exports every public symbol once.
6. Four commits `feat(domain): project`, `feat(domain): undo`,
   `feat(domain): index`, `feat(domain): tests`; no comments.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
