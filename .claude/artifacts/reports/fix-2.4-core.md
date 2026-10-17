# REPORT fix-2.4-core

Text delivered by the agent in its hand-back (REPORT.md write blocked); saved by the orchestrator. Hashes are pre-rebase. Trailer `Co-Authored-By: Claude Fable 5.1`.

## Commits

### 3442902 fix(domain): project

1. Own hero carries `initiativeBonus`: packages/domain/src/project.ts:39, schemas.ts:155. Tests project.test.ts:362 (`Initiative bonus | Own Hero`, `| Other Hero, Ally`, `| Enemy` absent), :191 (`OWN_COLUMN` :129 includes it), :390.
2. `enemy` checked before the claimer rule: project.ts:35; test project.test.ts:214.
3. `authorize` rejects a player's `editUnit` changing `maxHp`: authorize.ts:49; test authorize.test.ts:260 (`Edit in the form` now edits AC).
4. Pure `applyHp(unit, kind, amount)`, type `HpFields`: reduce.ts:147, used through `changeHp` (:173) for damage, heal, setTempHp, setMaxHp, editUnit; exported index.ts:131; tests reduce.test.ts:835, :850.
All fail on 2550de6 (7 failures).

### 2feddba feat(api): api contract

1. `CombatSummary.round: number | null`, `createdAt`: client.ts:75, :78; combats/store.ts:25; test combats.test.ts:149.
2. `Session.method: 'email' | SocialProvider` (`SIGN_IN_METHODS`, `signInMethodSchema`, client.ts:52); server from Better Auth `account.providerId` (auth/method.ts:9, auth/index.ts:188, :196), `PATCH /account` (account/store.ts:31); hono-client.ts:450. Tests auth.test.ts:116, :341; account.test.ts:116; hono-client.test.ts:213, :229.
3. `API_ERROR_CODES` + `limit`, `emailTaken` (client.ts:155); Better Auth `USER_ALREADY_EXISTS*` → 422 `emailTaken` (auth/index.ts:182); `limit` no longer collapsed to `invalid`. Tests auth.test.ts:71, hono-client.test.ts:155.
4. SSE: `ApiEndEvent` `{ type: 'unauthorized' }` (client.ts:192); 401 probe → `unauthorized` (hono-client.ts:290); a stream closed for good (`readyState === EVENT_SOURCE_CLOSED`) is reopened with `REOPEN_DELAYS_MS` 1, 2, 4, 8 s, cap 15 s (:55, :296), `reconnecting` after 10 s until open; `EventSourceLike.readyState`. Tests hono-client.test.ts:405 (401), :420 (502 backoff, reset after open), both streams.
5. play.test.ts:53 own-hero column list gains `initiativeBonus`.
New api tests fail on 3442902 (13 failures).

### 43141a5 fix(ui): FakeApiClient

1. Summaries `round`, `createdAt`: FakeApiClient.ts:115; test FakeApiClient.test.ts:332.
2. `method` (sign-in `email`; `ScenarioSession` defaults `email`, scenarios.ts:19, FakeApiClient.ts:130); test :347.
3. `limit`: combat cap :308, preset cap :324, unit cap :91; `limit`/`emailTaken` 422 (:84); tests :384, :374.
4. `unauthorized` end: `subscribe` without session; `expireSession()` (:176); test :222.
5. `setConnection` models client state (:168, :226): documents held while not connected, latest delivered on `connected`; test :205.
6. `withApi` replaces the meta scenario: `scenario()` returns an object `combineParameters` does not deep-merge (scenarios.ts:63, `isScenario` :70); `withApi` accepts only such scenarios (withApi.tsx:12); tests scenarios.test.ts:7, :29.
7. `SocialProvider` from `@combat-planner/api/client` (scenarios.ts:7).
New tests fail on 2feddba (8 failures).

### aef18cd fix(ui): hooks

