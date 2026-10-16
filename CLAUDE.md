# Combat Planner v2 — rules for agents

## Sources

- `docs/vision.md`: behavior, data, limits, stack, architecture.
- `docs/design/handoff/`: visuals, layout, component tree, states. Read-only.
  `docs/design/handoff-errata.md` lists the lines of the bundle that do not apply.
- `docs/design/renders/<Name>.png` and `<Screen>-<FLOW>.png`: the handoff pages
  rendered in a browser. The brief names the renders to match.
- `.claude/plans/2026-10-16-build-combat-planner-v2.md`: the build plan.
- `.claude/artifacts/briefs/<batch>.md`: the agent's own brief.
- `packages/ui/src/atoms/Button/`: the reference component. Every component copies
  its file layout, story layout, play style, i18n layout and CSS conventions.
- `docs/archive/`: not a source.
- A question that the sources do not answer never stops the work: the agent builds
  per vision.md, then the handoff, and writes the question into `REPORT.md`.

## Documents and who writes them

| Document | Writer | When | Otherwise |
|----------|--------|------|-----------|
| `docs/vision.md` | orchestrator | between phases, on an owner answer, commit `docs(vision): <topic>` | frozen |
| the plan | orchestrator | between phases, a dated bullet under «Решения владельца» | frozen; criteria of a started phase never change |
| progress file `.claude/artifacts/2026-10-16-handoff-build-progress.md` | orchestrator | after every dispatch, report, gate, merge, guard | agents never |
| `.claude/artifacts/briefs/<batch>.md` | orchestrator | before dispatch, committed on `master` | frozen after dispatch |
| `REPORT.md` at the worktree root | the batch agent | continuously; final before the hand-back | gitignored; orchestrator copies it to `.claude/artifacts/reports/<batch>.md` |
| `.claude/artifacts/guard/<batch>.md` | orchestrator, from guard-bee output | after merge | frozen |
| `.claude/run/<batch>/*.log` | orchestrator | gate runs | gitignored |
| this file, sections Commands, Versions, Dependencies | phase-0 agent, one commit `chore(toolchain): CLAUDE.md commands` | phase 0 | frozen; one pre-written edit at tag `phase-0.5` adds the check scripts to `check` |
| `packages/ui/src/i18n/<lng>/<Name>.json` | the agent that owns `<Name>` | with the component's commit | `packages/ui/src/i18n/REVIEWED.md`, owner only, lists namespaces the owner read |
| `packages/ui/__screenshots__/<Name>/` | the agent that owns `<Name>`; a fix batch | with the component's commit, generated in Docker | never changed without a change under `src/**/<Name>/` in the same commit |
| `docs/archive/`, `docs/design/handoff/`, reports and reviews in `.claude/artifacts/` | nobody | | frozen |

## Branches and worktrees

- `master` is integrated by the orchestrator only. No agent commits to it.
- One batch, one agent, one branch, one worktree. Branch `agent/<batch>`, worktree
  `../combat-planner-v2.wt/<batch>`; batch names are in the plan, e.g.
  `2.1-atoms-a`, `3-server-actions`, `fix-2.2`. The orchestrator creates both from
  `master` and passes the worktree path in the brief; the agent works only inside
  that path and runs `pnpm install --frozen-lockfile` there first.
- At most two batch agents run at the same time.
- Tags `phase-<N>` mark `master` after the last batch of a phase is merged and
  guarded with no open P0–P1.
- Agents never push, never touch `master`, never rebase, never amend after a
  hand-back, never delete branches, never run `git worktree`.

## Commits

- One commit per unit of work. Units are named in the plan and in the brief; the
  commit subject is the unit name. UI: one component or screen with its stories,
  screenshots and six i18n files. Domain: one module with its tests. Server: one
  sub-app with its tests. Phase 0: `workspace`, `vitest projects`, `storybook`,
  `skeletons`, `CLAUDE.md commands`. Phase 4: `router`, `providers`,
  `player identity`, `drawer`, `smoke e2e`. Phase 5: one commit per scenario
  group. Phase 6: `Dockerfile`, `compose`, `README`.
