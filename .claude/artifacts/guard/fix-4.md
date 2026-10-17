# Guard fix-4

Range `e42d8a7..07e346e` (10 commits). guard-bee, Opus 5.5 xhigh, read-only. The gate ran on 9a66606. `git diff 9a66606 07e346e` touches only `.claude/artifacts/**`.

CRIT 1 PASS .claude/run/fix-4/summary.log:2-27 — test 2129, visual 1366 without `--update`, all checks and check-commit green.
CRIT 2 PASS .claude/artifacts/reports/fix-4.md:22-50 — anchors hold at HEAD. Every behaviour test fails on e42d8a7; hono-client.test.ts:516 and :542 are admitted coverage-only.
CRIT 3 PASS Heroes.tsx:137; CombatScreen.tsx:175-184:
- the rename is one `claimUnit`;
- the queue never loses or re-sends a step, and a Retry keeps its action id (dispatch.ts:66-68);
- toasts are cleared on a session change (mutations.ts:25-27), the `shown(id)` guard holds (toasts.ts:99-105), and `generation` guards account requests.
CRIT 4 PASS packages/api/src/combats/log.ts:51-61; play/routes.ts:105-109:
- `undoWindow` equals `undoSummary` and `undoTarget` over the full log;
- the read is bounded (≤ 31 entries);
- a player SSE connect reads no log.
CRIT 5 PASS — ten subjects, inside their paths, no comments, trailer present, no deleted stories or tests.

No regressions found:
- `close()` aborts the probe;
- the deleted-account toast survives `clear()`, because `settle` clears and then shows it.

## Findings

1. P2 CombatScreen.tsx:332, :207-214 — Undo on the «X removed» toast sends a plain `undo` at the newest version but labels it as the removal.
   - Scenario: within the toast's 8 s the DM taps Next turn, or a player's damage arrives. Undo then reverts that newer action, the toast reads «Undid: Orc Berserker removed», and the Orc stays removed.
   - Possible fix: pin the undo to the removal's own result version (409 if anything newer landed), or use the summary only when `latest()?.undo?.action.id === removal.id`.
2. P3 hypothesis hooks/combat.ts:153-185 — `createDispatcher` has no `generation` check. A stalled POST that fails after a sign-out shows a Retry toast under the new session.
3. P3 hypothesis Library.tsx:141, :186, :201-212 — `failedTags` is never pruned. A tag the server saved, after a lost response, blocks every later Save that uses it.
4. P3 api/test/log.test.ts:27 — `ROW_BOUND = 22` holds only for the tested logs; the worst case is 33 rows, and no test reaches the third page.
5. P3 pre-existing Toast.tsx:108-111 with toasts.ts:99-105 — during the 150 ms exit, a double tap on Undo queues two `undo` actions.
6. P3 api/src/live/sse.ts:14, :71 — `streamCombatEvents` no longer projects for the viewer, and the `load` type accepts a `DmCombat` for a player. Both current callers are correct.
7. P3 accepted Heroes.tsx:137, undo.ts:38 — a rename claim nulls the DM's Undo, per vision Action log 9–10.
8. P3 report :9-18 — the commit table lists pre-rebase hashes (master has 78fa2e1…07e346e).

## Outside the reviewed scope

9. P3 pre-existing PlayerView.tsx:89-99 — the first open of a link to an already deleted combat shows UnexpectedError, because `seenTitle` is unset.

5 pass / 0 fail / 0 unverifiable; scope held.
