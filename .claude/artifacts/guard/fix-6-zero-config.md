# Guard fix-6-zero-config

Range `4f994a0..1a014b6` (8 commits). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/fix-6-zero-config/summary.log:1-31 — gate green, test 2178, visual 1371, e2e 21 passed, no listeners.
CRIT 2 PASS apps/server/src/main.ts:58-63, 65-96, 98-121, 148-154:
- secrets resolve in the order env > `secrets.json` > generate;
- the file is created 0600 (`wx`) and published with `renameSync`, merged per key;
- a broken file → exit 1 naming the path and uid;
- short or placeholder secrets are rejected in every mode;
- no value is logged.
CRIT 3a PASS:
- packages/api/src/env.ts:11;
- apps/web/vite.config.ts:19;
- main.ts:8-9;
- apps/server/package.json:6-7;
- auth/index.ts:97;
- pnpm-workspace.yaml:19,21;
- docker-compose.yml:10-13;
- .dockerignore:19;
- README.md:8-34.
CRIT 3b UNVERIFIABLE (for the guard): the clean-clone run.
- Orchestrator, 2026-10-18: verified itself on a clone of c4e12b2 at `/tmp/cp-verify.1oa0`, host Node 22.12, no `.env`, no `nvm use`.
  - `pnpm install` exit 0, then `pnpm dev`: the secrets were generated (`secrets.json` 600).
  - Through 5173: `/api/health` 200, sign-up 200, get-session returns the user, `/` 200.
  - Both processes stopped and `pnpm dev` restarted: no generation, and the same cookie still returns the user.
  - Ports were free after the stop. → PASS.
CRIT 4a PASS main.test.ts:252-286.
CRIT 4b PASS (orchestrator, 2026-10-19, after the owner joined the `docker` group). Clean clone of c4e12b2, no `.env`.
- First `docker compose -p cpverify build`: stalled for 14 min in `node-gyp rebuild` of better-sqlite3 after the Node headers download, at 0 % CPU (transient network stall in the build). Killed.
- Second build: 47 s, exit 0.
- `up -d`: healthy.
  - `/api/health` 200, `/` 200, sign-up 200, get-session returns the user.
  - Log: `BETTER_AUTH_SECRET and LINK_SECRET generated and stored in /data/secrets.json`.
  - `/data` is owned by uid 1000, `secrets.json` 600, the process is `node` (1000).
- `restart`: healthy, no generation, the same cookie returns the user.
- Afterwards: `down -v` cleaned up, port 3000 free.
CRIT 5 PASS — 8 subjects, paths, no comments, trailer.

## Findings

1. P2→P3 Dockerfile:12-25 with pnpm-workspace.yaml:19 — the build works (see CRIT 4b). It needs nodejs.org: `useNodeVersion`, plus the node-gyp headers for better-sqlite3, which compiles from source. `useNodeVersion` now downloads Node 24.12.0 in the build stages (hypothesis), so a builder without access to nodejs.org fails.
2. P3 main.ts:68-71,117,91 — first-start race: two processes on an empty data directory can store different secrets. Fix: `linkSync` publish, with re-read on EEXIST.
3. P3 main.ts:90-91 — no fsync; a crash right after generation can leave a zero-length file, which fails closed.
4. P3 main.ts:8-9 — `loadEnvFile` runs after the imports, so Better Auth's import-time `NODE_ENV` snapshot misses `.env`.
5. P3 main.ts:9 with playwright.config.ts:35-47 — `pnpm e2e` now reads the developer's `.env`.
6. P3 README.md:74 — `PORT` in `.env` also moves the dev server, while the Vite proxy stays on 3000.
7. P3 playwright.config.ts:46 — e2e always sets `BETTER_AUTH_URL`, so the zero-config path is not covered by e2e.
8. P3 hypothesis README.md:18 — the corepack bundled with Node 22.12 may reject newer pnpm signatures.

Security:
- A spoofed `Host` without `BETTER_AUTH_URL` is not a CSRF vector: a browser sets the real `Host`, and cookies are `SameSite=Lax`.
- Residual: DNS rebinding can sign up accounts on a LAN-only server (low).
- `BETTER_AUTH_TRUSTED_ORIGINS=https://…` without `BETTER_AUTH_URL` gives a non-Secure cookie (README silent).
- `secrets.json` never reaches the image. Adding `**/secrets.json` to `.dockerignore` would also cover a custom `DATABASE_PATH`.

5 pass, 0 fail, 2 unverifiable for the guard; 3b settled by the orchestrator; scope held.
