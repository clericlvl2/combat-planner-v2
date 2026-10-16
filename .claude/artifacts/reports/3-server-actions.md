# REPORT: 3-server-actions

## Commits

- `9d9b416` feat(api): combats routes
- `e368686` feat(api): actions route
- `f951f08` feat(api): link

## Checks run

- `pnpm install --frozen-lockfile` — ok (lockfile up to date).
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` — pass: 251 files formatted, 109 files with no lint or type errors, `tsc -b` clean, `check-stories` 16, `check-i18n` 14, `check-screenshots` 16 (no `.docker-*` marker, accepted by the variable), `check-comments` none, `check-domain-tests` 84.
- `pnpm test` — pass: 36 files, 683 tests (unit + storybook), including `packages/api/test/combats.test.ts`, `actions.test.ts`, `link.test.ts`.
- `pnpm build` — exit 0.
- `bash scripts/check-commit.sh master..agent/3-server-actions` — 3 commits pass.
- The batch was restarted after a power loss with the three commits already on the branch and a clean tree; the commits were reviewed against the brief's units and acceptance criteria 1–5 and the checks above were re-run on them. No fix commit was needed.

## Questions

1. `ulid` was added to `packages/api/package.json` (`^3.0.2`, lockfile importer entry only, no new package in the store) for the action ids of the `releaseUnit` entries that reissue writes. CLAUDE.md Dependencies lists `ulid` for `packages/domain` and `packages/ui`, not for `packages/api`; the brief allows `package.json` changes only for a dependency already in that section, which this reading satisfies. If `packages/api` must stay on the listed set, the ids can be minted through a domain export instead.
2. Reissue releases claims through the domain: one `releaseUnit` action per claimed unit, authored by `{ kind: 'dm' }`, applied with `apply` and appended to `action_log` with its own `seq`; each release bumps the version by one and the generation bump adds one more, so `{ version }` after reissue is `before + claims + 1`. `players` (the display names) are kept. Without claims reissue bumps the version once and writes no log entry.
3. Idempotent replay answers `{ version: action.version + 1 }` from the stored log entry: `apply` always sets `version = combat.version + 1` and the route only applies when `action.version === combat.version`, so this equals the version answered the first time. `action_log` has no result column.
4. A replay neither writes nor broadcasts; only a fresh apply broadcasts.
5. `verifyLink(token, secret, current?)` takes an optional third argument `{ combatId, generation }`: without it the token is checked for shape and signature only; with it a token of another combat or an older generation returns `null`. `3-server-live` passes the combat's current `linkGeneration`. Tokens carry no expiry.
6. `dispatch(db, { combatId, ownerId?, viewer, action, now })` in `packages/api/src/combats/dispatch.ts`: with `ownerId` the combat must belong to that user (else `notFound`); without it (`3-server-live` player path) only the combat id is checked. It returns `{ ok: true, version, combat, replayed }` or `{ ok: false, status, code, message }` and broadcasts outside the transaction.
7. The registry is `subscribe(combatId, { viewer, send })`, `broadcast(combatId, event, audience?)`, `broadcastDocument(combatId, combat, audience?)` and `subscriberCount(combatId)`; `broadcastDocument` runs `project(combat, subscriber.viewer)` per subscriber, so the DM receives the full document and each player its projection. Reissue sends the document to the `dm` audience and `linkRevoked` to the `player` audience only.
8. `requireUser` reads a preset `userId` context variable before asking `c.get('auth')`; `withUser(app, userId)` in `packages/api/test/helpers.ts` wraps the app in a parent Hono that sets it. With no preset value and no auth instance the answer is 401 `{ code: 'unauthorized' }`.
9. `POST /combats` with an id the same DM already owns returns the stored combat (200); with an id of another DM's combat 422 `{ code: 'invalid' }`; the 101st combat and a duplicate past the limit answer 422 `{ code: 'limit' }`.
10. `DELETE /combats/:id` answers 204 with no body, as `hono-client.ts` `combats.remove` expects.
11. The 403 for a player viewer is proven through `dispatch` with a `player` viewer and a DM-only action (`nextTurn`); the route itself always uses the DM viewer, and the route-level 403 test covers the DM sending a player-only action (`claimUnit`).

## Differences from the renders

None; this batch has no renders.

## Dependencies needed

None.

## Left undone

None.

## Processes left running

none
