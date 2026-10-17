# Guard fix-5

Range `6e084d0..ae4bddd` (11 commits). guard-bee, Opus 5.5 xhigh, read-only. The gate ran on 9b50339. `git diff 9b50339 ae4bddd` touches only `.claude/artifacts/**`.

CRIT 1 PASS .claude/run/fix-5/summary.log:2-32 — every step green except check-commit, which flags only the accepted PlayerView/CombatDeleted commit. Visual 1371, e2e 21 passed, no `test.fail()` left.
CRIT 2 PASS — every item is closed at its line, and each test fails on 6e084d0. One exception: the event-stream test (finding 1) is unverified.
CRIT 3 PASS:
- sign-out through the UI, then `/combats` redirects to sign-in in the built app (auth.spec.ts:5-23);
- the undo is pinned to `removal.version`; the server requires an equal version and every action adds 1 (dispatch.ts:72, reduce.ts:518). There is no off-by-one;
- a newer action makes the undo answer 409 and leaves the document as it was.
CRIT 4 PASS summary.log:31-32 — no listeners.
CRIT 5 PASS — eleven subjects in order, in their paths. The only added `//` is an allowed `@ts-expect-error`. Trailer present. `signOutFailed` is translated in all six locales.

Extra checks:
- the normal Undo still restores the unit (ExtraRemoveUndone :1011, ExtraUndoRemovalBeforeDocument :1242);
- `followLanguage` is wired (provider.tsx:128) and restores on unmount;
- the generation changes only on a session change;
- no deleted stories, no changed baselines;
- `CombatDeleted` is used only by PlayerView.

## Findings

1. P3 hypothesis packages/api/tsconfig.json:7 — the test directory is outside every tsconfig. The `@ts-expect-error` at events.test.ts:277 is enforced only if tsgolint checks files no tsconfig includes, and that is unconfirmed.
2. P3 provider.tsx:128 — the wiring has no test.
3. P3 hypothesis provider.tsx:58,65 — overlapping providers restore the wrong `lang`. Nothing overlaps today.
4. P3 auth.test.ts:394 — the test name says Node HTTP transport, but the test uses in-process `app.request`.
5. P3 PlayerView.tsx:92-94 — a forged or corrupted token (a 404 from `verifyLink`) also shows «This combat was deleted».
6. P3 — `toastedCodes` is duplicated at Account.tsx:16 and CombatScreen.tsx:102.
7. P3 — the report lists pre-rebase hashes.

5 pass / 0 fail; scope held.