- Message: `<type>(<scope>): <unit>`; types `feat`, `fix`, `test`, `chore`,
  `docs`; scopes `toolchain`, `domain`, `ui`, `api`, `server`, `web`, `e2e`,
  `docker`. Last line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- No work-in-progress commits. Nothing outside the paths listed in the brief. A
  UI commit touches one component folder, its i18n files and its screenshots; a
  commit over 1500 changed lines fails the gate.
- Pre-commit, run by the agent: type check and the unit's own tests or stories,
  commands in Commands below.

## Checks

Three levels. Commands in Commands below.

- `pre-commit`: agent, before each commit: type check, the unit's tests or stories.
- `gate`: orchestrator, per batch on the rebased branch: `check`, `test`,
  `storybook:build`, `build`, plus the scripts in `scripts/check-*.mjs`.
- `phase-gate`: `gate` plus `e2e`, from phase 5 on, before a phase tag.

Scripts in `scripts/`, each exits non-zero with the offending path:

- `check-stories.mjs`: every cell label of `<Name>.dc.html` and every flow code of
  a screen page has an exported story with that name; extra stories carry the
  prefix `Extra`; a component whose page has a Flow section has at least one
  `play`; every `play` contains `expect(`; `.only`, `.skip`, `tags: ['!test']`,
  `expect(true)` and a sole `toBeDefined()` fail; an edge-case story contains at
  least one non-ASCII literal from its page.
- `check-i18n.mjs`: six locale files per namespace with the same keys; no empty
  value; a non-en value equal to the en value fails unless the key is listed in
  `packages/ui/src/i18n/allow-same.txt`; `ru` values contain Cyrillic, `ja` values
  contain CJK.
- `check-screenshots.mjs`: baseline count equals story count per component; no two
  byte-identical PNGs in one component folder unless listed in `<Name>.same.txt`;
  screen baselines are 390 wide; `__screenshots__/.docker-<image-tag>` marker
  present; no `toMatchScreenshot` threshold overrides.
- `check-comments.mjs`: no `//` or `/*` in hand-written `src/**` and `test/**`
  `.ts`, `.tsx`, `.css` except `// eslint-disable-next-line`, `// @ts-expect-error`,
  `/// <reference`, `// @vitest-environment`. Generated files, `drizzle/**`,
  `*.config.*`, `*.cjs` are exempt.
- `check-commit.sh <range>`: subject format, unit name present in the plan or
  brief, path scope, size cap.
- `status.sh`: per `agent/*` branch: ahead/behind `master`, merged or not,
  worktree dirty, `REPORT.md` present, newest file mtime, gate log present;
  listeners on the agent ports; labelled Docker containers.

## Integration, orchestrator only

1. Agent hands back: one line with the `REPORT.md` path. Orchestrator copies the
   report to `.claude/artifacts/reports/<batch>.md`, updates the progress row.
2. `git rebase master` in the agent's worktree. A conflict goes back to the same
   agent with "resolve only in your paths"; the agent hands back again.
3. `gate` on the branch, commands in background with logs in `.claude/run/<batch>/`.
4. `git merge --ff-only agent/<batch>` into `master`. One integration at a time.
5. guard-bee on `master`, range `<previous merge>..HEAD`, against the batch's
   acceptance criteria; output one line per criterion `CRIT <n> PASS|FAIL
   <file:line>`; saved to `.claude/artifacts/guard/<batch>.md`. P0–P1 open a
   `fix-<batch>` batch for the same agent in a new worktree.
6. Branch and worktree deleted after a clean guard.

## Code

- No comments in code, scope and exceptions as in `check-comments.mjs`. Names,
  types, tests and stories carry the meaning.
- Visual states are driven by real pseudo-classes and `data-*` attributes:
  selectors `&:active, &[data-pressed]`; stories set the `data-*` attribute. No
  `state` prop that only switches looks.
- Stories of screens seed the state through `FakeApiClient` scenarios and play
  only the step's own interaction. The UI provider takes `motion: 'off'`, which
  disables timers and transitions; Storybook sets it.
- Internal packages are imported from source through workspace links and TS
  project references. Nothing is packed.

## Processes

- Everything an agent starts that outlives a command — dev server, Storybook,
  `serve`, a Docker container, a browser — is stopped before the hand-back.
- Agent ports: web 5173, server 3000, Storybook 6006, browser 9222. A process the
  owner runs by hand uses other ports.
