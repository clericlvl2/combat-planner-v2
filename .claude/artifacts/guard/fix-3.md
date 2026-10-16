# Guard: fix-3

Range `6e83eab..b6f2a91` (6427ff6 `fix(api): live`, b6f2a91 `fix(api): auth`); `git range-diff` matches the reported commits patch for patch. Read-only; checked against Better Auth 1.7.10, better-call 1.4.2, rou3 0.9.2, hono 4.13.13, @hono/node-server 2.1.5. Guard on Opus 5.5 xhigh.

CRIT 1 UNVERIFIABLE .claude/run/fix-3/summary.log:1-14 — runtime; the gate log records exit 0 for install, check, test (65 files, 1163), visual, storybook-build, build.
CRIT 2 PASS .claude/artifacts/reports/fix-3.md:20-35 — every anchor matches (events.test.ts:152, 177, 210, 224; play.test.ts:358; auth.test.ts:77, 96, 201, 228, 248, 265, 309); each runtime test fails on the old code by reading; heartbeat and derived types cannot fail on old code by nature (types derived via better-call `StrictEndpoint` last overload, endpoint.d.mts:441-484; auth/index.ts:115-142).
CRIT 3 PASS packages/api/src/live/sse.ts:35-76 — every end path runs `stop()`: client cancel (:59), later abort (:60), already aborted (:61-64), `load()` undefined (:67-69), `load()`/`project()` throw (:73-75), final event before write (:52-53); node-server 2.1.5 creates the lazy controller already aborted (index.mjs:486-490, 846-851, 1045-1055); hooks enforce 0 timers and 0 subscribers (events.test.ts:87-97, play.test.ts:154-163).
CRIT 4 PASS packages/api/test/auth.test.ts:228 — `/change-password`, `/update-user` 404 with a session; `DISABLED_AUTH_PATHS` (auth/index.ts:14-37) cover every routed endpoint outside the contract except the accepted `/reset-password/:token` (inert, `callbackURL` origin-checked, password.mjs:96); no URL bypass (exact match after trailing-slash removal, `//` rejected, case-sensitive, no percent-decoding); over-limit names blocked on every path through hooks (internal-adapter.mjs:123, 169, 616-630); origin check on in production (app.ts:26), forced on sign-in/up by `formCsrfMiddleware`.
CRIT 5 PASS packages/api/src/auth/index.ts:1 — subjects match; `//` only inside URL strings; `client.ts`, `hono-client.ts`, `db/schema.ts`, `drizzle/**` untouched.

## Scope check

8 files, all allowed; main.ts change is env wiring only (:19-23, :38); +134/−20 and +310/−23.

## Findings

1. P3 packages/api/test/events.test.ts:227 — the `project()`-throws test builds its fixture from `fetchCombat(dm)` after the previous test deleted the combat (:199); it depends on test order and field-access order.
2. P3 packages/api/src/auth/index.ts:46-53 — `clampDisplayName` is surrogate-safe but the surrogate branch is untested (tests use single-unit 'Ж'); a cut can split a grapheme cluster (cosmetic).

## Outside the reviewed scope

- `apps/server/.env.example` is read by nothing; until 4-web adds `BETTER_AUTH_TRUSTED_ORIGINS` to the root `.env.example`, sign-in through the Vite proxy gets 403 (assigned to 4-web).

4 pass / 0 fail / 1 unverifiable; scope held.
