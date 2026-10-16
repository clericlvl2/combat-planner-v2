# Brief: fix-1-domain-core

Batch `fix-1-domain-core`, phase 1 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
the guard findings of `1-domain-core` and `1-domain-rest`
(`.claude/artifacts/guard/1-domain-core.md`, `.claude/artifacts/guard/1-domain-rest.md`).
Rules: `CLAUDE.md` at the worktree root. Spec: `docs/vision.md` Unit → Fields,
Unit → Rules, Combat list (Duplicate), Roles → Visibility for players, Player
view → Content; plan «Решения владельца».

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-1-domain-core`,
  branch `agent/fix-1-domain-core`. Work only inside that path.
- Tool-call limit: 80. Node 24: `source ~/.nvm/nvm.sh && nvm use`;
  `pnpm install --frozen-lockfile` first.

## Units, one commit each

1. `fix(domain): setMaxHp floor`: `packages/domain/src/reduce.ts`
   `setMaxHpOf` and the `editUnit` path clamp HP into `[−newMax, newMax]` after
   the cut (vision Unit → Fields «Current HP −max … 999»); a test in
   `packages/domain/test/reduce.test.ts` with HP −8, max 10 → setMaxHp 4 gives
   HP −4, plus the same through `editUnit`; the result passes `unitSchema`.
2. `fix(domain): copy keeps disabled`: `copyCombat` in `reduce.ts` keeps each
   unit's `disabled` (vision Combat list Duplicate lists what the copy resets;
   `disabled` is not among them); the test at `reduce.test.ts` that encodes the
   reset is changed to assert preservation.
3. `fix(domain): player document`: `project` nulls `activeUnitId` when the
   active unit is not in the player's `units`; the player document omits
   `linkGeneration` (`PlayerCombat` type and `playerCombatSchema` in
   `types.ts` / `schemas.ts` drop it); tests in `project.test.ts` for both; the
   test name at `undo.test.ts:254` is corrected to describe its body.

## Allowed paths

`packages/domain/src/**` (not `health.ts`, `health.test.ts`),
`packages/domain/test/**`. Nothing else; `scripts/**`, `CLAUDE.md`, `docs/**`,
`.claude/**` are out of scope.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` (incl. `check-domain-tests`),
   `pnpm test`, `pnpm build` exit 0.
2. `apply(setMaxHp)` and `apply(editUnit)` never leave HP outside
   `[−maxHp, maxHp]`; tests prove it.
3. `copyCombat` preserves `disabled`; test proves it.
4. A player document never contains `linkGeneration`, and `activeUnitId` is
   `null` when the active unit is hidden; tests prove both.
5. Three commits with the subjects above; no comments; every existing test
   name required by `check-domain-tests.mjs` still present.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
