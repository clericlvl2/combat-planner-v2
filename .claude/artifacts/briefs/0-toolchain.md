# Brief: 0-toolchain

Batch `0-toolchain`, phase 0 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
Rules: `CLAUDE.md` at the worktree root. Spec: plan sections «Фаза 0 — тулчейн,
спайк» and «Гейт и версии»; `docs/vision.md` sections Stack, Monorepo, Dev, Tests.
No handoff pages and no renders are needed for this batch.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/0-toolchain`, branch
  `agent/0-toolchain`. Work only inside that path.
- Tool-call limit: 150. At the limit, write `REPORT.md` with what works and what
  does not, stop every process, hand back.

## Environment

- Node 24: `source ~/.nvm/nvm.sh && nvm use 24` in every shell (v24.12.0 is
  installed; the shell default is 22). pnpm 10.27 is on the path.
- Docker: `/var/run/docker.sock` is `root:docker` and this user is not in the
  `docker` group, so every `docker` command fails with `permission denied`. There
  is no passwordless sudo. Do not try to fix this. Write `screenshots:update` for
  the pinned image anyway; when `docker run` fails with permission denied,
  generate the `Hello` baseline with the local Playwright browser, write no
  `.docker-*` marker, and record both facts in `REPORT.md` under Left undone and
  Questions.
- Latest stable versions: `pnpm view <pkg> version` before pinning. The `vp` binary
  is published as `vite-plus` (verify with `pnpm view vite-plus version`).

## Units, in this order, one commit each

Subjects `chore(toolchain): <unit>`:

1. `workspace`: `pnpm-workspace.yaml`, root `package.json` with scripts `check`,
   `test`, `storybook`, `storybook:build`, `build`, `dev`, `screenshots:update`,
   `e2e`, `status`; `.nvmrc` = `24`; `tsconfig.base.json`; TS project references;
   every dependency from `docs/vision.md` Stack plus the test dependencies
   (`vitest`, `@vitest/browser-playwright`, `playwright`, `@playwright/test`,
   `@storybook/addon-vitest`, `@storybook/react-vite`, `@storybook/addon-docs`,
   `storybook`); `.gitignore` additions the toolchain needs.
2. `vitest projects`: `vite.config.ts` with projects `unit`, `storybook`, `visual`;
   the `visual` project takes screenshots of composed stories with
   `toMatchScreenshot`, baselines in `packages/ui/__screenshots__/<Name>/`;
   `screenshots:update` runs the `visual` project inside the pinned
   `mcr.microsoft.com/playwright:v<X>-noble` image and writes
   `packages/ui/__screenshots__/.docker-<tag>`.
3. `storybook`: Storybook 10 with `@storybook/react-vite`, `@storybook/addon-docs`,
   `@storybook/addon-vitest`; `@storybook/addon-mcp` and
   `storybook-addon-remix-react-router` only when they install cleanly with
   Storybook 10 and React Router 7; CSF factories, or CSF3 with
   `setProjectAnnotations` in `setupFiles` when factories do not work with
   addon-vitest.
4. `skeletons`: `packages/domain`, `packages/api`, `packages/ui`, `apps/web`,
   `apps/server`, each with one test or one story; `apps/web` with Vite proxy
   `/api` → `http://localhost:3000`; `apps/server` Hono with `/api/health` and
   `/api/events` (SSE, one tick per second), static files from `apps/web/dist`;
   `packages/ui` story `Hello` with its baseline in
   `packages/ui/__screenshots__/Hello/`.
5. `scripts`: `scripts/check-comments.mjs`, `scripts/check-commit.sh`,
   `scripts/status.sh`, behaviour per `CLAUDE.md` Checks. `check-commit.sh` size cap
   counts changed lines excluding `pnpm-lock.yaml` and `**/__screenshots__/**`.
   `status.sh` must not fail when `docker` is unreachable: print the error line and
   continue.
6. `CLAUDE.md commands`: fill sections Commands, Versions, Dependencies of
   `CLAUDE.md`. Commands lists the `pre-commit`, `gate` and `phase-gate` command
   lines, plus `screenshots:update`, `dev`, `status`. Versions records every
   decision of the tree below with the chosen branch. Dependencies lists every
   installed package.

## Decision tree, each outcome recorded in CLAUDE.md Versions

- `vp` ^1.1 as the single binary. When `vp test` does not run Vitest projects with
  the browser provider after two attempts, call `vitest --project` directly and
  keep the rest on `vp`.
- CSF factories with addon-vitest. When they fail, CSF3 with
  `setProjectAnnotations` in `setupFiles`.
- `visual` project through browser Vitest `toMatchScreenshot`. When browser
  Vitest does not take screenshots, a Playwright test runner over Storybook's
  `index.json`, same baseline directory.
- `storybook-addon-remix-react-router` and `@storybook/addon-mcp`: install only
  when they resolve with React Router 7 and Storybook 10; otherwise record "not
  installed" with the resolution error.
- Mantine 9: `styles.layer.css`, `postcss-preset-mantine`, `postcss-simple-vars`.

## Allowed paths

Everything under the worktree except `docs/**`, `.claude/**`, and `CLAUDE.md`
outside its sections Commands, Versions, Dependencies. `REPORT.md` at the worktree
root is gitignored and is written continuously.

## Pre-commit

Before each commit, once the scripts exist: `pnpm check` and `pnpm test` (type
check and the unit tests); for the first commit, `pnpm install --frozen-lockfile`
must succeed. Commands as they are recorded in `CLAUDE.md` Commands.

## Acceptance criteria

1. From a fresh clone, `pnpm install --frozen-lockfile` then `pnpm check`,
   `pnpm test`, `pnpm storybook:build`, `pnpm build` all exit 0.
2. `pnpm dev` starts web on 5173 and server on 3000; `GET /api/health` through the
   proxy returns 200; `GET /api/events` through the proxy streams one SSE event per
   second in a browser.
3. Story `Hello` in `packages/ui` has a baseline in
   `packages/ui/__screenshots__/Hello/` and `pnpm screenshots:update` regenerates
   it byte-identically on the same engine.
4. `pnpm screenshots:update` runs the pinned Playwright image; when the socket is
   not accessible, `REPORT.md` says so under Left undone and Questions.
5. `CLAUDE.md` sections Commands, Versions, Dependencies are filled; every branch of
   the decision tree has a recorded outcome.
6. `scripts/check-comments.mjs` exits non-zero with the path on a planted `//`
   comment in `packages/domain/src/`; `scripts/check-commit.sh master..HEAD`
   passes on the batch's own commits; `scripts/status.sh` prints branch, port and
   container state without exiting non-zero.
7. Six commits with the unit subjects above, nothing else on the branch.

## Hand-back

Stop every process on 5173, 3000, 6006, 9222 and every labelled container.
`REPORT.md` sections per `CLAUDE.md`. The hand-back message is the `REPORT.md`
path only.
