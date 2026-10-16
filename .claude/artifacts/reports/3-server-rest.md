# REPORT: 3-server-rest

Delivered as the hand-back message (the agent's write of `REPORT.md` was blocked by the harness); saved by the orchestrator.

## Commits

- `729b624` feat(api): auth
- `f107480` feat(api): presets
- `1bb51c8` feat(api): tags
- `d1ff289` feat(api): settings
- `167a8da` feat(api): account

## Checks run

- Restart: the previous agent was cut off by an API limit after committing `729b624` and left uncommitted presets work in the tree.
- `729b624` (auth) reviewed against brief unit 1, nothing missing, no `fix(api): auth` commit: Drizzle adapter on SQLite, email + password; Google and GitHub only when the env carries id and secret; `user.additionalFields.language`; secret and URL from `ApiEnv`; mount at `/auth/*` with Better Auth's `get-session`; instance in `c.get('auth')`; tests for sign-up, sign-in, session, sign-out, and a protected route answering 401 → 200 → 401 through `app.request` with cookies.
- Presets work kept after review against unit 2 (`src/presets/routes.ts`, `src/presets/store.ts`, `test/presets.test.ts`, edits to `app.ts`, `index.ts`, `hono-client.ts`); three unused type imports removed from `hono-client.ts` (`Preset`, `PresetCreateInput`, `PresetPatch`); `presetsApp` import and mount moved after `health` in `app.ts`.
- `pnpm install --frozen-lockfile`: ok.
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`: pass before each of the four commits. Final: 361 files formatted; 143 files no lint/type errors; `tsc -b` clean; check-stories 26, check-i18n 25, check-screenshots 26 (no marker, accepted by the variable), check-comments none, check-domain-tests 84; `pnpm test` 51 files, 941 tests.
- Unit files: `auth.test.ts` 12, `presets.test.ts` 17, `tags.test.ts` 18, `settings.test.ts` 9, `account.test.ts` 8.
- `pnpm build`: exit 0.
- `bash scripts/check-commit.sh master..HEAD`: 5 commits pass.
- Throwaway client check (deleted, not committed): `createHonoApiClient` against the real app through a cookie jar: `auth.signUp`; tags create, duplicate 409, rename, remove; presets create, update, duplicate (`Lich 2` at the top), list, remove; settings get/update; account update, then remove, after which `auth.session()` returned null.
- `git merge-tree --write-tree --name-only master HEAD`: `app.ts` and `index.ts` merge cleanly; `hono-client.ts` conflicts (Question 8).

## Questions

1. Duplicate tag: server answers 409 `{ code: 'invalid' }` per the brief, but `ERROR_CODES` in `hono-client.ts` maps by status, so the client raises `ApiError { status: 409, code: 'version' }` and the UI's silent-refetch rule would treat it as a version conflict. Fix: `errorOf` prefers a known body `code`.
2. Unused tags are not deleted server-side (vision: "A tag with no presets disappears"); auto-deleting would remove a tag created in the tag sheet before its preset is saved. Hiding unused tags is left to the UI.
3. `GET /tags` sorts by lower-cased name, then id.
4. Create with a known id for `POST /tags` and `POST /presets` mirrors `POST /combats`: own id → stored row 200; another DM's id → 422 `invalid`; for tags the id is checked before the name rule. Names trimmed and checked with `tagNameSchema` (>24 or blank → 400); `nameLower = normalizeTag(name)`.
5. Presets: 1001st preset or duplicate past the limit → 422 `limit`; foreign tag ids → 422 `invalid`; copy named by `duplicateName` with `createdAt = updatedAt = now`; list by `createdAt` desc then rowid desc; `DELETE /presets/:id`, `DELETE /tags/:id` → 204.
6. `DELETE /account`: one transaction deletes the `user` row, FK cascade removes session, account, combats (with action_log, players), presets (with preset_tags), tags; after commit every subscriber of each deleted combat gets `{ type: 'deleted', title }`; `auth.api.signOut({ headers, returnHeaders: true })` supplies expiring `Set-Cookie`; 204. Account sub-app is a factory `createAccountApp(auth)` like `createAuthApp`, because `c.get('auth')` is typed `SessionResolver`.
7. `GET`/`PATCH /settings` and `PATCH /account` → 404 `{ code: 'notFound', message: 'User not found' }` when the session's user row is gone.
8. Rebase: `app.ts` and `index.ts` merge cleanly. `hono-client.ts` conflicts in the import list and `PlannedRoutes`: take this branch's side, delete the empty `PlannedRoutes`, `JsonEndpoint`, `IdParam`, `TokenQuery` and the imports `Action`, `PlayView`, `VersionResult`; `ClientApp = Hono<BlankEnv, UnionToIntersection<AppSchema>>`.

## Differences from the renders

None; this batch has no renders.

## Dependencies needed

None.

## Left undone

Acceptance criterion 4 ("no stubs") holds only after the rebase: on the branch `hono-client.ts` still has the two `/play` stubs; removing them is the conflict resolution in Question 8.

## Processes left running

none
