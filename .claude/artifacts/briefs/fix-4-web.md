# Brief: fix-4-web

Batch `fix-4-web`, phase 4 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
It closes the `4-web` guard findings. Rules: `CLAUDE.md` (all sections).

Inputs:
- the guard file `.claude/artifacts/guard/4-web.md`, which carries the anchors
  and the failure scenarios;
- the report `.claude/artifacts/reports/4-web.md`;
- `docs/vision.md` Navigation (Drawer, dialogs trap focus), Settings (language).

`5-e2e` runs at the same time and writes `e2e/*.spec.ts` and `e2e/helpers.ts`.
This batch touches only `e2e/teardown.ts` in `e2e/`.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-4-web`, branch
  `agent/fix-4-web`. Work only inside that path.
- Tool-call limit: 200. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed.

## Units, in this order, one commit each

Every behaviour fix comes with a test that fails on the old code, named in the
report with the file:line of the fix.

1. `MessageScreen` (`fix(ui): MessageScreen`),
   `packages/ui/src/organisms/MessageScreen/**`: the root element carries
   `data-system-screen`. A story asserts it. Baselines do not change.
2. `swipe` (`fix(web): swipe`), `apps/web/src/**`:
   - no swipe starts while a Sheet, Dialog or Drawer is open, wherever the
     pointer lands, scrim and gutter included. Detect an open modal in the
     document, not only an `[aria-modal]` ancestor of the target;
   - no swipe starts while an element with `data-system-screen` is mounted;
   - tests in `edgeSwipe.test.ts` (or a new `*.test.ts`) cover both.
3. `router test` (`test(web): router test`), `apps/web/src/**`: a route that
   throws renders `RouteError`, and `RouteError` maps to UnexpectedError. Assert
   the rendered element tree or the component, not the route config.
4. `locale` (`fix(web): locale`), `apps/web/src/**`: leaving the DM routes or
   the player route restores the browser language (primary subtag, `en`
   fallback) on auth and system pages. Test: a DM in `ru` signs out, and
   sign-in uses the browser language.
5. `teardown` (`fix(e2e): teardown`), `e2e/teardown.ts` and
   `playwright.config.ts`: teardown removes the e2e directory only when the
   config created it, never one passed in through `COMBAT_PLANNER_E2E_DIR`.

## Allowed paths

As listed per unit. Nothing else in `packages/**`, `e2e/*.spec.ts` or
`e2e/helpers.ts`.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`; for units 2–5 also
`pnpm build && pnpm e2e`.

## Acceptance criteria

1. These exit 0:
   - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
   - `pnpm test`;
   - `pnpm build`;
   - `pnpm storybook:build`;
   - `pnpm exec vp test --project visual` without `--update`;
   - `pnpm e2e`.
2. Every finding 1–5 of the guard is closed with file and line, and each has a
   test that fails on the old code.
3. No listener on 3000 or 5173 after the hand-back.
4. Five commits with the subjects above, each inside its paths; no comments;
   trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`. If `REPORT.md` cannot be written, return
its full text as the final message. Otherwise the hand-back message is the
path only.
