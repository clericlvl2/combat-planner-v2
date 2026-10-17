# Brief: fix-6

Batch `fix-6`, phase 6 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
It closes the `6-docker` guard findings. Rules: `CLAUDE.md` (all sections).
Inputs:
- the guard file `.claude/artifacts/guard/6-docker.md` (findings 1–3, 8, 9);
- the report `.claude/artifacts/reports/6-docker.md`;
- `apps/server/src/main.ts`, `packages/api/src/env.ts`, `.env.example`,
  `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `README.md`.

`fix-5` runs at the same time in `packages/api/src/hono-client.ts`,
`packages/api/src/live/**`, `packages/ui/**` and `e2e/auth.spec.ts`. This batch
touches none of them.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-6`, branch
  `agent/fix-6`. Work only inside that path.
- Tool-call limit: 200. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed.
- Docker is unavailable here: no `docker` commands.
- Port 3000 is shared. Before starting a server, wait until `ss -ltn` shows
  3000 free. Never kill a process you did not start. Never print a secret.

## Units, in this order, one commit each

1. `secrets` (`fix(server): secrets`), `apps/server/src/main.ts`,
   `apps/server/src/**/*.test.ts`, `packages/api/src/env.ts`,
   `packages/api/test/**`, `.env.example`:
   - with `NODE_ENV=production`, the server refuses to start when
     `BETTER_AUTH_SECRET` or `LINK_SECRET` is missing, shorter than 32
     characters, or equal to its `.env.example` value. The message names the
     variable, never its value;
   - an OAuth provider with only one of its id and secret set fails at start
     with a message naming the missing variable, in every mode, not only in
     production. A provider with neither stays off;
   - `.env.example` keeps placeholders that the production check rejects;
   - tests cover each case. In development the random fallback stays as it is.
2. `Dockerfile` (`chore(docker): Dockerfile`), `Dockerfile`, `.dockerignore`:
   - `VITE_SOURCE_URL` and `VITE_DONATE_URL` become build `ARG`s, exported to
     the web build stage;
   - `.dockerignore` excludes `.env` and `.env.*` at any depth (`**/.env`,
     `**/.env.*`, keeping `!.env.example`);
   - the production stage copies only what the server runs: no root
     `package.json` or `pnpm-workspace.yaml` unless Node's module resolution
     needs them (say which in the report), and no test files.
3. `compose` (`chore(docker): compose`), `docker-compose.yml`: `build.args`
   passes `VITE_SOURCE_URL` and `VITE_DONATE_URL` from `.env` through
   compose's variable interpolation.
4. `README` (`docs(docker): README`), `README.md`:
   - the production block puts a «set the secrets» step between copying
     `.env.example` and `compose up`, with a generator command
     (`openssl rand -hex 32`), and states the start-up refusal truthfully;
   - OAuth: set both values of a pair or neither;
   - the About URLs are build arguments;
   - `/data` needs a named volume or a directory writable by uid 1000.

## Allowed paths

As listed per unit. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. These exit 0:
   - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
   - `pnpm test`;
   - `pnpm build`;
   - `pnpm storybook:build`.
2. Production start with the `.env.example` secrets exits non-zero, naming the
   variable. With generated secrets it starts and `/api/health` answers 200.
   The report shows both runs and their status lines, with no secret value.
3. A half-configured OAuth provider fails at start, naming the variable.
4. `pnpm e2e` still passes. Its server runs without `NODE_ENV=production`.
5. Four commits with the subjects above, inside their paths; no comments;
   trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`. If `REPORT.md` cannot be written, return
its full text as the final message. Otherwise the hand-back message is the
path only.
