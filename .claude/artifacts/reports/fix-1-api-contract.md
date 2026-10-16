# REPORT: fix-1-api-contract

## Commits

- 3f6fb65 fix(api): ApiClient

## Checks run

- `pnpm install --frozen-lockfile` — pass
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` — pass (format, lint, tsgolint, `tsc -b`, check-stories, check-i18n, check-screenshots, check-comments, check-domain-tests)
- `pnpm test` — pass, 26 files, 490 tests
- `pnpm build` — pass
- `bash scripts/check-commit.sh master..agent/fix-1-api-contract` — pass

## Questions

- `link.get` returns `{ token, generation }`, exported as `linkSchema` / `Link` with `linkGenerationSchema` mirroring `Combat.linkGeneration`; `link.reissue` still returns `{ token, version }` as before. Phase 3 may want the two result shapes unified; left as the brief specified.
- `ConnectionApi.subscribe` takes `ConnectionListener = (state: ConnectionState) => void`; the memory client in `client.test.ts` holds a fixed `'connected'` state and never emits, since the test client has no stream to drive it. The unsubscribe is asserted to be a function and to run without error.

## Differences from the renders

- none

## Dependencies needed

- none

## Left undone

- none

## Processes left running

none
