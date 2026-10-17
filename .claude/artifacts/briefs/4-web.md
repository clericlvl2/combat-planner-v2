# Brief: 4-web

Batch `4-web`, phase 4 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`
(section «Фаза 4 — apps/web»). Rules: `CLAUDE.md` (all sections). Sources:
`docs/vision.md` Pages (routes, redirects, system screens), Player view (Link,
Player identity), Navigation (Drawer swipe), Settings (language applies at
once), Connection, Architecture → Data flow; the UI package entry
`packages/ui/src/index.ts` (every screen, hook, `UiProvider`, `ApiProvider`,
after `fix-2.4`); `packages/api/src/hono-client.ts` (`createHonoApiClient`);
`apps/server/src/app.ts` (serves `/api` and the static web build);
`apps/web/` (current skeleton). Orchestrator decisions in
`.claude/artifacts/2026-10-16-handoff-build-progress.md` routed to `4-web`
(«Вопросы владельцу», «Замечания guard-bee P2–P3, отложены»).

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/4-web`, branch
  `agent/4-web`. Work only inside that path.
- Tool-call limit: 350. At the limit, write `REPORT.md`, stop every process,
  hand back with what is committed.

## Units, in this order, one commit each

Subjects `feat(web): <unit>` unless stated.

1. `router`: `apps/web/src/router.tsx` with React Router 7 data mode
   (`createBrowserRouter`) for every path of vision Pages: `/` → `/combats`;
   `/combats` CombatList; `/combats/:id` CombatScreen (route param as
   `combatId`); `/combats/:id/play?t=` PlayerView (`token` from the query,
   `playerId` from unit 3); `/library`, `/settings`, `/account`, `/about`;
   `/auth/sign-in`, `/auth/sign-up`; `*` NotFound; an `errorElement` with
   UnexpectedError. A DM route without a session redirects to
   `/auth/sign-in`; a signed-in user on an auth route goes to `/combats`.
   `/auth/callback/:provider` is served by the server (Better Auth
   `/api/auth/callback/*`), so the web router has no such route. Test
   `apps/web/src/router.test.tsx` with `createMemoryRouter` over every path,
   the guard both ways, and NotFound, using `FakeApiClient` from the UI
   package.
2. `providers`: `apps/web/src/main.tsx` and `apps/web/src/providers.tsx`:
   `MantineProvider` (theme from the UI package), `UiProvider` (`motion: 'on'`,
   locale from the DM's settings when signed in, from the combat document on
   the player route, browser language otherwise, falling back to `en`),
   `ApiProvider` with `createHonoApiClient({ baseUrl: '/api' })` through a
   browser-safe export `@combat-planner/api/hono-client` (add the subpath
   export in `packages/api/package.json`; the root entry pulls `node:crypto`).
   The root CSS sets `--cp-layout-status-bar` explicitly
   (`env(safe-area-inset-top, 0px)`) so headers and sheets agree. Overlays
   portal into `document.body`. `About` gets `version` from
   `import.meta.env` (the root `package.json` version through `define`),
   `sourceUrl` and `donateUrl` from `VITE_SOURCE_URL` / `VITE_DONATE_URL`
   with documented defaults.
3. `player identity`: `apps/web/src/playerId.ts` generates a ULID once and
   keeps it in `localStorage` key `combat-planner.player-id`; the player route
   passes it to PlayerView; a unit test covers first visit, reuse and a
   corrupted value.
4. `drawer`: a swipe right from the left 24 px edge opens the Drawer on DM
   pages (vision Navigation), alongside the header button; no Drawer on the
   player route and on system screens; a test drives the swipe with pointer
   events.
5. `smoke e2e` (`test(e2e): smoke e2e`): `playwright.config.ts` at the root
   (Chromium, `webServer` builds the web app and starts
   `node apps/server/src/main.ts` on port 3000 with a temporary
   `DATABASE_PATH`, `STATIC_ROOT` = the web build), and `e2e/smoke.spec.ts`:
   sign up, create a combat, add a unit, Start, Next turn, then a second
   browser context opens the share link as a player, joins with a hero and
   sees the turn order. Also: the line
   `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173` moves into the root
   `.env.example`, and `apps/server/.env.example` is deleted.

## Allowed paths

`apps/web/**`, `packages/api/package.json` (the subpath export only),
`playwright.config.ts`, `e2e/**`, `.env.example`, `apps/server/.env.example`
(delete), `apps/server/src/main.ts` only if `STATIC_ROOT` is not yet read
from the environment, `pnpm-lock.yaml` only for a dependency already in
`CLAUDE.md` Dependencies. Nothing in `packages/ui` or `packages/domain`: a
defect there goes into `REPORT.md` Questions with file and line.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`; for unit 5 also
`pnpm build && pnpm e2e`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build`,
   `pnpm storybook:build` exit 0; `pnpm e2e` runs the smoke spec green
   against the built server (not `--pass-with-no-tests` with zero tests).
2. The router test covers every vision path, both guard directions, the
   player route with token and playerId, and NotFound.
3. The app uses only the UI package's screens and hooks for data (no direct
   `fetch` in `apps/web` outside the API client).
4. Processes started by the e2e run stop when it ends; no listener remains on
   3000 or 5173 after the hand-back.
5. Five commits with the subjects above, each inside its paths; no comments.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
