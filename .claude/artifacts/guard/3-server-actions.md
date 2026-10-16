# Guard: 3-server-actions

Range `f3b04cd..985e015`, 3 commits (`ac5a92e` combats routes, `3928836` actions route, `985e015` link). Read-only; gate logs `.claude/run/3-server-actions/`.

CRIT 1 PASS .claude/run/3-server-actions/summary.log — check 0, build 0, test 1 then test-retry 0; test.log:27-109 first-run failures are 12 `packages/ui` storybook suites failing at import, none in `packages/api/test/*`.
CRIT 2 PASS — every route tested: `GET /combats` combats.test.ts:122-146; `POST` :83-120; `GET /:id` :148-160; `PATCH` :162-191; `DELETE` :251-271; `duplicate` :217-249; `open` :193-215; `POST /:id/actions` actions.test.ts:73-219; `GET /:id/link` link.test.ts:112-123; `reissue` :125-189. 409 actions.test.ts:106-112; idempotent replay :114-126; 403 player viewer :140-148 (dispatch level) plus route-level DM `claimUnit` :128-138; 404 foreign combat combats.test.ts:155,182,211,238,252, actions.test.ts:206, link.test.ts:121,125; undo `undoneBy` actions.test.ts:269-284; `deleted` with title combats.test.ts:258-270; `linkRevoked` player only link.test.ts:148-151.
CRIT 3 PASS packages/api/src/combats/dispatch.ts:55-87 — ownership, replay lookup, version check, `apply`, `saveCombat`, `appendLogEntry` (max+1), `markUndone` inside one synchronous `db.transaction` (:84); broadcast after commit, only on a fresh apply (:85). Test actions.test.ts:150-158 compares row and log before/after a `blocked` apply.
CRIT 4 PASS packages/api/src/link/token.ts:13-36 — HMAC-SHA256 base64url over `combatId:generation`, length check then `timingSafeEqual` (:33), generation regex without leading zero (:28), optional `current` rejects another combat or generation (:34); no timestamp. Tests link.test.ts:46-57, :59-64, :167-176.
CRIT 5 PASS — exactly the three subjects with Co-Authored-By; check-commit 0; no comments in added lines; `client.ts`, `db/schema.ts`, `drizzle/**` untouched.

## Scope check

18 files under `packages/api/src/**`, `packages/api/test/**`, `packages/api/package.json`, `pnpm-lock.yaml`. Deviation: `packages/api/package.json:15` adds `ulid ^3.0.2` (CLAUDE.md lists `ulid` for domain and ui only); accepted by the orchestrator, CLAUDE.md Dependencies awaits the owner's edit.

## Findings

1. P3 packages/api/src/combats/routes.ts:116 — duplicate stored with `version: 0` (`copyCombat`, packages/domain/src/reduce.ts:528) while `POST /combats` stores `version: 1` (:62); harmless (nonnegative schema, SSE gate starts at -1, `open` bumps to 1); duplicate test does not assert the version.
2. P3 packages/api/src/combats/dispatch.ts:72 — `loadLog` reads the whole log on every undo; grows linearly.
3. P3 packages/api/src/app.ts:14 — `ApiAppEnv.userId: string` non-optional though unset until `requireUser`; require-user.ts:17 re-annotates as `string | undefined`.
4. P3 packages/api/src/combats/routes.ts:76-91 — `PATCH` with `{}` bumps the version and broadcasts with no change.
5. P3 packages/api/test/actions.test.ts:140-148 — player-viewer 403 proven at `dispatch` level; `3-server-live` should add the route-level case on `POST /play/:id/actions`.
6. P3 packages/api/src/hono-client.ts:21,23 — imports from `hono/hono-base` and `hono/utils/types` internal subpaths; may break on a hono minor.
7. P3 packages/api/src/app.ts:26-28 — three sub-apps under `/combats` each `.use(requireUser)`; preset `userId` short-circuits repeats.

5 PASS, 0 FAIL, 0 UNVERIFIABLE. No P0–P2.
