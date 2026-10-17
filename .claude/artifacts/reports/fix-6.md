# REPORT fix-6

## Commits

- 35e8795 fix(server): secrets
- 7bdc91c chore(docker): Dockerfile
- 221c633 chore(docker): compose
- d62ecc9 docs(docker): README

## Checks run

- `pnpm install --frozen-lockfile`: exit 0.
- Before each of the four commits, `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: exit 0 (format, lint, tsgolint, `tsc -b`, check-stories, check-i18n, check-screenshots, check-comments, check-domain-tests); `pnpm test`: exit 0, `Test Files 118 passed`, `Tests 2156 passed`.
- `pnpm build`: exit 0. `pnpm storybook:build`: exit 0, `Storybook build completed successfully`.
- `pnpm e2e` with `NODE_ENV` unset (its server runs `node apps/server/src/main.ts` in development mode on random secrets), port 3000 checked free with `ss -ltn` first: exit 0, `21 passed (1.0m)`; port 3000 free afterwards.
- Every `scripts/check-*.mjs` run alone: all pass. `node scripts/test/run.mjs`: `clean tree and 26 fixture(s) pass`.
- `bash scripts/check-commit.sh master..HEAD`: `check-commit: 4 commit(s) in master..HEAD pass`.
- `pnpm exec vp test --project unit apps/server/src/main.test.ts`: 15 passed. The same file against the previous `main.ts` (stashed): 11 failed, 4 passed (the four that already held: missing secrets in production, both start cases).
- The tests in `apps/server/src/main.test.ts` spawn `node apps/server/src/main.ts` with a minimal environment and `PORT=0`, and cover: production refuses a missing or a 31-character `BETTER_AUTH_SECRET` and `LINK_SECRET` (exit 1, message names the variable, value absent from the output); production refuses the two values read from `.env.example` (both named, values absent); a half-configured Google or GitHub pair, either half, in production and in development (exit 1, names the missing variable, value absent); production with generated secrets starts and `/api/health` answers 200 with empty stderr; development without secrets starts on random values with the existing warnings.
- Docker build reproduced without Docker:
  - build context: the working tree filtered by `.dockerignore` (771 files kept). `.env`, `apps/web/.env`, `apps/web/.env.local`, `.env.production`, `apps/server/src/app.test.ts`, `apps/server/src/main.test.ts` excluded; `.env.example` kept;
  - build stage in that context: `pnpm install --frozen-lockfile` exit 0; `VITE_SOURCE_URL=https://source.example.test/fix6 VITE_DONATE_URL=https://donate.example.test/fix6 pnpm build` exit 0, both URLs present in the bundle; with both set empty (what compose passes when `.env` leaves them blank) exit 0, the default GitHub source URL in the bundle;
  - prod-deps stage: the manifests plus `pnpm-lock.yaml` and `pnpm-workspace.yaml`, `pnpm install --frozen-lockfile --prod --filter @combat-planner/server...` exit 0;
  - production stage layout: `/app` root holds only `apps node_modules packages`, no root `package.json`, no `pnpm-workspace.yaml`; 0 test files outside `node_modules`. Node's module resolution does not need either root file: every server-run `.ts` file takes `"type": "module"` from its own package's `package.json` (`apps/server`, `packages/api`, `packages/domain`), and `@combat-planner/*` resolve through the `node_modules` symlinks and the package `exports`.
- Production runs on that layout, from `apps/server`, `env -i PATH NODE_ENV=production PORT=3000 DATABASE_PATH=<tmp>/data/combat-planner.db STATIC_ROOT=<tmp>/app/apps/web/dist node --env-file=.env.example src/main.ts` (the variables given to `env` take precedence over the file, as compose's `environment` does over `env_file`); port 3000 checked free first:
  - run 1, the `.env.example` secrets: exit 1, stdout empty, no database created, stderr:
    `BETTER_AUTH_SECRET still holds the .env.example placeholder, which NODE_ENV=production rejects; generate one with openssl rand -hex 32`
    `LINK_SECRET still holds the .env.example placeholder, which NODE_ENV=production rejects; generate one with openssl rand -hex 32`
    No placeholder value in stderr (grep count 0).
  - run 2, `BETTER_AUTH_SECRET` and `LINK_SECRET` from `openssl rand -hex 32` passed only as environment, never printed: `server listening on http://localhost:3000, database <tmp>/data/combat-planner.db`, stderr empty; `GET /api/health` -> `HTTP/1.1 200 OK`, `{"status":"ok"}`; `GET /` -> `HTTP/1.1 200 OK` with `<title>Combat Planner</title>`; the Dockerfile `HEALTHCHECK` command -> exit 0; server stopped by its pid (exit 143), port 3000 free afterwards.
  - run 3, generated secrets plus `GITHUB_CLIENT_ID` only, once with `NODE_ENV=production` and once with `NODE_ENV=development`: exit 1 both times, stderr `GITHUB_CLIENT_SECRET is required when GITHUB_CLIENT_ID is set; set both or neither`.
- Not run, no Docker on this machine: `docker build`, `docker compose config`, `docker compose up`.

## Questions

- The secret and OAuth checks live in `apps/server/src/main.ts`, not in `packages/api/src/env.ts`: a new export from `env.ts` reaches the server only through `packages/api/src/index.ts`, which is outside this batch's paths. `env.ts`, `packages/api/test/**` and `.env.example` are unchanged. The `.env.example` placeholders are already 54 and 60 characters and fail the equality rule; the two placeholder strings are repeated in `main.ts` because the image carries no `.env.example`, and `main.test.ts` reads `.env.example`, so a changed placeholder fails the test.
- All problems are collected and printed before exit, so a run with both secrets wrong names both variables at once (run 1 above).
- Test files leave the image through `.dockerignore` (`**/*.test.ts`, `**/*.test.tsx`) rather than per-file `COPY` lines; the build stage's `vp build` does not read them, shown by the filtered-context build above.
- The README secrets step is a numbered step with `openssl rand -hex 32` and an instruction to paste the two outputs into `.env`, not a `sed -i` one-liner, because `sed -i` differs between GNU and BSD sed.

## Differences from the renders

None; no UI in this batch.

## Dependencies needed

None.

## Left undone

- `docker build`, `docker compose config` and `docker compose up` were not run (no Docker access). The `/data` ownership by uid 1000 and the build args reaching the bundle inside a real `docker build` are therefore not verified in Docker; the latter is verified by the reproduction above.
- Temp files from the reproduction and logs remain; `rm -rf` was denied by the permission system: `/tmp/fix6-ctx.4Ns1` (filtered build context with `node_modules` and `apps/web/dist`) and its `.install.log`, `.build.log`, `.build2.log`; `/tmp/fix6-prod.4QbH` (production layout, a fresh SQLite database, run logs); `/tmp/fix6-scripts`; `/tmp/fix6-check-{2,3,4}.log`, `/tmp/fix6-test-{1,2,3,4}.log`, `/tmp/fix6-build.log`, `/tmp/fix6-sb.log`, `/tmp/fix6-e2e.log`. None contains a secret value: generated secrets were passed as environment only.

## Processes left running

none
