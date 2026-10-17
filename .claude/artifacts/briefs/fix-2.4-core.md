# Brief: fix-2.4-core

Batch `fix-2.4-core`, phase 2.4 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
the domain, API and hook half of `fix-2.4` (the UI half is `fix-2.4`, after
this batch). Rules: `CLAUDE.md` (all sections). Inputs: the guard files
`.claude/artifacts/guard/2.4-api-hooks.md`, `2.4-CombatList.md`,
`2.4-AppPages.md`, `2.4-PlayerView.md`, `fix-2.3-organisms-i.md`, and the
progress file `.claude/artifacts/2026-10-16-handoff-build-progress.md`
sections «Вопросы владельцу» and «Замечания guard-bee P2–P3, отложены»
(entries routed to `fix-2.4`). They carry the line anchors and the failure
scenarios; this brief is the list to build.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-2.4-core`,
  branch `agent/fix-2.4-core`. Work only inside that path.
- Tool-call limit: 350. At the limit, write `REPORT.md`, stop every process,
  hand back with what is committed; list the units not done under Left undone.

## Units, in this order, one commit each

Every behaviour fix comes with a test that fails on the old code (named in the
report with file:line of the fix).

1. `project` (`fix(domain): project`), `packages/domain/src/**`,
   `packages/domain/test/**`:
   - the own hero's `PlayerUnit` carries `initiativeBonus` (data loss: a
     player's Edit overwrote it with 0); the visibility test walks the field
     for own hero (present) and every other unit (absent);
   - `project` checks `enemy` before the claimer rule (`project.ts:35-38`);
   - `authorize` rejects a player's `editUnit` that changes `maxHp`
     (orchestrator decision 3a; vision forbids Set Max for players);
   - export a pure `applyHp(unit, kind, amount)` used by `reduce.ts` for
     damage, heal, setTempHp, setMaxHp, so the UI preview stops building a
     synthetic combat.
   - New «Решения владельца» lines are not added; test names follow vision
     rows (`check-domain-tests.mjs`).
2. `api contract` (`feat(api): api contract`), `packages/api/src/client.ts`,
   `packages/api/src/hono-client.ts`, `packages/api/src/**` (server),
   `packages/api/test/**`:
   - `CombatSummary` gains `round: number | null` and `createdAt`; the server
     list returns them;
   - `Session` gains `method: 'email' | SocialProvider` (from Better Auth's
     `account.providerId`);
   - `API_ERROR_CODES` gains `limit` and `emailTaken`; the server answers a
     duplicate sign-up e-mail with `emailTaken` and the combat/preset caps
     with `limit`;
   - SSE: on a non-200 stream the client no longer waits for the browser:
     401 on the probe → `ApiError` `unauthorized` to `onEnd`'s caller (a
     new `ApiEndEvent` `{ type: 'unauthorized' }`); any other non-200 →
     the client reopens the `EventSource` itself with backoff (1, 2, 4, 8 s,
     cap 15 s) and reports `reconnecting` until it opens.
3. `FakeApiClient` (`fix(ui): FakeApiClient`), `packages/ui/src/api/**`,
   `packages/ui/test/api/**`, `packages/ui/src/storybook/withApi.tsx`:
   mirrors unit 2 (summary fields, `method`, `limit`, `emailTaken`,
   `unauthorized` end), `setConnection` models the client state the hooks see;
   `withApi` replaces the meta scenario with the story's instead of merging
   (`parameters.scenario` deep-merge); `SocialProvider` imported from
   `@combat-planner/api/client` in `scenarios.ts`.
4. `hooks` (`fix(ui): hooks`), `packages/ui/src/hooks/**`,
   `packages/ui/test/hooks/**`, `packages/ui/src/i18n/<lng>/Toast.json`:
   - one connection watcher per `ApiProvider`; the «Reconnecting…» toast shows
     at once on `reconnecting` (the client already waited 10 s);
   - sign-in, sign-out, sign-up and account removal call
     `queryClient.clear()`; `useCombat` returns no document after a failed
     refetch for another session; `unauthorized` end → `ended` with that type;
   - `combats.open` on every entry to a combat (Last played);
   - a toast's Retry resolves the original call's promise with the retried
     result, so `create` navigates and `socialSignIn` redirects after Retry;
   - `ended` resets when `id`, `viewer` or `token` changes;
   - `settings.update` invalidates the session;
   - `useCombat` and `useCombatList` expose `refetch`;
   - toast items carry `kind: 'success' | 'neutral' | 'warning' | 'error'`;
   - `limit` maps to a toast (copy per vision: «This combat already has 99
     units», «limit reached» for combats and presets);
   - `Toast.presetAdded` («{{name}} added to Library», from `2.4-Library`)
     is the one key for that toast: `Toast.presetSaved` is removed from the
     six locales and its users point to `presetAdded`;
   - the «first connect» test goes offline → connected.

## Allowed paths

As listed per unit, plus `pnpm-lock.yaml` only if a dependency already in
`CLAUDE.md` Dependencies is needed. Nothing under `packages/ui/src/atoms`,
`molecules`, `organisms`, `screens` (the UI half is `fix-2.4`), no `index.ts`.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build`,
   `pnpm storybook:build` exit 0; `pnpm exec vp test --project visual` passes
   without `--update` (a screen story that a hook change legitimately alters
   is listed in the report, not regenerated here).
2. Every item above is closed with file and line in `REPORT.md`, each
   behaviour item with a test that fails on the old code.
3. The own hero's `initiativeBonus` reaches the player document and no other
   unit's does; a player's `editUnit` with a changed `maxHp` is rejected.
4. SSE: a 401 probe ends the stream with `unauthorized`; a 502 reopens it
   with backoff and ends `reconnecting` on success; both streams, tested.
5. Four commits `fix(domain): project`, `feat(api): api contract`,
   `fix(ui): FakeApiClient`, `fix(ui): hooks`, each inside its paths; no
   comments; trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
