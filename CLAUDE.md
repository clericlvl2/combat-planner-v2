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
  `scripts/check-{stories,i18n,screenshots,comments}.mjs`.
- `pnpm exec vp check --fix`: format and apply lint fixes.
- `pnpm test`: Vitest projects `unit` (Node) and `storybook` (every story with its `play`, headless
  Chromium, in the `narrow` frame and viewport, 320×568).
- One file: `pnpm exec vp test --project unit <path>` or `pnpm exec vp test --project storybook <path>`.
- `pnpm exec vp test --project visual`: compares every story against
  `packages/ui/__screenshots__/<Name>/<ExportName>.png` at 390×844.
- `pnpm screenshots:update`: regenerates those baselines with the local Chromium.
- `pnpm e2e`: Playwright against the real server and a temporary database; port from `E2E_PORT`,
  default 3000.
- `pnpm build`: the web bundle into `apps/web/dist`.
- `pnpm storybook` (port 6006), `pnpm storybook:build`.
- `node scripts/test/run.mjs`: proves each check script fails on its fixtures in `scripts/test/`.
- `docker compose up --build`: the production image on port 3000.

## Architecture

- `packages/domain`: pure combat model. `types.ts` (units, roles, conditions, health statuses),
  `schemas.ts` (Zod, `LIMITS`), `actions.ts` and `reduce.ts` (every combat change is an action
  reduced into a patch), `undo.ts`, `sort.ts` (turn order), `authorize.ts` (what a DM or a player
  may do). No I/O.
- `packages/api`: the Hono app and its client.
  - `app.ts` mounts sub-apps: `auth` (Better Auth, email plus optional Google/GitHub), `combats`
    (CRUD, `actions` dispatch, `events` SSE), `link` (signed player links), `play` (player view
    and hero claims), `presets`, `tags`, `settings`, `account`, `health`.
  - `db/` is Drizzle over better-sqlite3; migrations in `drizzle/`.
  - `live/` holds the per-combat subscriber registry and the SSE stream.
  - `client.ts` defines the `ApiClient` interface and its Zod schemas; `hono-client.ts` implements
    it over HTTP and SSE, including reconnect and refetch repair.
- `packages/ui`: every component and screen, built on Mantine.
  - `atoms/`, `molecules/`, `organisms/`, `screens/`; `hooks/` wrap TanStack Query around
    `ApiClient`.
  - `api/FakeApiClient.ts` and `scenarios.ts` seed screen stories without a server.
  - `theme.ts` and `layout.ts` hold the tokens; `cssVariablesResolver` publishes them as CSS
    variables (e.g. `--cp-tap-target`).
  - `i18n/<locale>/<Namespace>.json` for `en de es fr ja ru`.
  - `storybook/` holds the decorators (`PhoneFrame`, `withApi`, `withLocale`, `withDocsTheme`) and
    `geometry.ts`.
- `apps/web`: the SPA. `router.tsx` (React Router data mode, session loaders, DM language
  follower), `providers.tsx`, `pages.tsx`.
- `apps/server`: Node entry. It loads `.env`, creates or reads `secrets.json` next to the
  database, serves the API under `/api` and the built web app. It runs TypeScript through Node type
  stripping, with no build step.
- `e2e/`: Playwright specs.

Internal packages are imported from source (`@combat-planner/*` → `./src/index.ts`) through
workspace links and TS project references. Relative imports carry the `.ts`/`.tsx` extension.

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
- Visual states come from real pseudo-classes and `data-*` attributes (`&:active, &[data-pressed]`),
  never from a `state` prop.
- Screen stories seed state through `FakeApiClient` scenarios and play only their own interaction.
  `UiProvider` takes `motion: 'off'` in Storybook.
- Geometry invariants run after every story (`packages/ui/.storybook/preview.tsx` → `expectGeometry`):
  no horizontal overflow, tap targets at least `layout.tapTarget` (44 px), content inside the phone
  frame, no unintended truncation, overlays aligned with the frame, no Latin or Cyrillic word split
  across lines (`wordBreaks`), every `[data-sheet-action]` of an open sheet visible without scrolling
  (`actionsVisible`), a drawer scrim strip at least `layout.tapTarget` wide (`scrimTarget`). A story
  opts out per check through `parameters.geometry`, with a reason string or
  `{ reason, except: '<selector>' }`. The selector must match an element.
- The storybook project renders every story at `layout.viewports.narrow` (320×568); the Storybook
  toolbar switches the frame to `phone` (390×844). `packages/ui/src/storybook/narrow-known.ts` is a
  ratchet of `{ story, check }` entries, sorted by story id, that fail only at `narrow`; `check` is a
  geometry check or `play`. An unlisted failure fails the story, and a listed entry that passes fails
  it with "remove from narrow-known". A `play` that fails at 320 because of a layout defect is wrapped
  in `playKnownAtNarrow` and listed with `check: 'play'`; a `play` that is wrong is fixed.
- Tap areas smaller than their control use the `::after` pattern
  `inset: min(0px, (100% - var(--cp-tap-target)) / 2)` on a positioned control.
- Screenshot baselines change only together with a change in the component they show. Run
  `pnpm screenshots:update`, then check each changed PNG. `check-screenshots` requires one baseline
  per story and 390-wide screen baselines. Byte-identical PNGs in one folder must be listed in
  `<Name>.same.txt`.
- Format: Oxfmt, `singleQuote`, `printWidth: 100`.
- Commits: Conventional Commits whose subject states the user-visible result, e.g.
  `fix(ui): the ru restart label fits its button`. Types `feat`, `fix`, `perf`, `revert` show in
  the changelog; `docs`, `chore`, `test`, `refactor`, `ci`, `build` do not.
- Branches: work on `dev`; `main` receives release merges only.

## Versions

- `vite-plus` 1.3.0 provides the one binary `vp`. `vite` is overridden to
  `npm:@voidzero-dev/vite-plus-core@1.3.0` and `vitest` to 5.0.5 in `pnpm-workspace.yaml`. Test
  code imports from `vite-plus/test` and `vite-plus/test/browser`.
- Storybook 10.6 with `@storybook/addon-vitest`. Its runner resets each story to the Storybook
  `viewport` global, so the 320×568 test viewport is set in `preview.tsx` (`initialGlobals`
  `frame: 'narrow'`, `viewport: 'narrow'`), not in `vite.config.ts`. The `visual` project stays at
  390×844: `vite.config.ts` sets its viewport and `test/visual.test.tsx` runs each story with the
  `phone` frame and viewport globals.
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
- **AC / PD / MD**: Armor Class, Physical Defense, Mental Defense.
- **HP, temp HP**: hit points and temporary hit points; every change is recorded in the HP history.
- **Health statuses** (`healthStatus.ts`): `full`, `wounded`, `staggered` (below half max HP), `dead`.
- **Conditions**: charmed, confused, dazed, fear, helpless, hampered, shocked, stuck, stunned,
  vulnerable, weakened.
- **Player link**: a signed URL (and QR) for one combat. A player opens it and **claims** their hero.
  Players see enemy names, health statuses and conditions, never enemy HP or defenses. Revoking
  the link, or clearing the combat, releases every claim.
