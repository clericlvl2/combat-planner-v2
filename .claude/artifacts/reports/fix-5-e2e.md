# REPORT fix-5-e2e

## Commits

- 4f17847 test(e2e): combat lifecycle
- 2af214d test(e2e): player
- ae54f86 test(e2e): library
- b64ac62 test(e2e): account

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` before each commit: pass.
- `pnpm e2e` before each commit: pass, 21 passed (the one `test.fail()` in `auth.spec.ts:10` shows as an expected failure). The first run before commit 1 failed 2 tests with `net::ERR_CONNECTION_REFUSED` on 3000 mid-run (`player.spec.ts:117`, `smoke.spec.ts:3`); an immediate rerun passed 21/21. Hypothesis: a concurrent run on the shared port 3000 (fix-5) took down or replaced the server; not reproduced afterwards.
- `pnpm exec playwright test e2e/combat-lifecycle.spec.ts e2e/player.spec.ts e2e/library.spec.ts e2e/account.spec.ts --repeat-each 5`: 70 passed, 0 failed (14 tests x 5), 3.7 min.
- `bash scripts/check-commit.sh master..agent/fix-5-e2e`: 4 commits pass.
- `ss -ltn` after the runs: no listener on 3000.

Findings closed:

1. `e2e/combat-lifecycle.spec.ts:109-111` waits for `Edit round, round 1` and the first row active before `unitNames` is read for Undo.
2. `e2e/account.spec.ts:19,25-27` waits for the `PATCH /api/settings` response (ok, `language: 'de'`) before the reload. The brief says PUT; the client sends PATCH (`packages/api/src/hono-client.ts:517`).
3. `e2e/account.spec.ts:46,50-51` waits for the `PATCH /api/account` response before the reload; `:54-56` reads the name from `GET /api/auth/get-session` after the reload, then the textbox.
4. `e2e/player.spec.ts:104` DM side shows Pat's claim (`toHaveCount(1)`) before the reissue; `:120` shows it gone after.
5. `e2e/player.spec.ts:45` «You» is asserted in setup, right after the claim, and no longer after Start; what Start changes is asserted instead: `:46` three `No initiative` dice before Start, `:59` none after.
6. `e2e/player.spec.ts:61-68` DM initiatives are >= 1 and non-increasing in row order, DM row names are the three units, the player's row order equals the DM's and the player's shown initiative per row equals the DM's, so the player order is the one the values imply, independent of insertion order. New helper `rowInitiatives` in `e2e/helpers.ts`.
7. `e2e/player.spec.ts:85,97` a `window.e2eNoReload` marker is set before the damage and read after the DM sees 7/10; the URL equality is removed.
8. `e2e/library.spec.ts:62,74` use `expect.poll(() => presetNames(page))`; the two post-reload sort reads in the same test, `:67,78`, poll the same way.

No `waitForTimeout`, retries or `test.fail()` added. No comments.

## Questions

- The brief names a settings PUT; the app sends PATCH. The spec waits for PATCH.

## Differences from the renders

none

## Dependencies needed

none

## Left undone

none

## Processes left running

none
