# REPORT: 3-server-live

## Commits

- `24544d5` feat(api): events route
- `17c6bd3` feat(api): play routes

## Checks run

- `pnpm install --frozen-lockfile` — ok (lockfile up to date).
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` — pass before each commit; final run: 309 files formatted, 126 files with no lint or type errors, `tsc -b` clean, `check-stories` 21, `check-i18n` 20, `check-screenshots` 21 (no `.docker-*` marker, accepted by the variable), `check-comments` none, `check-domain-tests` 84.
- `pnpm test` — pass before each commit; final run: 43 files, 816 tests (unit + storybook).
- `pnpm exec vp test --project unit packages/api/test/events.test.ts` — 10 pass: 401 without a user, 404 for a foreign and an unknown combat, initial document with `id` = version and a relayed dispatch with `id` = new version, `Last-Event-ID` equal to the version suppresses the initial document, `Last-Event-ID` behind sends it, comment heartbeat at 15 s and again at 30 s (fake `setInterval`), unsubscribe on request-signal abort and on body cancel (registry count back to 0), `deleted` with the title closes the stream.
- `pnpm exec vp test --project unit packages/api/test/play.test.ts` — 18 pass: `GET /play/:id` with a valid token (`combatId`, `playerId`, `language` = DM's `user.language`, `combat` equals `project(combat, player)`, no `linkGeneration`), 400 without a ULID in `X-Player-Id`, 404 tampered token, 404 token of another combat / combat gone / path id mismatch, 400 without `t`, 410 `linkRevoked` for a non-current generation; `POST /play/:id/actions` claim records the display name in `players`, GET upserts the row from the document, own-hero action ok, 403 on another player's hero and on an enemy, 403 on a DM-only action, 409 on a stale version, 404 tampered / 400 no player id / 400 malformed action; `GET /play/:id/events` 400 on missing or malformed `playerId` or `t`, 404 tampered, initial projection and relayed projection walked key by key against the visibility table (own hero, other hero, ally, enemy; disabled unit absent; top-level keys = `Combat` minus `linkGeneration`), `linkRevoked` after reissue closes the stream and the old token answers 410 on all three routes, `deleted` with the title closes the stream.
- `pnpm build` — exit 0.
- `bash scripts/check-commit.sh master..agent/3-server-live` — 2 commits pass (340 and 530 changed lines).
- `git diff 635d7d5..HEAD -- packages/api/src/client.ts packages/api/src/db/schema.ts` — empty.

## Questions

1. 410 covers every generation that is not the current one, older or newer, once the signature is valid and the combat exists; a bad signature, a malformed token, a token whose combat id differs from the path id, and a missing combat all answer 404 `{ code: 'notFound' }`. `verifyLink` is called without `current`; the generation is compared against the stored `linkGeneration` directly so that the two cases get different statuses.
2. `hono-client.ts` `ERROR_CODES` has no entry for 410, so the client turns the 410 `{ code: 'linkRevoked' }` into an `ApiError` with code `invalid` and status 410. `client.ts` is off limits for this batch and `hono-client.ts` was edited only to delete the two play stubs, so the mapping is left to the owner; the UI can branch on `error.status === 410` until then.
3. The `players` row is upserted whenever the document knows the name: `GET /play/:id` reads `combat.players[playerId]`, `POST /play/:id/actions` reads it from the document that `dispatch` returns (so a `claimUnit`, its replay, and any later action of a named player all keep the row current). `dispatch` itself is unchanged.
4. SSE events carry `event: <type>` and `data` = the JSON `ApiEvent`; `document` events carry `id` = version, `deleted` and `linkRevoked` carry no `id`. The heartbeat is an empty comment line (`:` followed by a blank line) every 15 s through `setInterval`.
5. The stream subscribes to the registry before it loads the document for the initial event, so a broadcast between the two is not lost; a broadcast that lands before the initial document is older than the version the client already holds and is dropped by the client's version check.
6. A `Last-Event-ID` that is ahead of the current version (after a restore, for instance) is treated like one that is behind: the current document is sent.
7. Client abort is handled twice: `stream.onAbort` (body cancelled, the path `@hono/node-server` takes on socket close) and `c.req.raw.signal` (`AbortSignal` in the request); both unsubscribe once. `hono/streaming` itself hooks the signal only on old Bun versions.
8. `X-Player-Id` is read with `c.req.header` and validated with `ulidSchema` (400 `{ code: 'invalid' }` when absent or not a ULID), not with `zValidator('header')`: a header validator would put `header` into the `hc` input type and break `play.get` / `play.dispatch` in `hono-client.ts`, which pass the header in the second argument.
9. The per-subscriber viewer in the registry was already in place from `3-server-actions` (`broadcastDocument` projects per subscriber); it is kept unchanged.
10. `hono-client.ts`: the planned stubs `/play/:id` and `/play/:id/actions` were deleted together with the then-unused `TokenQuery` type and the `Action`, `PlayView`, `VersionResult` type imports; the real routes now type the client calls. No other line changed.
11. `packages/api/tsconfig.json` still includes only `src`, so `packages/api/test/**` is type-checked by `vp check` (tsgolint) but not by `tsc -b`, as reported by `3-server-schema`; left as is.
12. The test SSE reader lives in `packages/api/test/sse.ts` (parses blocks, comments, `id`, `event`, `data`, and reports stream close); `helpers.ts` is unchanged.

## Differences from the renders

None; this batch has no renders.

## Dependencies needed

None.

## Left undone

None.

## Processes left running

none
