# Brief: 3-server-rest

Batch `3-server-rest`, phase 3 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
Rules: `CLAUDE.md` at the worktree root (all sections). Spec: plan «Фаза 3»,
block `3-server-rest` and the tests paragraph; `docs/vision.md` Account,
Settings, Library (presets, tags), Roles → DM, Architecture (Actions 2), Limits;
plan «Решения владельца» bullets on tags and presets (tag ≤24 chars
case-insensitive; deleting a preset does not touch units; create a tag only
when nothing matches; preset copy goes to the top). Code on `master`:
`packages/api/src/hono-client.ts` (the auth paths `POST /auth/sign-up/email`,
`/auth/sign-in/email`, `/auth/sign-out`, `GET /auth/get-session` and the
`presets`, `tags`, `settings`, `account` paths it calls: read first and match),
`packages/api/src/client.ts` (`Session`, `Locale`, `ApiError` codes),
`packages/api/src/db/schema.ts` (Better Auth tables with `user.language`,
`presets`, `tags`, `preset_tags`), `packages/api/src/auth/require-user.ts`
from `3-server-actions`, `packages/api/src/env.ts`. Reports:
`.claude/artifacts/reports/3-server-schema.md` (questions 2, 6, 11),
`.claude/artifacts/reports/3-server-actions.md`.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/3-server-rest`,
  branch `agent/3-server-rest`. Work only inside that path.
- Tool-call limit: 200. Node 24; `pnpm install --frozen-lockfile` first.

## Units, in this order, one commit each

Subjects `feat(api): <unit>`.

1. `auth`: `packages/api/src/auth/index.ts` builds the Better Auth instance
   with the Drizzle adapter (SQLite), email + password, Google and GitHub
   social providers only when both env values are set, `user.additionalFields
   = { language }`, `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` from env; mounted
   at `/auth/*` in `createApiApp`; the instance goes into context as
   `c.get('auth')` so `requireUser` resolves real sessions; `GET
   /auth/get-session` is Better Auth's own. Tests: sign up, sign in, session,
   sign out, a protected route 401 before sign-in and 200 after, through
   `app.request` with cookie passing.
2. `presets`: `/presets` `GET` (the user's presets, newest first, each with
   `tags: TagId[]`), `POST` (client id, fields per domain `Preset`, tag ids),
   `PATCH /:id`, `DELETE /:id` (does not touch combats), `POST /:id/duplicate`
   (client new id, copy at the top: `createdAt = now`), 404 for another user's
   preset; Zod with the domain schemas and `LIMITS`.
3. `tags`: `/tags` `GET`, `POST` (name trimmed, ≤ 24 chars, unique per owner
   case-insensitively → 409 `{ code: 'invalid' }` on a duplicate), `PATCH /:id`
   (rename, same rule), `DELETE /:id` (removes `preset_tags` rows).
4. `settings`: `GET /settings` → `{ language }`, `PATCH /settings` with
   `language: Locale` writing `user.language`.
5. `account`: `PATCH /account` (`displayName` → `user.name`, returns
   `Session`), `DELETE /account`: deletes the user and, by cascade, sessions,
   accounts, combats (final `deleted` broadcast to each open stream),
   presets, tags; signs out. Export `AppType` from `packages/api/src/index.ts`
   covering every sub-app; `hono-client.ts` compiles against the real routes
   with no planned-route stubs left.

Tests in `packages/api/test/auth.test.ts`, `presets.test.ts`, `tags.test.ts`,
`settings.test.ts`, `account.test.ts`: every route, the 409 on a duplicate
tag, the 24-char limit, 404 on foreign rows, cascade on account delete.

## Allowed paths

`packages/api/src/**` (not `client.ts`, `db/schema.ts`, `drizzle/**`),
`packages/api/test/**`, `packages/api/package.json` and `pnpm-lock.yaml` only
for a dependency already in `CLAUDE.md` Dependencies. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build` exit 0.
2. Every route of the five units has a test; sign-up → sign-in → protected
   route → sign-out is proven end to end through `app.request`.
3. Tag rules (24 chars, case-insensitive uniqueness) and preset rules (delete
   does not touch combats, duplicate at the top) are proven by tests.
4. `AppType` covers every sub-app; `createHonoApiClient` compiles against it
   with no stubs; `pnpm build` exit 0.
5. Five commits `feat(api): auth`, `feat(api): presets`, `feat(api): tags`,
   `feat(api): settings`, `feat(api): account`; no comments;
   `packages/api/src/client.ts` untouched.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
