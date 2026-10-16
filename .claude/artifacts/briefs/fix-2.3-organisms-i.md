# Brief: fix-2.3-organisms-i

Batch `fix-2.3-organisms-i`, phase 2.3 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
the agent of `2.3-organisms-i` fixes the guard findings on PlayerRow and
MessageScreen. Common rules: `.claude/artifacts/briefs/_phase-2-common.md`.
Original brief: `.claude/artifacts/briefs/2.3-organisms-i.md`. Guard:
`.claude/artifacts/guard/2.3-organisms-i.md`. Report and accepted decisions:
`.claude/artifacts/reports/2.3-organisms-i.md`, progress file
`.claude/artifacts/2026-10-16-handoff-build-progress.md` («Вопросы владельцу»,
bullet 2.3-organisms-i). Visibility rules: `docs/vision.md` Roles → Visibility
for players; `packages/domain/src/project.ts`.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-2.3-organisms-i`,
  branch `agent/fix-2.3-organisms-i`. Work only inside that path.
- Tool-call limit: 150.

## Units, in this order, one commit each

1. `fix(ui): PlayerRow`:
   - The row enforces the visibility table by role, independent of which
     fields the `PlayerUnit` carries: for `role === 'enemy'` no HP numbers,
     no temp, no defenses, no claimer name, and `mine` never applies (no
     expand, no HP button); story `ExtraEnemyWithFields` feeds an enemy that
     carries `hp`, `maxHp`, `tempHp`, `ac`, `pd`, `md`, `claimedBy` and
     `mine` and asserts none render and nothing fires (guard finding 1).
   - Stories build `PlayerUnit`s with `project()` from
     `@combat-planner/domain` instead of a local copy of the rules (finding 2).
   - An `ExtraLocaleFr` and `ExtraLocaleEs` story render the expanded own row
     and assert every trigger label fits (`scrollWidth <= clientWidth`); if a
     label does not fit, shorten the translation (finding 4).
   - Baselines regenerated only where pixels change.
2. `fix(ui): MessageScreen`: the cell stories `LinkRevoked` and `De` end
   without a focus ring (the click proof moves to an `Extra` story or blurs
   before the screenshot), matching the page cells (finding 3).

## Allowed paths

`packages/ui/src/organisms/PlayerRow/**`, `packages/ui/src/organisms/MessageScreen/**`,
`packages/ui/src/i18n/<lng>/{PlayerRow,MessageScreen}.json`,
`packages/ui/__screenshots__/{PlayerRow,MessageScreen}/**`. Nothing else.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm exec vp test
   --project visual -t 'PlayerRow|MessageScreen'` without `--update`, `pnpm
   storybook:build` exit 0.
2. Guard findings 1–4 closed with file and line in the report; finding 1 is
   proven by a `play` that fails on the old component.
3. Two commits `fix(ui): PlayerRow`, `fix(ui): MessageScreen`, each touching
   only its folder, its i18n files and its baselines; no comments; trailer as
   in `CLAUDE.md`.

## Hand-back

Report per `CLAUDE.md` «REPORT.md». If writing `REPORT.md` is blocked, return
the full report as the final message.