1. One connection watcher per `ApiProvider`, ref-counted per `QueryClient` (connection.ts:62, useConnection.ts:23); «Reconnecting…» at once (connection.ts:28); tests useConnection.test.ts:22, :37, :59, :91.
2. `queryClient.clear()` on sign-in, sign-up, sign-out, removal (`clearCache`, mutations.ts:23; account.ts:32 ff.); tests useAccount.test.ts:37, :57, :79.
3. No document after a refetch fails `unauthorized`/`forbidden`/`notFound` (combat.ts:104, useCombat.ts:86); test useCombat.test.ts:135.
4. `unauthorized` end → `ended`; test useCombat.test.ts:122.
5. `combats.open` on every entry (combat.ts:85, per-instance `entryFetcher`); tests :76, :89.
6. Retry resolves the original promise with the retried result; dismiss rejects with the original error (`ToastInput.onDismiss`, toasts.ts:91; mutations.ts:58); tests useCombatList.test.ts:68, :78, :46; usePresets.test.ts:55; useSettings.test.ts:35; useToasts.test.ts:72.
7. `ended` resets with `id`/`viewer`/`token` (combat.ts:115, useCombat.ts:92); test useCombat.test.ts:144.
8. `settings.update` invalidates the session (settings.ts:34); test useSettings.test.ts:23.
9. `refetch` on `useCombat` (useCombat.ts:94), `useCombatList` (useCombatList.ts:34); type tests useCombat.test.ts:154, useCombatList.test.ts:101.
10. Toast `kind: ToastKind` (= Toast `ToastTone`), default `neutral` (toasts.ts:9, :111); network error, version/limit/reconnecting warning, duplicated success, deleted/account deleted neutral; test useToasts.test.ts:62.
11. `limit` toasts: dispatch «This combat already has 99 units» (combat.ts:163); combats/presets `Toast.limitReached` «Limit reached» (toasts.ts:60, Toast.json:6); tests useToasts.test.ts:141, useCombat.test.ts:219, useCombatList.test.ts:88.
12. «first connect» test offline → connected (useConnection.test.ts:42).
13. `SocialProvider` from `@combat-planner/api/client` (account.ts:7, useAccount.ts).
Behaviour tests fail on 43141a5 (30 runtime failures, 17 tsc errors).

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: exit 0.
- `pnpm test`: exit 0, 106 files, 1806 tests.
- `pnpm exec vp test --project visual` without `--update`: exit 0, 1248 tests.
- `pnpm build`, `pnpm storybook:build`: exit 0.
- `bash scripts/check-commit.sh 2550de6..HEAD`: exit 0, 4 commits.
- Post-rebase probe with master's CombatScreen copied in: check + test exit 0 (1887 tests), visual 1306; copies removed.
- Intermediate commits not green alone (play.test.ts red at 3442902; ui type check red at 2feddba); branch head green.

## Questions

1. `packages/domain/src/index.ts` edited to export `applyHp`, `HpFields` (brief's «no index.ts» read as packages/ui/src/index.ts).
2. Several accounts per user: the latest `updatedAt` account decides `method`; exact per-session method needs a `session` column and a migration.
3. A mutation with a Retry toast stays pending until Retry or dismiss/timeout; with `motion: 'off'` toasts never time out.
4. `useCombat` hides the cached document only for `unauthorized`, `forbidden`, `notFound`; `network` keeps it.
5. FakeApiClient: a new subscription gets its initial document only while `connected`.
6. `Toast.limitReached` copy: en «Limit reached», de «Limit erreicht», es «Límite alcanzado», fr «Limite atteinte», ja «上限に達しました», ru «Достигнут лимит»; reconnecting toast kind `warning`.
7. Trailer Fable 5.1 per CLAUDE.md.

## Differences from the renders

None.

## Dependencies needed

None.

## Left undone

1. `Toast.presetSaved` not removed: its only user is Toast.stories.tsx:57 (outside paths); fix-2.4 switches that story to `presetAdded` and regenerates the baseline.
2. FakeApiClient `auth.signUp` still answers a taken e-mail with `invalid` (FakeApiClient.ts:375); SignUp.tsx:62 treats `invalid` as taken; switching the fake alone breaks AP-F1.5 and SignUp «Sign Up Errors». Both switch together in fix-2.4. The real server already answers `emailTaken`.
3. Screens do not yet use `ended.type === 'unauthorized'`, toast `kind`, `refetch`, `Session.method`, `CombatSummary.round`/`createdAt` (fix-2.4).
4. Process: one read-only `git worktree list` run.

## Processes left running

none
