# CLAUDE.md

This file guides Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Combat Planner is a 13th Age combat tracker for in-person play. The DM prepares combats and runs
them from a phone; players follow on their own phones through a link or QR code. One server hosts
many DMs, each with a private account and library. pnpm monorepo, Node 24, React 19 + Mantine 9 on
the client, Hono + SQLite on the server.

## Commands

Every shell first runs `source ~/.nvm/nvm.sh && nvm use` (Node from `.nvmrc`). All commands run
from the repository root.

- `pnpm install --frozen-lockfile`
- `pnpm dev`: web on http://localhost:5173 (`/api` proxied) and server on http://localhost:3000.
- `pnpm check`: `vp check` (Oxfmt format check, Oxlint, type check), `tsc -b`, then
  `scripts/check-{stories,i18n,comments}.mjs`.
- `pnpm exec vp check --fix`: format and apply lint fixes.
- `pnpm test`: Vitest projects `unit` (Node; `packages/*/src`, `packages/*/test`, `apps/*/src`
  `*.test.ts` and `scripts/*.test.mjs`) and `storybook` (every story once with its `play`,
  headless Chromium, locale `ru`, the `narrow` frame and viewport, 320×568).
- One file: `pnpm exec vp test --project unit <path>` or `pnpm exec vp test --project storybook <path>`.
- `pnpm e2e`: Playwright at 320×568 against the real server and a temporary database; port from
  `E2E_PORT`, default 3000. `e2e/sharing.spec.ts` runs against a second server on `E2E_PORT + 1`
  with `COMBAT_PLANNER_TEST_TIMERS=1` (shortened sharing timeouts). `e2e/layout.spec.ts` runs at
  440×956.
- `pnpm build`: the web bundle into `apps/web/dist`.
- `pnpm storybook` (port 6006), `pnpm storybook:build`.
- `node scripts/test/run.mjs`: proves `check-stories` and `check-i18n` fail on their fixtures in
  `scripts/test/`.
- `docker compose up --build`: the production image on port 3000.

## Architecture

- `packages/domain`: pure combat model. `types.ts` (units, roles, conditions, health statuses),
  `schemas.ts` (Zod, `LIMITS`), `actions.ts` and `reduce.ts` (every combat change is an action
  reduced into a patch), `undo.ts`, `sort.ts` (turn order), `authorize.ts` (what a DM or a player
  may do), `project.ts` (the player's view of a combat), `sharing.ts` (link and player states and
  their sweep timeouts), `combatFile.ts` (`toCombatFile` exports the combat as `restartedCombat`
  leaves it; `fromCombatFile` imports it under new ids). No I/O.
- `packages/api`: the Hono app and its client.
  - `app.ts` mounts sub-apps: `auth` (Better Auth, email plus optional Google/GitHub),
    `auth-providers` (the configured social sign-ins), `combats` behind `requireUser` (CRUD,
    `actions` dispatch, `events` SSE, and `link`: `/combats/:id/link`, `/link/reissue`,
    `/link/stop` for signed player links), `play` (player view and hero claims), `presets`,
    `tags`, `settings`, `account`, `health`, `errors` (`POST /api/errors`, client error reports).
    `onError` stores unhandled server errors through `errors/store.ts` `recordError`.
    `rate-limit.ts` budgets requests per minute and address (`actions`, `events`, `general`,
    `errors`).
  - `sharing/` holds link and connected-player state and closes DM streams of ended sessions;
    `stats/` the daily usage counts (`Europe/Moscow` days) read by the admin page.
  - `db/` is Drizzle over better-sqlite3; migrations in `drizzle/`. `action_log` holds the undo
    stack only; `applied_actions` (`combats/applied.ts`) holds the ids of the last
    `LIMITS.repeatWindow` applied actions of a combat, including claims, releases and undos, so a
    repeated action id answers 200 with the current version and changes nothing.
  - `live/` holds the per-combat subscriber registry and the SSE stream.
  - `client.ts` defines the `ApiClient` interface and its Zod schemas; `hono-client.ts` implements
    it over HTTP and SSE, including reconnect and refetch repair.
  - `contract/apiClientContract.ts`, exported as `@combat-planner/api/contract`:
    `describeApiClientContract`, one `ApiClient` suite run against `createHonoApiClient` over the
    in-process app (`test/contract.test.ts`, `test/inProcess.ts`) and against `FakeApiClient`
    (`packages/ui/test/api/FakeApiClient.contract.test.ts`). The server is the reference: a case
    failing on Fake is fixed in Fake.