- Docker containers started by agents carry the label `combat-planner=agent`.
- `scripts/status.sh` prints listeners on the agent ports and `docker ps` filtered
  by that label; the orchestrator runs it before every dispatch and before every
  integration and stops what it finds.
- `scripts/status.sh` prints listeners on the agent ports and `docker ps`
  filtered by that label; the orchestrator runs it before every dispatch and
  before every integration and stops what it finds by pid.

## REPORT.md

Sections, in this order: Commits (hash, subject); Checks run (command, result);
Questions; Differences from the renders; Dependencies needed; Left undone;
Processes left running, allowed value `none`. Nothing else. Written before the
hand-back; the hand-back message is the path only.

## Commands

Every shell first runs `source ~/.nvm/nvm.sh && nvm use` (Node 24 from `.nvmrc`).
All commands run from the worktree root.

- Install: `pnpm install --frozen-lockfile`.
- `pre-commit`: `pnpm check && pnpm test`. `pnpm check` is `vp check && tsc -b`:
  format check, Oxlint, type check through tsgolint, then `tsc -b` over the
  project references. `pnpm exec vp check --fix` formats and applies lint fixes.
  `pnpm test` is `vp test --project unit --project storybook`: the unit tests and
  every story with its `play` in headless Chromium. One unit only:
  `pnpm exec vp test --project unit <path>` or
  `pnpm exec vp test --project storybook <path>`.
- `gate`: `pnpm install --frozen-lockfile && pnpm check && pnpm test &&
  pnpm storybook:build && pnpm build`, then `node scripts/check-<name>.mjs` for
  every `scripts/check-*.mjs` and `bash scripts/check-commit.sh master..agent/<batch>`.
- `phase-gate`: `gate`, then `pnpm e2e` (`playwright test --pass-with-no-tests`).
- `pnpm screenshots:update`: `scripts/screenshots-update.sh` runs
  `vp test --project visual --update` in `mcr.microsoft.com/playwright:v<playwright
  version>-noble` with the label `combat-planner=agent`, then writes
  `packages/ui/__screenshots__/.docker-<tag>`. It is the only command that writes
  baselines; `pnpm test` does not run the `visual` project.
- `pnpm dev`: web on 5173 (`vp dev`, `/api` proxied to 3000) and server on 3000
  (`node --watch src/main.ts`).
- `pnpm storybook`: Storybook on 6006, config `packages/ui/.storybook`.
- `pnpm status`: `scripts/status.sh`, branches, agent ports, labelled containers;
  exits 0 when Docker is unreachable.

## Versions

- Node 24 (`.nvmrc`, `engines.node >=24.11.0`); pnpm 10.34.7 (`packageManager`).
- Vite+ `vite-plus` 1.3.0, one binary `vp` for dev, build, check, test. `vite` is
  overridden to `npm:@voidzero-dev/vite-plus-core@1.3.0` and `vitest` to 5.0.5 in
  `pnpm-workspace.yaml`; `better-auth>vitest: '-'` drops better-auth's optional
  `vitest` peer, which otherwise installs a second Vite. Packages that run Vite
  (`apps/web`) list the same `vite` alias and `vite-plus`.
- Decision `vp test`: kept. `vp test` runs the projects `unit` (Node), `storybook`
  and `visual` (browser, `vite-plus/test/browser-playwright`, Chromium) on the
  first attempt; `vitest --project` is not used. Test code imports from
  `vite-plus/test` and `vite-plus/test/browser`.
- Decision CSF: CSF factories with `@storybook/addon-vitest`, no `setupFiles`.
  `packages/ui/.storybook/preview.tsx` exports `definePreview(...)`; stories import
  it as `#.storybook/preview` (`imports` in `packages/ui/package.json`) and use
  `preview.meta({...})` and `meta.story({...})`; `play` asserts with `expect`
  from `storybook/test`.
- Decision visual: browser Vitest `toMatchScreenshot`; the Storybook `index.json`
  runner is not used. `packages/ui/test/visual.test.tsx` loads every
  `src/**/*.stories.tsx`, runs each story with `story.run({ canvasElement })`
  (render and `play`) and screenshots the canvas at viewport 390×844. Baseline
  path `packages/ui/__screenshots__/<Name>/<ExportName>.png` through
  `browser.expect.toMatchScreenshot.resolveScreenshotPath` in `vite.config.ts`.
  Two runs on the same Chromium produce byte-identical PNGs.
