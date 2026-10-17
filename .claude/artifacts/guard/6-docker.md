# Guard 6-docker

Range `63e0843..44f4f04` (Dockerfile, compose, README). guard-bee, Opus 5.5 xhigh, read-only. Docker is unavailable on this machine: files judged by reading.

CRIT 1 PASS .claude/run/6-docker/summary.log:4-5,12-13 — check and build green.
CRIT 2 PASS Dockerfile:17-23, 26-29, 32-40, 44, 48 match the report's production run. The two 200 answers rest on the agent's report. That run skipped the `.dockerignore`-filtered web build, running as `node`, and the `/data` ownership.
CRIT 3 PASS — Dockerfile:
- `node:24-slim` multi-stage; corepack pnpm 10.34.7 with `--frozen-lockfile`; build tools.
- The native module is built on the runtime base.
- Migrations land at the path `migrate.ts:5` expects; `STATIC_ROOT` is set.
- `USER node` owns `/data`; `EXPOSE`; node `HEALTHCHECK`; `CMD`.

`.dockerignore`, compose and the README sections are all present, and the README commands match the scripts.
CRIT 4 PASS — no secret in the diff; `.env` is excluded and the production stage copies explicit paths. Listener sub-clause: see the orchestrator note.
CRIT 5 PASS — three subjects, paths, `version` only in `package.json`, trailer.

Orchestrator note: `scripts/status.sh` after the hand-back showed no listener on the agent ports. The `agent/6-docker` branch was deleted by `merge.sh` at merge time, as with every batch (an accepted integration practice).

## Findings

1. P2 README.md:53-60 with .env.example:3,5 — `cp .env.example .env && docker compose up` starts production with the published placeholder secrets. They pass `secret()` (main.ts:11-14) and `apiEnvSchema` (`min(1)`, env.ts:10,12), so anyone can forge player links, and possibly sessions (hypothesis). The README also falsely says the server refuses to start without secrets.
2. P3 README.md:26-27 — when only one of an OAuth id/secret pair is set, `apiEnvSchema` throws, and with `restart: unless-stopped` the container restart-loops.
3. P3 apps/web/vite.config.ts:11, .dockerignore:14, Dockerfile:12-14 — `VITE_SOURCE_URL` and `VITE_DONATE_URL` never reach the image's bundle, and the README is silent about it.
4. P3 hypothesis — `/data` permissions break with a bind mount, a pre-existing root-owned volume, or rootless runtimes.
5. P3 hypothesis — the build needs network for corepack, the dockerfile frontend and `better-sqlite3` prebuilds.
6. P3 hypothesis — native ABI: no failure found; the base tag is unpinned.
7. P3 hypothesis — no file missing from the build context found; whether `vp build` needs `.git` is unchecked.
8. P3 .dockerignore:14-15 — `.env` is matched only at the root, so a nested `.env` enters the build cache.
9. P3 Dockerfile:31,36 — the production stage carries the root `package.json`, `pnpm-workspace.yaml` and `app.test.ts`.

5 pass / 0 fail; scope held.
