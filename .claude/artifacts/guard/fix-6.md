# Guard fix-6

Range `90219cb..797a446` (secrets, Dockerfile, compose, README). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/fix-6/summary.log:2-30 — every step exits 0. e2e 21 passed, with the server in development mode. `main.test.ts` runs in `pnpm test` (+15 tests).
CRIT 2 PASS apps/server/src/main.ts:14-37,62-76; main.test.ts:109-140,162-171:
- production refuses a missing, short (< 32) or placeholder secret, naming the variable and never the value;
- generated secrets start the server;
- the old code fails 11 of the 15 tests;
- the placeholders cannot drift silently (main.test.ts:24-26,129,135-137);
- no side channel found (hypothesis).
CRIT 3 PASS main.ts:45-58 — a half OAuth pair fails in every mode and names the missing variable; neither set means off.
CRIT 4 PASS Dockerfile:14-16,27-49; .dockerignore:14-18; docker-compose.yml:6-8; README.md:55-94:
- build args reach `pnpm build`;
- `.env` is excluded at any depth, and test files are excluded;
- the root manifests are not needed at runtime;
- the README is accurate.

The Docker-run parts are unverifiable here: args in the bundle, start without the manifests, volume owned by uid 1000.
CRIT 5 PASS — four subjects, paths, trailer, no comments. No 64-character hex string in the diff, files, logs, report or `/tmp/fix6-*`.

## Findings

1. P3 main.ts:22,62-69 — swapped placeholders, or the same value in both secrets, still start; key separation is weaker.
2. P3 main.test.ts:35 — no test shows that exactly 32 characters is accepted.
3. P3 docker-compose.yml:17 — a refused start restart-loops under `unless-stopped`.
4. P3 hypothesis main.test.ts:108 — 15 servers spawn in parallel under a 30 s timeout.

## Outside the reviewed scope

5. P3 README.md:20,25-26 with main.ts:10,34 and apps/server/package.json:6-7 — after `cp .env.example .env`, `pnpm dev` and `pnpm start` load the placeholder secrets silently when `NODE_ENV` is not `production`.
6. P3 hypothesis playwright.config.ts:42-47 — a shell with `NODE_ENV=production` breaks the e2e server. This predates the batch.
7. P3 — `/tmp/fix6-*` leftovers need a manual delete.

5 pass / 0 fail; scope held.
