# REPORT 6-docker

## Commits

- cb93fbc chore(docker): Dockerfile
- 5b0d510 chore(docker): compose
- 40fdccd docs(docker): README

## Checks run

- `pnpm install --frozen-lockfile`: exit 0.
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` before each commit: exit 0 (format, lint, tsgolint, `tsc -b`, all check scripts pass).
- `pnpm build`: exit 0; the bundle contains the version `1.0.0`.
- `bash scripts/check-commit.sh master..HEAD`: `check-commit: 3 commit(s) in master..HEAD pass`.
- Production run outside Docker, reproducing the image layout from the Dockerfile in a temp directory `/tmp/cp6docker.8TN1`:
  - prod-deps stage: the six manifests plus `pnpm-lock.yaml` and `pnpm-workspace.yaml` copied, then `pnpm install --frozen-lockfile --prod --filter @combat-planner/server...` (126 packages);
  - production stage: `node_modules`, `apps/server`, `packages/api` (with `drizzle/`), `packages/domain` sources, `apps/web/dist` copied to the paths the Dockerfile uses;
  - port 3000 confirmed free with `ss -ltn`, then from `apps/server`: `env -i PATH HOME NODE_ENV=production PORT=3000 DATABASE_PATH=<tmp>/data/combat-planner.db STATIC_ROOT=<tmp>/app/apps/web/dist BETTER_AUTH_SECRET=$(openssl rand -hex 32) LINK_SECRET=$(openssl rand -hex 32) BETTER_AUTH_URL=http://localhost:3000 node src/main.ts`;
  - log: `server listening on http://localhost:3000, database /tmp/cp6docker.8TN1/data/combat-planner.db`;
  - `curl -fsS -i localhost:3000/api/health` -> `HTTP/1.1 200 OK`, body `{"status":"ok"}`;
  - `curl -fsS -i localhost:3000/` -> `HTTP/1.1 200 OK`, body starts `<!doctype html>` with `<title>Combat Planner</title>`;
  - the `HEALTHCHECK` command run verbatim with `node -e` -> exit 0;
  - server stopped by its pid; `ss -ltn` showed 3000 free afterwards.
- Not run, no Docker access on this machine: `docker build`, `docker build --check`, `docker compose config`, `docker compose up`.

## Questions

- `.env.example` sets `DATABASE_PATH=data/combat-planner.db` and `PORT=3000`. With `env_file: .env` that relative path would override the image's `/data/combat-planner.db` and point outside the volume, into a directory the non-root user cannot write. `docker-compose.yml` therefore sets `DATABASE_PATH: /data/combat-planner.db` and `PORT: '3000'` under `environment`, which take precedence over `env_file`.
- `pnpm deploy --prod` was not used: it places the workspace packages under `node_modules`, and Node refuses type stripping for `.ts` files under `node_modules`, while `@combat-planner/api` and `@combat-planner/domain` export `./src/index.ts`. The equivalent used is a `prod-deps` stage with `pnpm install --frozen-lockfile --prod --filter @combat-planner/server...`, which keeps the workspace links to `packages/api` and `packages/domain` outside `node_modules`.

## Differences from the renders

None; no UI in this batch.

## Dependencies needed

None.

## Left undone

- `docker build`, `docker build --check`, `docker compose config` and `docker compose up` were not run (no Docker socket access).
- The temp directory `/tmp/cp6docker.8TN1` and the file `/tmp/cp6docker.path` remain; `rm -rf` was denied by the permission system. Contains no secrets (secrets were passed as environment only); the SQLite file there is a fresh empty database.

## Processes left running

none