- `packages/ui`: every component and screen, built on Mantine.
  - `atoms/`, `molecules/`, `organisms/`, `screens/`; `hooks/` wrap TanStack Query around
    `ApiClient` and hold `useSheetDrag` (drag a sheet down to close) and `useRetained` (the last
    non-null value, for content of a closing overlay). `motion/Reveal.tsx` expands and collapses
    rows. `organisms/Drawer` is Mantine `Drawer`.
  - `api/FakeApiClient.ts` and `scenarios.ts` seed screen stories without a server.
  - `theme.ts` and `layout.ts` hold the tokens; `cssVariablesResolver` publishes them as CSS
    variables (e.g. `--cp-tap-target`). Colours derive in OKLCH from `seeds` through `color.ts`;
    `paletteVariables()` publishes them in groups (`--cp-color-*`, `--cp-role-*`, `--cp-health-*`,
    `--cp-health-tint-*`, `--cp-hp-*`, `--cp-history-temp-*`, `--cp-state-*`,
    `--cp-condition-*`, `--cp-combat-*`); `test/palette.test.ts` checks derivation, contrast and
    colour-vision separation, `storybook/ThemeAudit` shows every token. `layout.header` and its
    `--cp-header-*` variables size `PageHeader`, `CombatHeader` and `PlayerHeader` alike.
  - `i18n/<locale>/<Namespace>.json` for `en de es fr ja ru`.
  - `storybook/` holds the decorators (`PhoneFrame`, `withApi`, `withLocale`, `withDocsTheme`) and
    `geometry.ts`.
- `apps/web`: the SPA. `router.tsx` (React Router data mode, session loaders, DM language
  follower; `withViewTransitions` makes every navigation a view transition), `providers.tsx`,
  `pages.tsx`, `errorReports.ts` (uncaught errors and rejections to `POST /api/errors`, each
  message once, at most 5 per page load, never an `ApiError`).
  - `main.tsx` passes `guestAtBoot` when `<html>` carries `data-boot="guest"`; `router.tsx` then
    hydrates the `home` route with `GUEST_BOOT`, so the landing renders on the first frame. In
    `pnpm dev` the `guestBoot` plugin in `apps/web/vite.config.ts` answers `GET /` like
    `apps/server/src/landing.ts`.
  - `root.css` makes `#root` the phone column: at most 440×956, the size container `screen` and,
    like `.phone` in Storybook, the containing block of the fixed overlays; screen roots stay
    direct children of `#root`. A window wider than 440 shows the column as a phone frame
    (`box-shadow` rings in `--cp-color-border` and `--cp-color-surface`, height
    `min(100dvh - 64px, 956px)`) on a dotted `--cp-color-field` field. `main.tsx` always portals
    `DesktopAside` into `#aside`; `root.css` shows it from 1180 wide, left of the column. A
    screen root with `data-landing` fills the window, without frame or aside. During a view
    transition a pinned screen header (`PageHeader`, a direct child of the screen root) takes
    `view-transition-name: header` unless a `[data-scrim]` is open; `CombatHeader` and
    `PlayerHeader` sit inside the screen's `ScrollList` under a fixed `StatusStrip`
    (`screens/shared/StatusStrip.tsx`) and cross-fade with the page. Transitions run on
    `--cp-page-transition-duration` / `-easing` and are off under `prefers-reduced-motion`.
- `apps/server`: Node entry. It loads `.env`, creates or reads `secrets.json` next to the
  database, serves the API under `/api` and the built web app. It runs TypeScript through Node type
  stripping, with no build step.
  - `landing.ts`: `GET /` answers a signed-in session with 302 to `/combats` and a guest with
    `index.html` marked `data-boot="guest"`, both with `Cache-Control: no-store` and
    `Vary: Cookie`.
  - `sweeper.ts` runs every minute (`timers.ts`): marks a player link orphaned while its owner
    has no live session and turns it off after `LIMITS.orphanedLinkMinutes`; drops players
    watching without a hero past `LIMITS.watchingMinutes` and player streams without an action
    for `LIMITS.idleStreamHours`; closes DM streams of ended sessions; deletes daily stats and
    error reports past retention.
  - With `ADMIN_PAGE=1`: the status page `/admin` (`src/admin/`, version from `APP_VERSION`,
    default `dev`) and `GET /api/health/checks` (200 while no check is red, else 503); without
    it both answer 404. `/admin` has no login of its own.
- `e2e/`: Playwright specs.

Internal packages are imported from source (`@combat-planner/*` → `./src/index.ts`, plus
`@combat-planner/api/client` and `@combat-planner/api/hono-client`) through workspace links and TS
project references. Relative imports carry the `.ts`/`.tsx` extension.

