# REPORT 0-toolchain

## Commits

- 07a47c9 chore(toolchain): workspace
- fad59ab chore(toolchain): vitest projects
- 7ede7fe chore(toolchain): storybook
- 61f8762 chore(toolchain): skeletons
- b32b54c chore(toolchain): scripts
- e178db3 chore(toolchain): CLAUDE.md commands

## Checks run

- Fresh clone of `agent/0-toolchain` in a temporary directory, Node 24.12.0, pnpm 10.34.7:
  `pnpm install --frozen-lockfile` exit 0; `pnpm check` exit 0; `pnpm test` exit 0
  (5 files, 10 tests: unit plus the `Hello` story with its play); `pnpm storybook:build`
  exit 0; `pnpm build` exit 0; `pnpm exec vp test --project visual` exit 0 (the
  committed `Hello` baseline matches); `node scripts/check-comments.mjs` exit 0.
- Before every commit in the worktree: `pnpm check` and `pnpm test`, both exit 0.
- `pnpm dev`: web on 5173, server on 3000. `curl http://localhost:5173/api/health`
  returned 200 `{"status":"ok"}`. `curl -N http://localhost:5173/api/events` received
  ticks 0–3 one second apart. Headless Chromium (Playwright) opened
  `http://localhost:5173/`, the page showed `API: ok`, and an `EventSource('/api/events')`
  in the page got ticks 0, 1, 2 at about 0.26 s, 1.26 s, 2.26 s. Every process stopped afterwards.
- `pnpm exec vp test --project visual --update` run twice: `Hello/Default.png` sha1
  `4a5a95f2d293668bcd01f7bf8823840cf9b191da` both times (local Chromium).
- `pnpm screenshots:update`: exit 1, `permission denied while trying to connect to the
  docker API at unix:///var/run/docker.sock`.
- `node scripts/check-comments.mjs` with a planted `packages/domain/src/planted.ts`
  (`// planted`) and a second file with a `//` inside a string and inside a regex
  plus one trailing `// tail`: exit 1, prints `packages/domain/src/planted.ts:1: // planted`
  and `packages/domain/src/planted2.ts:1: // tail`. Neither the string nor the regex was flagged.
  Planted files removed.
- `bash scripts/check-commit.sh master..HEAD`: exit 0, 6 commits pass.
  `bash scripts/check-commit.sh c921955~1..c921955`: exit 1 (subject without scope).
- `bash scripts/status.sh`: exit 0; printed the branch row, `none on 5173 3000 6006 9222`,
  and `docker unreachable: permission denied ...`.

## Questions

1. Docker socket not accessible. The `docker` group does not include this user, so
   `pnpm screenshots:update` never ran in `mcr.microsoft.com/playwright:v1.64.1-noble`.
   The committed `packages/ui/__screenshots__/Hello/Default.png` comes from the local
   Playwright Chromium, and there is no `.docker-*` marker. Running `pnpm screenshots:update`
   with Docker access replaces the baseline and writes `.docker-v1.64.1-noble`.
   Until then `check-screenshots.mjs` (phase 0.5) fails on the missing marker.
2. React Router pinned to 7.18.4 because the brief says React Router 7. The latest
   stable release is 8.4.0, and `storybook-addon-remix-react-router` 7.0.0 also accepts `^8.0.0`.
3. TypeScript pinned to 5.9.3 because the plan says TypeScript 5. The latest is 7.0.2. `vp check`
   already type-checks with tsgolint on TypeScript Go 7, so `pnpm check` runs both
   compilers: tsgolint first, then `tsc -b` on 5.9.3.
4. `pnpm test` leaves out the `visual` project. Baselines from the Docker image would
   not match a local Chromium, so the gate never compares screenshots. A Docker
   compare script (`vp test --project visual` in the same image) could cover this
   when the gate has Docker access.
5. `check-commit.sh` path scope: the Allowed paths section of a brief is prose. The script
   enforces only these generic rules:
   - no `docs/**` or `.claude/**`;
   - `CLAUDE.md` only in unit `CLAUDE.md commands`;
   - `packages/ui/__screenshots__/<Name>/` only together with `packages/ui/src/**/<Name>/`;
   - a `ui` scope commit touches at most one component folder;
   - at most 1500 changed lines, not counting `pnpm-lock.yaml` and `**/__screenshots__/**`.

   Per-brief allowed paths are not checked. A machine-readable path list in each brief would make that possible.
6. `check-comments.mjs` counts a file as generated when its name contains `.gen.` or
   `.generated.`, or its path has a `generated/` segment. The script also skips
   `*.config.*`, `*.cjs`, `drizzle/**`, and `__screenshots__/`.
7. Commit trailer: every commit ends with `Co-Authored-By: Claude Fable 5.1
   <noreply@anthropic.com>`, the line `CLAUDE.md` gives, as the dispatch instruction
   asked. This batch's model is Opus 5.5.
8. `master` has one commit that is not on this branch. The branch needs the orchestrator's rebase.

## Differences from the renders

none, this batch has no renders

## Dependencies needed

none outside `CLAUDE.md` Dependencies. `@vitejs/plugin-react` 6.1.2 is not in the vision
Stack. It is installed and listed because `apps/web` needs React Fast Refresh and the
`visual` project needs it for JSX.

## Left undone

- Acceptance 4: the pinned Playwright image was never run. `docker run` fails with
  permission denied on `/var/run/docker.sock`, so `packages/ui/__screenshots__` has no
  `.docker-*` marker.
- Acceptance 3 checked on local Chromium only (two updates, byte-identical), not
  inside the Docker image.

## Processes left running

none
