# REPORT: 3-server-schema

## Commits

- `98542e7` feat(api): schema
- `975008c` feat(api): migrations
- `49b569a` feat(api): client-hono
- `5c3a233` feat(server): server main

## Checks run

- `pnpm install --frozen-lockfile` — ok; `pnpm install` once after adding `better-sqlite3` and `@types/better-sqlite3` to `packages/api/package.json` (lockfile importer entry only, no new package in the store).
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` — pass before every commit; final run: 193 files formatted, 86 files with no lint or type errors, `tsc -b` clean, `check-stories` 11, `check-i18n` 9, `check-screenshots` 11 (no `.docker-*` marker, accepted by the variable), `check-comments` none, `check-domain-tests` 84.
- `pnpm test` — pass before every commit; final run: 28 files, 525 tests (unit + storybook).
- `pnpm exec vp test --project unit packages/api/test/db.test.ts` — 13 pass (WAL on, foreign keys on, one row per table round-trips, unique `actionId` per combat, case-insensitive tag uniqueness per owner, cascade on user delete).
- `pnpm exec vp test --project unit packages/api/test/hono-client.test.ts` — 17 pass (401/403/404/409/422/400 mapping with the body message, network failure retryable, `dispatch` result `{ version }`, `play.dispatch` query and header, schema rejection, connection states connected → reconnecting after 10 s → connected with refetch, final event closes the stream, `play.subscribe` URL, offline without `EventSource`).
- `pnpm exec vp test --project unit apps/server/src/app.test.ts packages/api/src/app.test.ts` — 5 pass (fresh database migrated, second start on the same file leaves `__drizzle_migrations` at 1 row, `/api/health` 200, `index.html` for client routes, `/events` gone).
- `pnpm build` — exit 0.
- `bash scripts/check-commit.sh master..agent/3-server-schema` — 4 commits pass.
- Acceptance 1 smoke, from `apps/server`: `DATABASE_PATH=$(mktemp -d)/data/combat-planner.db timeout 25 node --env-file-if-exists=../../.env src/main.ts` (the `dev` script minus `--watch`); `curl -s -w ' HTTP %{http_code}' http://localhost:3000/api/health` → `{"status":"ok"} HTTP 200`; `data/` was created with `combat-planner.db`, `-wal` and `-shm`; log: `BETTER_AUTH_SECRET is not set; a random value is used for this run`, same for `LINK_SECRET`, then `server listening on http://localhost:3000`. The process exited by `timeout`; ports 3000, 5173, 6006 verified free afterwards. `pnpm dev` itself was not used for the smoke: the permission system denied the command that would stop its process group.

## Questions

1. `action_log.seq` "autoincrement per combat": SQLite `AUTOINCREMENT` only exists for a lone rowid column, so `seq` is a plain integer in a composite primary key `(combatId, seq)` with a unique index on `(combatId, actionId)`. `3-server-actions` assigns `seq = max(seq) + 1` per combat inside its write transaction.
2. Auth paths in `createHonoApiClient`: no wrapper routes are in the plan, so the client calls Better Auth's own handler paths under `baseUrl`: `POST /auth/sign-up/email` (`name` = `displayName`), `POST /auth/sign-in/email`, `POST /auth/sign-out`, `GET /auth/get-session`, and maps `user.{id,email,name,language}` to `Session` (`language` defaults to `en`). If `3-server-rest` wraps auth in its own routes, only the `auth` block of `hono-client.ts` changes.
3. Player SSE identity: a browser `EventSource` cannot set `X-Player-Id`, so `play.subscribe` opens `GET /play/:id/events?t=<token>&playerId=<id>`; `play.get` and `play.dispatch` send the `X-Player-Id` header and `?t=` as the plan says. `3-server-live` must read `playerId` from the query on the events route.
4. Link token format: `PlayApi` methods receive only the token, and the play routes are `/play/:id`, so the client takes the combat id as the leading ULID of the token (`/^[0-7][0-9A-HJKMNP-TV-Z]{25}/`). The `link` unit must put the combat id first in the token, e.g. `<combatId>.<generation>.<hmac>`.
5. SSE payload shape: the client parses every `message`, `document`, `deleted` and `linkRevoked` event's `data` with the `ApiEvent` shape from `client.ts`, so the JSON must carry `type` (`document` with `version` and `document`, `deleted` with `title`, `linkRevoked`). Documents whose `version` is not above the last delivered one are dropped; on a reopen after an error the client refetches and delivers the fetched document when its version is ahead.
6. Secrets in `main.ts`: with `NODE_ENV=production` a missing `BETTER_AUTH_SECRET` or `LINK_SECRET` throws; otherwise a random per-run value is used with a warning, so `pnpm dev` starts on a bare checkout. `BETTER_AUTH_URL` defaults to `http://localhost:<PORT>`. An empty-string variable counts as unset, which is why `.env.example` leaves the four provider values empty; a provider with only one of id/secret set fails `apiEnvSchema` at startup.
7. HTTP statuses outside the brief's mapping (5xx and other 4xx) become `ApiError` with code `invalid` and the real `status`; `ApiErrorCode` has no server-error code.
8. `apps/server` `dev` and `start` scripts now pass `--env-file-if-exists=../../.env`, so a root `.env` copied from `.env.example` is read without a loader dependency.
9. `packages/api/tsconfig.json` includes only `src`, so `packages/api/test/**` is type-checked by `vp check` (tsgolint) but not by `tsc -b`; the tsconfig is outside this batch's paths and was left as is.
10. Without an `EventSource` implementation (Node 24.12 has no global one; `@types/node` declares none) `subscribe` returns a no-op and `connection.state()` stays `offline`; the `eventSource` option takes any constructor, and the test injects a stub, so the `eventsource` package was not added.
11. Better Auth tables use the camelCase column names its CLI emits; `user.language` is the extra column, default `en`. The `rateLimit` table is not created (Better Auth stores rate limits in memory by default).
12. `presets` carries `updatedAt` next to `createdAt` because the domain `Preset` has both; the brief listed `createdAt` only.
13. `createApiApp({ db, env })` publishes both as Hono context variables (`c.get('db')`, `c.get('env')`, type `ApiAppEnv`) for the sub-apps of the next batches.

## Differences from the renders

None; this batch has no renders.

## Dependencies needed

None.

## Left undone

None.

## Processes left running

none