## Conventions

- No comments in `src/**` and `test/**` `.ts`, `.tsx` or `.css`, except directive comments
  (`// eslint-disable-next-line`, `// @ts-expect-error`, `/// <reference`,
  `// @vitest-environment`). Enforced by `check-comments`.
- Six locales with identical keys; no empty value. A non-en value equal to en needs an entry in
  `packages/ui/src/i18n/allow-same.txt`; `ru` contains Cyrillic, `ja` CJK. Enforced by
  `check-i18n`.
- Stories use CSF factories: `import preview from '#.storybook/preview'`, `preview.meta({...})`,
  `meta.story({...})`. A `play` asserts with `expect` from `storybook/test`. `check-stories` fails
  on `.only`, `.skip`, `tags: ['!test']`, `expect(true)`, a sole `toBeDefined()`, or a `play`
  without `expect(`.
- A story is visible only when it differs to the eye from the component's other visible stories
  (default, variant, size, disabled, empty, long content, error, loading, open). A `play` checks only
  the component's own behaviour; a child's pressed, focus, keyboard or close behaviour is asserted in
  the child's stories. A necessary `play` on a state already visible gets `tags: ['!dev']`: hidden
  from the sidebar, still run by `pnpm test`. Near-duplicates are deleted. No story exists for a
  locale: locale is the toolbar global.
- Story names: export names are PascalCase words; the display name (Storybook's start case of the
  export, or `name`, set only where start case garbles an abbreviation such as "HP") is at most 40
  characters. No `Extra` prefix, no codes (`CSF83`), no locale words (`Ru`, `German`), no run of 4+
  digits. A hidden story is named after the checked behaviour (`EscapeCloses`); the main story is
  `Default` unless a state name says more. A visible story sets no `globals.locale`,
  `globals.frame` or `globals.viewport`, which would lock the toolbar; a hidden story may set
  `globals.locale` when its assertion depends on it. Enforced by `check-stories`.
- Atoms and molecules whose stories multiply variant × state show one visible `AllStates` story
  built with `packages/ui/src/storybook/StateGrid.tsx`: rows are variants and sizes, columns are
  states, each cell is labelled `<Row> · <Column>` and cells wrap. States are set statically through
  the attributes the CSS reads (`data-pressed`, `data-focus`, `data-open`, `aria-invalid`,
  `disabled`). `AllStates` carries the `visual` tag (inert, see below).
- `FakeApiClient.failNext(code)` rejects the next call; `holdNext()` leaves it pending, for loading
  states; `holdNextExchange()` applies the next call at once but holds its reply and every document
  it broadcasts until `releaseReplies()`, which delivers the documents first, for sends that race
  their own reply.
- Visual states come from real pseudo-classes and `data-*` attributes (`&:active, &[data-pressed]`),
  never from a `state` prop.
- Focus rings come from the `postcss-preset-mantine` mixins in `postcss.config.cjs`:
  `@mixin focus-ring;` on the focusable control; for a ring drawn on another element,
  `@mixin focus-ring-keyboard;` under the keyboard-focus selector and `@mixin focus-ring-outline;`
  under the `[data-focus]` selector. The ring is 2 px of `--cp-state-focus` inside the control and
  shows on `:focus-visible` only under `(hover: hover) and (pointer: fine)`; on touch the pressed
  state is the only feedback. A control on a non-paper fill sets `--cp-state-focus` to its label
  colour. `-webkit-tap-highlight-color: transparent` is set once on `:root` in `theme.module.css`.
- Screen stories seed state through `FakeApiClient` scenarios and play only their own interaction.
  `UiProvider` takes `motion: 'off'` in Storybook.
- Geometry invariants run after every story (`packages/ui/.storybook/preview.tsx` → `expectGeometry`):
  no horizontal overflow, tap targets at least `layout.tapTarget` (44 px), content inside the phone
  frame, no unintended truncation (an element whose one-line or clamped ellipsis is designed carries
  `data-ellipsis` and is skipped), overlays aligned with the frame, no Latin or Cyrillic word split
  across lines (`wordBreaks`), every `[data-sheet-action]` of an open sheet visible without scrolling
  (`actionsVisible`), a drawer scrim strip at least `layout.tapTarget` wide (`scrimTarget`). A story
  opts out per check through `parameters.geometry`, with a reason string or
  `{ reason, except: '<selector>' }`. The selector must match an element.
