# REPORT fix-4-web

(The Write tool refused `REPORT.md`; the agent returned the text, saved here by the orchestrator.)

## Commits

- c82e224 fix(ui): MessageScreen
- 5ed1409 fix(web): swipe
- d504582 test(web): router test
- 99d048a fix(web): locale
- fc8c02e fix(e2e): teardown

Guard findings closed:

1. Swipe over a modal:
   - `apps/web/src/swipeGuard.ts:1-6` blocks while `[aria-modal="true"]`, `[data-scrim]` or `[data-system-screen]` is in the document; wired in at `pages.tsx:68`.
   - Tests: `swipeGuard.test.ts:58` (Sheet, Dialog, Drawer gutter), `:68` (scrim).
2. System screens:
   - `MessageScreen.tsx:32` sets `data-system-screen=""`.
   - Tests: the Anatomy story at `MessageScreen.stories.tsx:58` (fails on the old component) and `swipeGuard.test.ts:72`.
3. RouteError test:
   - `router.test.ts:197` makes a loader throw and renders with `renderToString`; it asserts `router.state.errors`, `data-system-screen` and the UnexpectedError copy.
   - `:207` asserts that `RouteError` returns UnexpectedError.
   - Test only; mutating `router.tsx:70` makes `:197` fail.
4. Locale:
   - `routeLocale.ts:23-41` `watchRouteLocale` restores the browser locale off the `dm` and `play` routes and on route errors; mounted at `main.tsx:40`.
   - Tests: `routeLocale.test.ts:57` (a DM in `ru` signs out, the page shows `de`), `:68`, `:75`.
5. Teardown:
   - `playwright.config.ts:10-16` marks the directory it creates with a global symbol; `e2e/teardown.ts:7-13` removes only that one.
   - Checked by hand only, both with an external directory and with the default.

## Checks run

- These passed:
  - pre-commit on every unit;
  - `pnpm test`, 2110 tests;
  - `pnpm build`;
  - `pnpm e2e`, 1 test;
  - `pnpm storybook:build`;
  - visual 1358 without `--update`, baselines unchanged;
  - check-commit (5 commits).
- One e2e attempt collided on port 3000 with the `5-e2e` server running at the same time.

## Questions

1. Unit 5 has no automated test. It would need `e2e/teardown.test.ts` added to the `unit` project and to `tsconfig.tooling.json`.
2. The ownership marker is a global symbol rather than an environment variable, because an environment variable can be set from outside. The key is spelled out in both files, because `tsconfig.tooling.json` does not list `teardown.ts`.
3. Commit trailer: Fable 5.1, per CLAUDE.md.

## Differences from the renders

None.

## Dependencies needed

None.

## Left undone

- Unit 5 has no automated test.
- A leftover temp directory from the manual check, `/tmp/fix4-passed-*`; `rm -rf` was refused by the permission system.

## Processes left running

none
