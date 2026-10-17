# Brief: fix-4-overlays

Batch `fix-4-overlays`, phase 4 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
It fixes a P0 found by the `4-web` smoke e2e. Rules: `CLAUDE.md` (all sections).
Input: `.claude/artifacts/reports/4-web.md`, Questions 1.

A closed `Sheet` leaves its Mantine `Modal.Root` box mounted. That box has
`position: fixed; inset: 0; z-index: 200` (`packages/ui/src/organisms/Sheet/Sheet.tsx:61-74`,
`Sheet.module.css:1-5`), so in the built app nothing beneath it takes a click.
On `/combats`, Playwright's click on New combat times out on «mantine-Modal-root
intercepts pointer events». Stories miss it because testing-library clicks do
not hit-test.

`fix-4` runs at the same time in `packages/**`; its units do not touch the
folders below. Never touch `apps/**`, `packages/ui/src/index.ts`,
`vite.config.ts` or scripts.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-4-overlays`,
  branch `agent/fix-4-overlays`. Work only inside that path.
- Tool-call limit: 200. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed.

## Units, in this order, one commit each

Subject `fix(ui): <Name>`.

1. `Sheet`: a closed Sheet, after its exit transition, leaves no element that
   covers the viewport or receives pointer events. Open and closing Sheets keep
   their current look, focus and scrim. Baselines do not change; if one does,
   regenerate it: delete the PNG, run `--update -t <Name>`, then run once more
   without `--update`. A story `ExtraClosedDoesNotBlock` renders a button
   under a closed Sheet. Its play asserts that `document.elementFromPoint` at
   the button's centre returns the button, and it fails on the old code.
2. `Menu`, `Dialog`, `Drawer`, `CombatHeader`: audit every overlay that
   renders with `withinPortal={false}` or a fixed full-viewport root (grep
   `packages/ui/src` for `Modal.Root`, `withinPortal`, `position: fixed`). For
   each one that blocks clicks while closed, fix it and add the same hit-test
   story, one commit per component named by its folder. If none does, write
   that under Left undone with the file:line checked, and commit nothing for
   this unit.

## Allowed paths

The folders `packages/ui/src/organisms/{Sheet,Menu,Dialog,Drawer,CombatHeader}/**`,
the same names under `packages/ui/src/molecules/**` if the component lives
there, and their baselines in `packages/ui/__screenshots__/<Name>/**`.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. These exit 0:
   - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
   - `pnpm test`;
   - `pnpm build`;
   - `pnpm storybook:build`;
   - `pnpm exec vp test --project visual` without `--update`.
2. No closed overlay intercepts a click, proved by `elementFromPoint` plays that
   fail on the old code.
3. One commit per fixed component with the subjects above, inside its paths; no
   comments; trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
