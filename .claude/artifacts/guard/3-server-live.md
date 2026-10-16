# Guard: 3-server-live

Range `7020c12..d325504` (3013ce4 events route, d325504 play routes). Read-only; gate logs `.claude/run/3-server-live/`. Guard on Opus 5.5 xhigh (first run on Fable cut off by the limit).

CRIT 1 UNVERIFIABLE .claude/run/3-server-live/summary.log — runtime criterion; the gate log records exit 0 for check, test (50 files, 938 tests), build.
CRIT 2 PASS packages/api/test/events.test.ts:84 — DM stream events.test.ts:72-157; `GET /play/:id` play.test.ts:149-193; `POST /play/:id/actions` :195-304; `GET /play/:id/events` :306-380; DM document over SSE events.test.ts:84, player projection play.test.ts:318; `deleted` events.test.ts:157, play.test.ts:369; `linkRevoked` play.test.ts:342; 403 foreign hero / enemy play.test.ts:251; 410 stale generation on all three routes :342-362, :187.
CRIT 3 PASS packages/api/test/play.test.ts:52 — `assertVisibility` (52-69) checks every key of every unit, disabled units absent, all three visibility classes present; runs on initial and relayed documents (:326, :334). Code: src/live/sse.ts:60, src/live/registry.ts:35-43; every document broadcast goes through `broadcastDocument` (dispatch.ts:87, combats/routes.ts:92,132, link/routes.ts:68).
CRIT 4 PASS packages/api/src/live/sse.ts:1 — subjects `feat(api): events route`, `feat(api): play routes`; no comments; `client.ts`, `db/schema.ts`, `drizzle/**` untouched.

Focus points: player authorization through `apply` → `authorize` (403 foreign unit, 403 `nextTurn` play.test.ts:267); `resolveLink` on all three play routes (play/routes.ts:61,79,98) in the same tick as `dispatch`/`subscribe`; `clearInterval` in `finish` (sse.ts:38).

## Scope check

10 files, all in allowed paths; `hono-client.ts` only deletes the two play stubs and their now-unused types.

## Findings

1. P2 packages/api/src/live/sse.ts:53 — a client that disconnects while `requireUser`/`zValidator` awaits leaks its subscription and 15 s interval: `c.req.raw.signal` is already aborted (an `abort` listener never fires) and node-server never cancels the body (`@hono/node-server` 2.1.5 dist/index.mjs:487-490, 757-762, 777). Read, not reproduced. Fix: after line 53, `if (signal.aborted) { finish(); return; }`.
2. P2 packages/api/src/play/routes.ts:99 — `GET /play/:id/events` answers a stale token with 410 JSON and a deleted combat with 404 JSON; `EventSource` closes for good on non-200 without exposing the status, and the client `error` handler (hono-client.ts:324-331) only switches to `reconnecting`. A player offline during reissue or delete stays on "Reconnecting…" instead of Link expired / Combat deleted. Same gap on the DM stream after delete. Per WHATWG spec, not reproduced.
3. P3 packages/api/src/live/sse.ts:44-46 — `ended` set only after the final event's write resolves; a stalled revoked player can queue post-reissue projections behind `linkRevoked`. Fix: stop accepting before writing the final event.
4. P3 packages/api/src/live/sse.ts:54 — `load()` or `project()` throwing inside the executor closes the stream without `finish`; interval and subscription stay.
5. P3 packages/api/test/events.test.ts:124-133 — heartbeat test never asserts no comment before 15 s.

## Outside the reviewed scope

6. P2 (owner decision) packages/domain/src/project.ts:27,60 — the player projection carries raw `playerId`s (`claimedBy`, keys of `players`); `playerId` is the only player credential on the play routes, so any link holder can open another player's stream (own-only Note and HP history) and act on that player's hero via `X-Player-Id`. Implements the vision's identity model; not a regression of this batch.

3 pass / 0 fail / 1 unverifiable; scope held.