- Screen sizes, in `packages/ui/src/layout.ts`: `viewports` holds the frames `narrow` 320×568
  (base width, Storybook default, every test), `phone` 384×832, `large` 440×956 (widest phone, size
  of the wide-window column, `column`) and `desktop` 1280×844. `ranges`: width compact 320–383,
  regular 384–440 (`regularMinWidth`); height short below 700, tall from 700 (`tallMinHeight`).
- CSS reads a range only through the size container `screen`: `@container screen (width >= 384px)`
  / `(width < 384px)`, `@container screen (height >= 700px)` / `(height < 700px)`. No `@media` for
  ranges: in Storybook it reads the iframe, not the frame. `.phone` in `PhoneFrame.module.css` is
  the container `screen`.
- Storybook and the storybook project open in `ru` at the frame `narrow` (320×568); the toolbar
  switches locale and frame (`phone`, `large`, `desktop`). No story exists per size.
- Tap areas smaller than their control use the `::after` pattern
  `inset: min(0px, (100% - var(--cp-tap-target)) / 2)` on a positioned control.
- Screenshot testing is removed: no screenshot project, no baselines. The `visual` tag stays,
  inert, marking stories for future baselines: each component's main or anatomy story, `AllStates`
  and each state that differs in layout, and each screen's main states. A new story that changes
  layout gets the tag; a story that only differs by interaction outcome stays untagged and is
  covered by its `play` and the geometry checks.
- Format: Oxfmt, `singleQuote`, `printWidth: 100`.
- Commits: Conventional Commits whose subject states the user-visible result, e.g.
  `fix(ui): the ru restart label fits its button`. Types `feat`, `fix`, `perf`, `revert` show in
  the release notes; `docs`, `chore`, `test`, `refactor`, `ci`, `build` do not.
- Branches: short-lived branches from `main`, merged into `main` through a pull request. The `ci`
  workflow runs `pnpm check`, `pnpm test` and `pnpm build` on pushes to `main` and pull requests
  into `main`, plus `pnpm e2e` on those pull requests. A release is a manual run of the `release`
  workflow on `main`: it refuses a commit without a green `ci` check, computes the version and
  notes with `scripts/release.mjs` (bump `auto` from Conventional Commits, or `patch`, `minor`,
  `major`), creates the tag and GitHub Release, then runs `docker` and `deploy` (GitHub
  environment `production`, waits for the required reviewer's approval).

## Versions

- `vite-plus` 1.4.0 provides the one binary `vp`. `vite` is overridden to
  `npm:@voidzero-dev/vite-plus-core@1.4.0` and `vitest` to 5.0.5 in `pnpm-workspace.yaml`. Test
  code imports from `vite-plus/test` and `vite-plus/test/browser`.
- Storybook 10.6 with `@storybook/addon-vitest`. Its runner resets each story to the Storybook
  `viewport` global, so the test viewport is set in `preview.tsx` (`initialGlobals` `locale: 'ru'`,
  `frame: 'narrow'`, `viewport: 'narrow'`), not in `vite.config.ts`.
- Playwright 1.64.1 exact.
- React Router 7 data mode.
- Mantine 9; `postcss-preset-mantine` runs from `postcss.config.cjs`.

## 13th Age glossary

- **Unit**: one combatant in a combat, with a **role**: `hero` (a player character, claimable by a
  player), `enemy` or `ally`.
- **Preset**: a saved unit in the DM's library, added to combats as a copy.
- **Initiative, round, turn**: units act in initiative order; a round ends when every unit has had
  its turn. A combat is in `setup` until it starts, then `active`.
- **Escalation die**: 0–6, heroes add it to attacks. It rises by one each time the turn order wraps
  to a new round, and the DM can set it directly.
- **AC / PD / MD**: Armor Class, Physical Defense, Mental Defense. Temporary modifiers `acMod`,
  `pdMod`, `mdMod` are set by the action `setDefenseMods` and cleared on restart.
- **HP, temp HP**: hit points and temporary hit points; every change is recorded in the HP history.
- **Health statuses** (`healthStatus.ts`): `full`, `wounded`, `staggered` (below half max HP),
  `unconscious` (a hero at 0 HP or below; the app never shows a hero as dead), `dead` (any other
  unit at 0 HP or below). Healing a hero below 0 HP counts from 0.
- **Conditions**: charmed, confused, dazed, fear, helpless, hampered, shocked, stuck, stunned,
  vulnerable, weakened.
- **Player link**: a signed URL (and QR) for one combat. A player opens it and **claims** their hero.
  Players see enemy names, health statuses and conditions, never enemy HP or defenses. Revoking
  the link, or clearing the combat, releases every claim.
