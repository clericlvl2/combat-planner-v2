# REPORT: 1-api-contract

## Commits

- `56307fe` `feat(api): ApiClient`

## Checks run

- `pnpm install --frozen-lockfile` — ok
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` — exit 0 (format, lint, tsgolint, `tsc -b`, check-stories, check-i18n, check-screenshots, check-comments, check-domain-tests all pass)
- `pnpm test` — exit 0, 22 files, 394 tests passed
- `pnpm exec vp test --project unit packages/api/src/client.test.ts` — 5 tests passed
- `pnpm build` — exit 0
- `bash scripts/check-commit.sh master..agent/1-api-contract` — 1 commit passes

## Questions

1. `play.get` and `play.subscribe` take `playerId: PlayerId` next to the token. The brief writes `play.get(token)`; vision «Player identity» says every player request and the SSE subscription carry the `playerId`, and the `playerId` in the `PlayView` result echoes it. Confirm the parameter or move the identity into the client constructor in phase 3.
2. `play.dispatch(token, playerId, action) → { version }` is added beyond the brief's `play` list. Vision «Roles → Player» sends actions on own heroes and plan «Фаза 3» (`3-server-live`) names player actions with `X-Player-Id`; without it the player view has no write path. Remove if players are meant to dispatch another way.
3. `Locale` is defined in `packages/api/src/client.ts` as `LOCALES` + `localeSchema` (en, de, es, fr, ja, ru per vision «Names»). The brief references `Locale`, but `packages/domain` does not export one and `packages/ui` (which owns its own `Locale`) already depends on `packages/api`, so `api` cannot import it from `ui`. Phase 2.4 may alias `ui`'s `Locale` to this one.
4. `ApiError.retryable` defaults to `code === 'network'` (vision «Connection»: only a request with no response offers Retry); the constructor accepts an explicit override.
5. `tags.list()` returns `Tag[]` without preset counts; the tag sheet's per-row count is derived on the client from `presets.list()`.
6. `combats.subscribe` types `onDocument` as `(document: Combat | PlayerCombat) => void` as the brief states, although a `dm` viewer always receives `Combat`; `play.subscribe` narrows to `PlayerCombat`.
7. `presets.update` and `tags.rename` return the updated entity, `combats.update` returns `{ version }` as the brief states; `account.update` returns `Session`.

## Differences from the renders

None; the brief names no renders.

## Dependencies needed

None. `@combat-planner/domain` was already a workspace dependency of `packages/api`; `package.json` and `pnpm-lock.yaml` are unchanged.

## Left undone

None.

## Processes left running

none
