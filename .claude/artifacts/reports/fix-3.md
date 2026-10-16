# REPORT: fix-3

Delivered as the hand-back message (subagents cannot write `REPORT.md`); saved by the orchestrator.

Files: `packages/api/src/live/sse.ts`, `packages/api/test/events.test.ts`, `packages/api/test/play.test.ts`, `packages/api/src/auth/index.ts`, `packages/api/src/env.ts`, `packages/api/test/auth.test.ts`, `apps/server/src/main.ts`, `apps/server/.env.example` (new). `client.ts`, `hono-client.ts`, `db/schema.ts`, `drizzle/**` untouched.

## Commits

- `8d3c64c` fix(api): live (3 files, +134/−20)
- `b86dc34` fix(api): auth (5 files, +310/−23)

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: exit 0 before each commit.
- `pnpm test`: exit 0, 61 files, 1101 tests.
- `pnpm build`: exit 0.
- `bash scripts/check-commit.sh master..agent/fix-3`: 2 commits pass.
- New tests run against the old source: the 5 new live tests fail on old `sse.ts`; the 6 new auth tests fail on old `auth/index.ts` (200 instead of 400/404/403, ZodError "Too big … <=40"). The heartbeat test and the derived types are shown by mutation.

| Item | Test | Fails on old code because |
|---|---|---|
| live 1: request already aborted | `packages/api/test/events.test.ts:177` | `subscriberCount` 1, interval running |
| live 2: nothing accepted after a final event | `packages/api/test/play.test.ts:358` | document after `linkRevoked` delivered |
| live 3: `load()` throws | `events.test.ts:210` | subscription and interval left |
| live 3: `project()` throws | `events.test.ts:224` | subscription and interval left |
| live 4: no heartbeat before 15 s | `events.test.ts:152` | old code correct; with `HEARTBEAT_MS - 1` the new test fails, the old passed |
| Criterion 3: no leftover subscription or interval | all of `events.test.ts` (hooks :87–97), `play.test.ts` (hooks :154–163) | each test asserts `vi.getTimerCount()` 0 and `subscriberCount` 0 |
| auth 1: email sign-up over-limit or empty name → 400 `invalid`, no session | `packages/api/test/auth.test.ts:77` | 200 |
| auth 1: name at the limit (boundary) | `auth.test.ts:96` | — |
| auth 1: GitHub OAuth with mocked `fetch` clamps the profile name; session parses with `sessionSchema` | `auth.test.ts:309` | ZodError |
| auth 1: `update.before` clamps a name via `auth.api.updateUser` | `auth.test.ts:201` | ZodError |
| auth 2: `/auth/change-password`, `/auth/update-user` → 404 with a session | `auth.test.ts:228` | 200 |
| auth 2: every `auth.api` endpoint outside the contract → 404 | `auth.test.ts:248` | 200 / non-404; also fails if an upgrade adds an undisabled endpoint |
| auth 3: origin check forced on: trusted 200, untrusted 403 | `auth.test.ts:265` | untrusted 200 |
| auth 4: `AuthRoutes` derived from `auth.api` | type-level | pointing `/sign-up/email` at `AuthApi['signInEmail']` fails `tsc -b` at `hono-client.ts:353` |

## Questions

1. `apps/server` `dev` and `start` load `../../.env`; the root `.env.example` is the one in use. `apps/server/.env.example` was created per the brief with `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173`; the root file is outside the allowed paths.
2. Empty social profile name falls back to the email local part, clamped; empty again → 400 `invalid`. Clamping cuts by code point and keeps `.length` ≤ 40.
3. `originCheck?: boolean` on `CreateAuthOptions` sets `advanced.disableOriginCheck` so a test can force the check on (Better Auth reads `NODE_ENV` once at import); production never sets it.
4. `disabledPaths` matches exact paths: `GET /reset-password/:token` cannot be listed (inert: `/request-password-reset` disabled, no reset email); `/error` stays enabled for OAuth failures.
5. Better Auth also reads `BETTER_AUTH_TRUSTED_ORIGINS` from `process.env`; the origin appears twice in its list, harmless.
6. Trailer `Co-Authored-By: Claude Opus 5.5`, as earlier Opus-built server batches.

## Differences from the renders

none (server batch)

## Dependencies needed

none

## Left undone

none; client-side stream errors, `errorOf` body code, 410 → `linkRevoked`, social sign-in in `ApiClient` belong to `2.4-api-hooks`.

## Processes left running

none
