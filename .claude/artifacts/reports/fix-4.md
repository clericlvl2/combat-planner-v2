# REPORT fix-4

(The sandbox blocked `REPORT.md`; the agent returned the text, saved here by the orchestrator.)

## Commits

| Hash | Subject |
|------|---------|
| 33a6992 | fix(domain): claim |
| 1d5edae | fix(api): undo summary |
| 157f8b7 | fix(api): event stream |
| 27411cb | fix(ui): hooks |
| 7b7377c | fix(ui): UnitRow |
| 457774d | fix(ui): CombatScreen |
| 95df173 | fix(ui): Heroes |
| 1e5f591 | fix(ui): PlayerView |
| d0ca8c4 | fix(ui): Library |
| e9cee7a | fix(ui): Account |

Every test was run against the old source and failed there, unless the item says it passes on old code.

1. claim
   - `authorize.ts:36` accepts a `claimUnit` of a hero the player already holds. `reduce` is unchanged.
   - Test `authorize.test.ts:305` (the vision row); updated :155 and :325.
2. undo summary
   - `undoWindow` reads the log newest-first in pages of `undoDepth+1` (`log.ts:36`, `:51`). `dmDocument` (`:97`) and `undo` dispatch (`dispatch.ts:78`) use it; `loadLog` is removed.
   - The player SSE connect reads no log (`play/routes.ts:108`). `streamCombatEvents` takes the document from `load` (`sse.ts:14`, `:71`).
   - Tests in `log.test.ts`, 300+ entries, at most 22 rows read: :146, :152, :159, :166; player SSE reads 0 rows :175. `events.test.ts:238` is adjusted.
3. event stream
   - `PROBE_TIMEOUT_MS` = 5 s (`hono-client.ts:52`), passed as an `AbortSignal` (:424, :446). A timeout counts as a failed reopen (:319-342). `close()` aborts the probe (:268, :280).
   - Tests in `hono-client.test.ts`, for dm and player:
     - :516 and :542 pass on old code; they are coverage.
     - :564 and :588 fail on old code.
4. hooks
   - `ToastStore.clear()` (`toasts.ts:138`); an action runs only while its toast is shown (:99-103). `mutation` clears toasts with `queryClient.clear()` (`mutations.ts:27`). A failure after a session switch shows no Retry (:40, :51).
     - Tests: `useAccount.test.ts:51` (`it.each` signIn, signUp, signOut, remove), :81; `useToasts.test.ts:47`, :61.
   - `useCombatLink` hides the error while fetching (`useCombatLink.ts:24`, :43); test `useCombatLink.test.ts:8`.
   - `Dispatch` `onRetryShown` (`combat.ts:151`, :182); test `useCombat.test.ts:275`.
5. UnitRow: `duplicateDisabled` (`UnitRow.tsx:67`, :93, :147); story `ExtraDuplicateDisabled` :655.
6. CombatScreen
   - The queue step ends on settle or on the Retry toast (`CombatScreen.tsx:164`, :175-183). Later taps run on `max(document, knownVersion)`; a stale Retry gets 409.
   - The removal Undo uses its own summary (:207, :332).
   - `duplicateDisabled={atCap}` (:451).
   - Stories: ExtraTapWhileFailureToast :1152, ExtraDoubleNextTurnAfterFailure :1179, ExtraUndoRemovalBeforeDocument :1212, ExtraDuplicateAtLimit :1235. `CombatScreen.same.txt` gains a line.
7. Heroes: the rename is one `claimUnit` (`Heroes.tsx:137`); ExtraReturningRename :195 asserts one call (:207).
8. PlayerView: a 404 after a seen combat shows CombatDeleted with `seenTitle` (`PlayerView.tsx:38`, :43, :87, :92); ExtraDeletedBeforeEnd :482. `PlayerView.same.txt` gains a line.
9. Library
   - A rejected tag create is dropped into `failedTags` (`Library.tsx:141`, :186). `settleTags` :193; Save with a failed tag shows the error (:201, :204-209).
   - Story: ExtraFailedTagSave :759.
10. Account: `editName` resets `blurred` (`Account.tsx:45-47`, :88); ExtraEmptyNameAfterEarlierBlur :210.

## Checks run

- These exit 0:
  - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
  - `pnpm test` (2080);
  - `pnpm build`;
  - `pnpm storybook:build`;
  - visual without `--update` (1365);
  - `scripts/test/run.mjs`;
  - check-commit (10 commits).
- d0ca8c4 was amended before the hand-back to fix an oxlint `await-thenable` warning.

## Questions

1. `PROBE_TIMEOUT_MS` = 5 s; the sources give no value.
2. A first-load 404 before any document was seen still shows UnexpectedError, because no title is known for CombatDeleted.
3. The removal Undo always uses the removal's own summary. A newer action arriving before the tap is undone by the server's `undo`, but labelled as the removal.
4. `onRetryShown` lives in `fix(ui): hooks` to keep each commit inside its paths.
5. In TanStack Query 5, a failed first `link.get` resets its error on refetch. The stale-error case only follows an earlier success, which is what the test covers.

## Differences from the renders

None.

## Dependencies needed

None.

## Left undone

No `.docker-*` marker; baselines come from the local Chromium.

## Processes left running

none
