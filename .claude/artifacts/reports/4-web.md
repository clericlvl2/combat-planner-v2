# REPORT 4-web

(Returned as the agent's final message; the Write tool refused REPORT.md. Saved by the orchestrator.)

## Commits

- 0fe6914 feat(web): router
- a936dbd feat(web): providers
- 230b52e feat(web): player identity
- 2c968f0 feat(web): drawer
- 4bf464a test(e2e): smoke e2e

## Checks run (after resume, on 130f90d)

- `pnpm install --frozen-lockfile`, `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: passed.
- `pnpm test`: passed, 2098 tests.
- `pnpm build`: passed.
- `pnpm e2e`: passed, 1 test, against the built server.
  - DM: sign up, create a combat, add the Hero «Aria», Start, Next turn (round 2).
  - Player, in a second context: open the Share link, enter «Pat», check Aria, Join.
  - The player sees Round 2, Aria and «You».
  - The spec passed unchanged after the Sheet fix.
- `pnpm storybook:build`: passed, before the rebase.
- `bash scripts/check-commit.sh master..HEAD`: passed, 5 commits.

Question 1 is resolved by 130f90d. Nothing is left undone.

## First hand-back (4 of 5 units), kept for reference


- b3dad41 feat(web): router
- fcf850d feat(web): providers
- e8f800e feat(web): player identity
- cb87941 feat(web): drawer
- Unit 5 `smoke e2e` is not committed. Its pre-commit `pnpm e2e` is red on the UI defect in Questions 1. The files are left uncommitted in the worktree:
  - `playwright.config.ts`, `e2e/smoke.spec.ts`, `e2e/teardown.ts`;
  - `.env.example` with `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173`;
  - `apps/server/.env.example`, deleted and staged;
  - `apps/server/src/main.ts`, which reads `STATIC_ROOT` (default `apps/web/dist`).

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: passed.
- `pnpm test`: passed, 113 files, 2097 tests.
- `pnpm build`: passed.
- `pnpm storybook:build`: passed.
- `bash scripts/check-commit.sh master..HEAD`: passed, 4 commits.
- `pnpm exec vp test --project unit apps/web`: passed, 5 files, 50 tests.
- `pnpm e2e`: failed. Sign-up lands on an empty `/combats`. The click on `New combat` at `e2e/smoke.spec.ts:16` times out because `<div class="… mantine-Modal-root"></div>` intercepts pointer events.

## Questions

1. P0 `packages/ui/src/organisms/Sheet/Sheet.tsx:61-74` and `Sheet.module.css:1-5`.
   - Mantine 9 `ModalBase` renders the root `Box` even while the modal is closed. `Sheet` uses `withinPortal={false}` and styles that root `position: fixed; inset: 0; z-index: 200`, so every mounted, closed Sheet covers the viewport.
   - In the built app nothing under it can be clicked. Stories miss it because testing-library clicks do not hit-test.
   - Possible fixes: render `Modal.Root` only while open or closing, set `pointer-events: none` while empty, or portal it.
2. The root `vite.config.ts` unit project collects only `apps/*/src/**/*.test.ts` and runs in node without a DOM. So the router test is `router.test.ts`, and the guards are route loaders. The test asserts final locations, route ids, leaf screen components and `loaderData` (`combatId`, `token`, `playerId`). The swipe test drives `watchEdgeSwipe` with synthetic pointer events on an `EventTarget`.
3. The root `package.json` has no `version`, so About shows `0.0.0`. That file is outside the allowed paths.
4. The `VITE_SOURCE_URL` and `VITE_DONATE_URL` defaults are placeholders copied from `About.stories.tsx`, documented in the root `.env.example` (`envDir: '../..'`).
5. Screens keep their Drawer state internally (`PageScreen.tsx:20`, `CombatList.tsx:118`, `Library.tsx:133`), and `CombatScreen` has no Drawer.
   - The swipe opens a separate app-level Drawer in `DmPages` (`apps/web/src/pages.tsx`), and it does not start inside `[aria-modal="true"]`.
   - System screens rendered inside a DM route (CombatNotFound, CantReachServer in `/combats/:id`) still accept the swipe.
6. The guards read the session under query key `['session']`, which repeats the UI's unexported `queryKeys.session`.
   - The DM guard uses `ensureQueryData`; the guest guard uses `fetchQuery` with `staleTime: 0`.
   - When the server is unreachable, both guards let the page render.
7. A player link without `?t=` renders LinkExpired.
8. Locale:
   - DM routes take it from `/api/settings` through `DmLocale` (`i18n.changeLanguage`).
   - The player route takes it from the combat document.
   - Auth and system pages use the browser language (primary subtag), with `en` as fallback.
9. `DrawerSection` is not exported from `packages/ui/src/index.ts`. `apps/web/src/sections.ts` derives it as `ComponentProps<typeof Drawer>['current']`.

## Differences from the renders

- None checked; the batch adds no visual components.
- `root.css` sets `--cp-layout-status-bar: env(safe-area-inset-top, 0px)` and `body { touch-action: pan-y pinch-zoom; }`. `index.html` adds `viewport-fit=cover`.

## Dependencies needed

None outside CLAUDE.md Dependencies. `apps/web` adds `@fontsource/noto-sans-jp`, `@fontsource/rubik`, `@fontsource/unbounded` and `ulid`, all listed for `packages/ui`. The lockfile change is in `providers`.

## Left undone

- Unit 5 `smoke e2e`: uncommitted and red. The steps after `New combat` have never run against the app.
- Criteria 1 (`pnpm e2e` green) and 5 (five commits) are not met.
- `App.tsx`, `health.ts` and `health.test.ts` were removed in `providers`, because they called `fetch` directly.

## Processes left running

none
