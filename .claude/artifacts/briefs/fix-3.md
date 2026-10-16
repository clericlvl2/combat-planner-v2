# Brief: fix-3

Batch `fix-3`, phase 3 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
one agent fixes the guard findings of `3-server-live` and `3-server-rest` on
the server. Rules: `CLAUDE.md` at the worktree root (all sections). Guard files:
`.claude/artifacts/guard/3-server-live.md`, `.claude/artifacts/guard/3-server-rest.md`.
Contracts already taken: `.claude/artifacts/reports/3-server-schema.md`,
`3-server-actions.md`, `3-server-live.md`, `3-server-rest.md` and the progress
file `.claude/artifacts/2026-10-16-handoff-build-progress.md` («Вопросы
владельцу»).

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-3`, branch
  `agent/fix-3`. Work only inside that path.
- Tool-call limit: 200. Node 24; `pnpm install --frozen-lockfile` first.

## Units, in this order, one commit each

Subjects `fix(api): <unit>`.

1. `live` (packages/api/src/live/sse.ts and its tests):
   - A request whose `c.req.raw.signal` is already aborted when
     `streamCombatEvents` starts unsubscribes and clears the heartbeat at once
     (`if (signal.aborted)` after the listener is attached); test with a
     pre-aborted `AbortController` asserts `subscriberCount` back to 0
     (3-server-live finding 1).
   - A final event (`deleted`, `linkRevoked`) stops the stream from accepting
     further events before its write starts; test: a broadcast after
     `linkRevoked` is not delivered (finding 3).
   - An exception in `load()` or `project()` runs the same cleanup
     (unsubscribe, clear interval); test (finding 4).
   - The heartbeat test asserts no comment before 15 s (finding 5).
2. `auth` (packages/api/src/auth/**, packages/api/src/env.ts,
   `apps/server/.env.example`, `apps/server/src/main.ts` only for env wiring):
   - The display name is bounded by `LIMITS.displayName` on every path:
     `databaseHooks.user.create.before` and `update.before` clamp a social
     profile name to the limit and reject an empty or over-limit name from
     email sign-up with 400 `{ code: 'invalid' }`; tests for sign-up over the
     limit and a session that parses with `sessionSchema` (3-server-rest
     finding 1).
   - `disabledPaths` lists every Better Auth endpoint outside the contract,
     including `/update-user` and `/change-password`; test that
     `/auth/change-password` answers 404 (findings 1, 3).
   - Trusted origins come from env (`BETTER_AUTH_TRUSTED_ORIGINS`, comma
     list, optional) through `ApiEnv`; `apps/server/.env.example` sets
     `http://localhost:5173`; one test runs sign-in with the origin check
     forced on and a trusted `Origin` header (200) and an untrusted one (403)
     (finding 2).
   - `AuthRoutes` input and output types are derived from the `auth.api`
     method types instead of written by hand, so a Better Auth upgrade that
     changes them fails `tsc` (finding 4).

Not in this batch: the client side of stream errors (410/404 on
`EventSource`), the body-`code` mapping in `errorOf`, the 410 → `linkRevoked`
code and social sign-in in `ApiClient`; they belong to `2.4-api-hooks`.

## Allowed paths

`packages/api/src/**` (not `client.ts`, `hono-client.ts`, `db/schema.ts`,
`drizzle/**`), `packages/api/test/**`, `apps/server/.env.example`,
`apps/server/src/main.ts`. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build` exit 0.
2. Every item of units 1–2 is proven by a test that fails on the old code,
   named with file and line in the report.
3. No subscription or interval outlives its request in any test path
   (`subscriberCount` and fake-timer checks).
4. `/auth/change-password` and `/auth/update-user` answer 404; an over-limit
   display name never reaches a session.
5. Two commits `fix(api): live`, `fix(api): auth`; no comments;
   `packages/api/src/client.ts` untouched.

## Hand-back

Report per `CLAUDE.md` «REPORT.md». If writing `REPORT.md` is blocked, return
the full report as the final message.
