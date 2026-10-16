# Brief: 3-server-actions

Batch `3-server-actions`, phase 3 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
Rules: `CLAUDE.md` at the worktree root (all sections). Spec: plan section «Фаза
3 — сервер», block `3-server-actions` and the tests paragraph; `docs/vision.md`
Architecture (Actions 1–6, Action log 7–10, Data flow 11–16), Combat list,
Combat (Setup, Active, Share, Undo), Roles → Claims, Player view → Link. Code
on `master`: `packages/api/src/db/schema.ts`, `db/index.ts`, `app.ts`
(`createApiApp({ db, env })`, `ApiAppEnv` context), `hono-client.ts` (the
paths and shapes the client already calls: read it first and match it),
`client.ts` (`ApiClient`, `ApiError` codes), `packages/domain/src/index.ts`
(`apply`, `authorize`, `project`, `undoTarget`, `LogEntry`, `Patch`,
`copyCombat`, `LIMITS`). Report of the previous batch with its 13 contract
decisions: `.claude/artifacts/reports/3-server-schema.md`.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/3-server-actions`,
  branch `agent/3-server-actions`. Work only inside that path.
- Tool-call limit: 220. Node 24: `source ~/.nvm/nvm.sh && nvm use`;
  `pnpm install --frozen-lockfile` first. Tests run on a temporary SQLite file
  through `app.request`; no listening server is needed.
- Auth in this batch: the Better Auth sub-app arrives with `3-server-rest`.
  Routes of this batch read the DM identity through a `requireUser` middleware
  in `packages/api/src/auth/require-user.ts` that resolves the session via
  Better Auth's `getSession` when the auth instance is present in context
  (`c.get('auth')`, optional in `ApiAppEnv`) and answers 401 otherwise; tests
  inject a fake session through a test-only context variable set by a helper
  in `packages/api/test/helpers.ts` (`withUser(app, userId)`). `3-server-rest`
  wires the real instance.

## Units, in this order, one commit each

Subjects `feat(api): <unit>`.

1. `combats routes`: `packages/api/src/combats/routes.ts` mounted at
   `/combats`: `GET /` (summaries of the DM's combats: id, title, description,
   color, status, unitCount, lastPlayedAt, updatedAt), `POST /` (create with
   client id, title, description, color → the stored `Combat` with
   `version 1`), `GET /:id` (the DM document), `PATCH /:id` (title,
   description, color → `{ version }`, bumps version, broadcasts), `DELETE
   /:id` (hard delete, final `deleted` broadcast with the title; the
   subscribers registry lives in `packages/api/src/live/registry.ts` from
   this batch: `broadcast(combatId, event)` and `subscribe(combatId,
   listener)`, consumed by `3-server-live`), `POST /:id/duplicate`
   (`copyCombat` from the domain with the client's new id), `POST /:id/open`
   (sets `lastPlayedAt`, returns the document). Every route 404s for a combat
   of another user. Zod validation through `@hono/zod-validator` with the
   domain schemas and `LIMITS`.
2. `actions route`: `POST /combats/:id/actions`: body `Action`; in one
   `better-sqlite3` transaction: a known `action.id` for this combat returns
   the stored result `{ version }` (idempotency); `action.version !==
   combat.version` → 409 `{ code: 'version' }`; `authorize` (DM viewer) →
   403; `apply(combat, action, viewer, now, log)` → `DomainError` codes map
   to 409 (`version`), 403 (`forbidden`), 422 (`blocked`, `limit`,
   `invalid`), 404 (`notFound`); on success write the document, append the
   log entry (`seq = max + 1`, `patch`, `undoneBy`), mark the undone entry
   when the result is an undo, then broadcast `{ type: 'document', version,
   document }` per viewer through the registry (DM document and, for each
   player subscriber, `project(combat, { kind: 'player', playerId })`), and
   answer `{ version }`. `packages/api/src/combats/dispatch.ts` holds the
   transaction so `3-server-live` can reuse it for player actions with a
   player viewer.
3. `link`: `packages/api/src/link/token.ts`: `signLink({ combatId, generation
   }, secret) → '<combatId>.<generation>.<hmac>'` with HMAC-SHA256 base64url,
   `verifyLink(token, secret) → { combatId, generation } | null` with
   constant-time comparison; `GET /combats/:id/link` → `{ token, generation
   }`; `POST /combats/:id/link/reissue` → increments `linkGeneration`,
   releases every claim (through the domain: a `releaseUnit` per claimed unit
   authored by the DM, or a single document rewrite plus log entries, the
   report says which), bumps version, broadcasts the DM document and a final
   `linkRevoked` to player subscribers (their streams close), answers `{
   token, version }`.

Tests in `packages/api/test/combats.test.ts`, `actions.test.ts`,
`link.test.ts`: every route; another user's combat → 404; 409 on a stale
version; idempotent replay returns the same `{ version }` without a second
log entry; undo through the route marks `undoneBy`; `deleted` reaches a
registered subscriber with the title; link verify rejects a tampered token
and an older generation; reissue releases claims and sends `linkRevoked`.
`AppType` is re-exported from `packages/api/src/index.ts` and
`hono-client.ts` compiles against the real routes (delete the planned-route
stubs this batch replaces).

## Allowed paths

`packages/api/src/**` (not `client.ts`, `db/schema.ts`, `drizzle/**`),
`packages/api/test/**`, `packages/api/package.json` and `pnpm-lock.yaml` only
for a dependency already in `CLAUDE.md` Dependencies. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build` exit 0.
2. Every route of the three units has a test; 409, idempotency, 403 for a
   player viewer, 404 for a foreign combat, undo marking, `deleted` and
   `linkRevoked` broadcasts are each proven by a test.
3. The dispatch transaction is atomic: a failing `apply` leaves the document,
   the log and the version unchanged (test).
4. `verifyLink` rejects a tampered signature and a stale generation (test);
   tokens have no expiry.
5. Three commits `feat(api): combats routes`, `feat(api): actions route`,
   `feat(api): link`; no comments; `packages/api/src/client.ts` untouched.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