- Decision Playwright image: `playwright` and `@playwright/test` 1.64.1 exact;
  image `mcr.microsoft.com/playwright:v1.64.1-noble`, tag derived from the
  installed `playwright` version. On this machine the Docker socket is not
  accessible, so the committed `Hello` baseline comes from the local Playwright
  Chromium and has no `.docker-*` marker.
- Decision `@storybook/addon-mcp`: installed, 10.6.2, registered in `main.ts`.
- Decision `storybook-addon-remix-react-router`: installed, 7.0.0 (peer
  `react-router ^7.0.2 || ^8.0.0`, `storybook ^10.0.0`), registered in `main.ts`.
- Decision Mantine: 9.7.2. `@mantine/core/styles.layer.css` is imported in
  `packages/ui/.storybook/preview.tsx` and `apps/web/src/main.tsx`;
  `postcss.config.cjs` at the root runs `postcss-preset-mantine` 1.18.0 and
  `postcss-simple-vars` 7.0.1 with the `mantine-breakpoint-*` variables.
- Storybook 10.6.2 with `@storybook/react-vite`, `@storybook/addon-docs`,
  `@storybook/addon-vitest`.
- TypeScript 5.9.3 for `tsc -b` (TypeScript 5 per the plan). `vp check` type-checks
  with tsgolint on TypeScript Go 7; it does not match `.storybook` through an
  `include` directory entry, so `packages/ui/tsconfig.json` lists
  `.storybook/main.ts` and `.storybook/preview.tsx` by file.
- `tsconfig.base.json`: `composite`, `emitDeclarationOnly` into `.tsbuild/`,
  `moduleResolution: bundler`, `allowImportingTsExtensions`,
  `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUncheckedIndexedAccess`.
  Relative imports carry `.ts`/`.tsx`. Internal packages export `./src/index.ts`.
- `apps/server` runs TypeScript through Node type stripping, no build step.
- React 19.3.1; React Router 7.18.4 (data mode; 8.x is not used); TanStack Query
  5.104.3; Hono 4.13.13 with `@hono/node-server` 2.1.5; Zod 4.6.7; Drizzle ORM
  0.45.4 with `better-sqlite3` 13.0.3; Better Auth 1.7.10.
- Format: Oxfmt through `vp`, `singleQuote: true`, `printWidth: 100`.

## Dependencies

Workspace root, dev: `@playwright/test`, `@storybook/addon-docs`,
`@storybook/addon-mcp`, `@storybook/addon-vitest`, `@storybook/react-vite`,
`@types/node`, `@vitejs/plugin-react`, `@vitest/browser-playwright`, `playwright`,
`postcss`, `postcss-preset-mantine`, `postcss-simple-vars`, `storybook`,
`storybook-addon-remix-react-router`, `typescript`, `vite` (alias of
`@voidzero-dev/vite-plus-core`), `vite-plus`, `vitest`.

- `packages/domain`: `ulid`, `zod`.
- `packages/api`: `@hono/zod-validator`, `better-auth`, `drizzle-orm`, `hono`,
  `zod`; dev `@types/node`, `drizzle-kit`.
- `packages/ui`: `@fontsource/noto-sans-jp`, `@fontsource/rubik`,
  `@fontsource/unbounded`, `@mantine/core`, `@mantine/hooks`,
  `@tabler/icons-react`, `@tanstack/react-query`, `i18next`, `react`,
  `react-dom`, `react-i18next`, `react-qr-code`, `react-router`, `ulid`; dev
  `@types/react`, `@types/react-dom`.
- `apps/web`: `@mantine/core`, `@mantine/hooks`, `@tanstack/react-query`,
  `i18next`, `react`, `react-dom`, `react-i18next`, `react-router`; dev
  `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `vite`, `vite-plus`.
- `apps/server`: `@hono/node-server`, `better-auth`, `better-sqlite3`,
  `drizzle-orm`, `hono`; dev `@types/better-sqlite3`, `@types/node`.

Internal `@combat-planner/*` packages are linked with `workspace:*`. Only packages
outside this list are "needed" in a report.
