# Brief: 6-docker

Batch `6-docker`, phase 6 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`
(section «Фаза 6 — Docker»). Rules: `CLAUDE.md` (all sections). Sources:
- `docs/vision.md`, Architecture and Stack;
- `apps/server/src/main.ts`, which reads `PORT`, `DATABASE_PATH`, `STATIC_ROOT`,
  `BETTER_AUTH_*`, `LINK_SECRET` and the OAuth ids, and checks
  `NODE_ENV=production`;
- the root `.env.example`;
- `CLAUDE.md` Commands.

## The machine has no Docker

On this machine the Docker socket refuses access, so `docker build` and
`docker compose up` cannot run here. Do not try to work around it: no `sudo`,
no other runtime. What is checked instead:

- `pnpm build`, then the exact production command the image's `CMD` runs,
  started from a fresh `pnpm deploy`-style output directory (or whatever the
  Dockerfile copies). `NODE_ENV=production`, a temporary `DATABASE_PATH`,
  `STATIC_ROOT` as the image sets it, and secrets from `openssl rand`. Never
  print a secret value.
- With that server on port 3000: `curl -fsS localhost:3000/api/health` and
  `curl -fsS localhost:3000/` answer 200. Then stop it.
- `docker compose config` and `docker build --check` cannot run. Write the
  files so that they would pass, and say in the report that they were not run.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/6-docker`, branch
  `agent/6-docker`. Work only inside that path.
- Tool-call limit: 250. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed.

## Units, in this order, one commit each

Subject `chore(docker): <unit>`, except `docs(docker): README`.

1. `Dockerfile`: `Dockerfile` and `.dockerignore` at the root. Multi-stage on
   `node:24-slim`:
   - The build stage enables pnpm `10.34.7` through corepack, installs with
     `--frozen-lockfile` (with the build tools `better-sqlite3` needs), and
     runs `pnpm build`.
   - The production stage holds only `apps/server` with its production
     dependencies (`pnpm deploy --prod` or an equivalent) and the web build.
   - Settings: `NODE_ENV=production`, `STATIC_ROOT` pointing at the copied web
     build, `DATABASE_PATH=/data/combat-planner.db`, `EXPOSE 3000`, a
     non-root user that owns `/data`, `CMD ["node", "src/main.ts"]` (or the
     path as copied), and a `HEALTHCHECK` on `/api/health` that uses `node`,
     with no curl in the image.
   - Root `package.json`: `"version": "1.0.0"`. About reads it through
     `apps/web/vite.config.ts`; this is the routed `4-web` item.
2. `compose`: `docker-compose.yml` with one service `app`:
   - built from the root `Dockerfile`;
   - `ports: ["3000:3000"]`, `env_file: .env`, `volumes: [data:/data]`, the
     named volume `data`, `restart: unless-stopped`;
   - `BETTER_AUTH_URL` and the trusted origins come from `.env`.

   `.env.example` gets a comment-free note line only if a variable is new.
3. `README` (`docs(docker): README`): the root `README.md`.
   - What the app is, in one paragraph from vision.
   - Requirements: Node 24 via `.nvmrc`, pnpm 10.34.7.
   - Dev: `pnpm install --frozen-lockfile`, copy `.env.example` to `.env`,
     `pnpm dev` (web 5173, server 3000).
   - Storybook (`pnpm storybook`, 6006) and the flow codes; tests (`pnpm
     test`, `pnpm e2e`); screenshots (`pnpm screenshots:update`, Docker).
   - Production: `docker compose up --build`, secrets in `.env`, data in the
     `data` volume, health at `/api/health`, and OAuth callback URLs
     `<BETTER_AUTH_URL>/api/auth/callback/<provider>`.
   - Every command matches `CLAUDE.md` Commands.

## Allowed paths

`Dockerfile`, `.dockerignore`, `docker-compose.yml`, `README.md`,
`package.json` (the `version` field only), `.env.example` (a new variable
only). Nothing in `apps/**`, `packages/**` or `e2e/**`. A defect found there
goes into `REPORT.md` Questions with file and line.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check`; for unit 1 also the production run
above.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` and `pnpm build` exit 0.
2. The production command from the Dockerfile, run outside Docker as above,
   answers 200 on `/api/health` and `/`. The report shows the commands and the
   status lines.
3. The Dockerfile has the stages, user, volume path, healthcheck and `CMD`
   above. Compose has the volume, `env_file` and port. The README covers every
   section above.
4. No secret in any committed file. No listener on 3000 or 5173 after the
   hand-back.
5. Three commits with the subjects above, inside their paths; trailer as in
   `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`. If `REPORT.md` cannot be written, return
its full text as the final message. Otherwise the hand-back message is the
path only.
