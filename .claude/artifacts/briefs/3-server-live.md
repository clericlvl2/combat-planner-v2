# Brief: 3-server-live

Batch `3-server-live`, phase 3 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
Rules: `CLAUDE.md` at the worktree root (all sections). Spec: plan «Фаза 3»,
block `3-server-live` and the tests paragraph; `docs/vision.md` Architecture
(Data flow 11–15), Roles → Player identity, Claims, Visibility for players,
Player view (Link, Heroes, Turn order, Content, Updates), Connection. Code on
`master`: `packages/api/src/hono-client.ts` (the exact paths and event shapes
the client expects: `GET /combats/:id/events`, `GET /play/:id?t=`, `POST
/play/:id/actions?t=` with `X-Player-Id`, `GET /play/:id/events?t=&playerId=`;
events `document` / `deleted` / `linkRevoked` as JSON with `type`, SSE `id` =
version), `packages/api/src/live/registry.ts` and `combats/dispatch.ts` from
`3-server-actions`, `link/token.ts`, `packages/domain` (`project`, `authorize`,
`isPlayerAction`). Reports with contract decisions:
`.claude/artifacts/reports/3-server-schema.md` (questions 3, 5),
`.claude/artifacts/reports/3-server-actions.md`.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/3-server-live`,
  branch `agent/3-server-live`. Work only inside that path.
- Tool-call limit: 200. Node 24; `pnpm install --frozen-lockfile` first. Tests
  through `app.request` with a `ReadableStream` reader for SSE; fake timers for
  the heartbeat.

## Units, in this order, one commit each

Subjects `feat(api): <unit>`.

1. `events route`: `GET /combats/:id/events` (DM, `requireUser`, 404 for a
   foreign combat) streams SSE through `hono/streaming` `streamSSE`: on open,
   the current DM document as `document` with `id` = version (unless
   `Last-Event-ID` equals the current version, in which case nothing until the
   next change); every registry broadcast for the combat as an event with `id`
   = version; a comment heartbeat every 15 s; `deleted` and `linkRevoked` as
   final events after which the stream closes; unsubscribe from the registry
   on client abort. The registry gains per-subscriber viewer so `dispatch`
   broadcasts each player its own projection (if `3-server-actions` already
   did this, keep it).
2. `play routes`: `GET /play/:id?t=<token>` with header `X-Player-Id`: verify
   the token (`verifyLink`, 404 on a bad signature, 410 `{ code: 'linkRevoked'
   }` on a stale generation, 404 when the combat is gone), upsert the player
   row when a `displayName` is known, answer `{ combatId, playerId, language,
   combat: project(combat, player) }` where `language` is the DM's
   `user.language`; `POST /play/:id/actions?t=` with `X-Player-Id`: same
   checks, then `dispatch` with the player viewer (`authorize` refuses foreign
   units with 403; `claimUnit` records `displayName` in `players`); `GET
   /play/:id/events?t=&playerId=`: the player SSE stream with the player
   projection, `linkRevoked` final event when the generation changes,
   `deleted` on delete. Hidden fields never reach a player stream (test walks
   every key of every unit in a received `document` event against the
   visibility table, with disabled units absent).

Tests in `packages/api/test/events.test.ts` and `play.test.ts`: DM stream
delivers the initial document and a broadcast after a dispatch with `id` =
version; `Last-Event-ID` equal to the version suppresses the initial
document; heartbeat comment at 15 s (fake timers); `deleted` with the title
closes the stream; player `get` with a valid token, a tampered token, a stale
generation; player action on own hero ok, on a foreign unit 403, with a
stale version 409; player stream receives the projection without hidden
fields and `linkRevoked` after reissue.

## Allowed paths

`packages/api/src/**` (not `client.ts`, `db/schema.ts`, `drizzle/**`, and
`hono-client.ts` only to delete planned-route stubs this batch replaces),
`packages/api/test/**`. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build` exit 0.
2. Every route of both units has a test; the projection-in-SSE test for DM and
   player, the final events, a player refused on a foreign unit and an expired
   (stale-generation) token are each proven by a test.
3. A player `document` event never contains a hidden field or a disabled unit
   (test over every key).
4. Two commits `feat(api): events route`, `feat(api): play routes`; no
   comments; `packages/api/src/client.ts` untouched.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
