# Guard fix-2.4

Range `0e6ed1d..e45eab0` (34 commits). guard-bee, Opus 5.5 xhigh, read-only. The gate ran on tip 41655d7. `git diff 41655d7 e45eab0` touches only `.claude/artifacts/**`.

CRIT 1 PASS .claude/run/fix-2.4/summary.log:4-13 — check, test, visual 1357 without `--update`, storybook-build, build.
CRIT 2 PASS .claude/artifacts/reports/fix-2.4.md:44-77 — >70 anchors hold at HEAD (one mis-cited, finding 8). Behaviour proofs fail on 0e6ed1d. The admitted test-only proofs were already correct before: UnitRow 10, ExtraHpRules, ExtraSavePresetLimit, ExtraCantReachServerRetry, APF17.
CRIT 3 PASS packages/ui/src/screens/CombatScreen/CombatScreen.tsx:420:
- `undoDisabled={!combat.undo}`; flash and toasts only on `applied` (:164-171, :272); 409 → `{applied:false}` (useCombat.test.ts:184).
- Reload: ExtraUndoFromDocument. Document after the POST: ExtraDocumentAfterPost.
- Player action shows in the DM's undo (api actions.test.ts:294-357). Depth 10, claim/release null (undo.test.ts); REST writes never logged.
- Retry resolves the original call (useCombat.test.ts:200-286). Players never receive `undo` (live/registry.ts:35-36, actions.test.ts:317).
CRIT 4 PASS packages/ui/src/i18n/allow-same.txt — 10 namespaces with identical keys across 6 locales; `presetSaved` gone; check-i18n green.
CRIT 5 FAIL packages/ui/src/screens/Heroes/Heroes.tsx:22 — subjects, trailer, comments and size pass. The 8 accepted cross-folder changes hold only what the report names. Mechanically tied edits not on the accepted list, none hiding unrelated source:
- 4fa1950 undo: CombatScreen, Heroes and TurnOrder import path and `DispatchResult` type.
- 104b691 CombatList: `screens/shared/toastLook.ts`.
- 741f6dc SignIn: `screens/shared/ScreenToast.tsx`, `SocialButtons.*`.
- 7a6ba94 AppPages: APF16/APF35 baselines caused by SignIn/Account.

Orchestrator: CRIT 5 accepted as scope exception (owner question with the check-commit list).

## Render check

- CS-F3.5 MATCH (Heal focused, After 28/36 Wounded, «3 changes")
- CS-F3.6 MATCH (Set Temp focused, After 14/40 Bloodied «+5 temp», «6 changes»)
- CS-F3.8 MATCH (Set Max focused, After 14/30 Bloodied)
- CS-F6.7 MATCH (Orc greyed and collapsed)
- CS-F7.4 MATCH (Share closed, «Link copied» above Next turn; extra focus ring on Menu)
- HP history MATCH (Orc 6 changes; Vashti 3 entries)
- CS-F8.1 DIFF: Goblin Archer 3 drawn active. The render shows no active row, which is inconsistent with Tomas being next.

## Findings

1. P2 CombatScreen.tsx:174-181 with hooks/combat.ts:162-185 — every DM action runs through one queue. After a network failure, `dispatch` resolves only when the Retry toast is retried or dismissed.
   - Later taps wait up to 8 s; with `motion:'off'` they wait until the toast is dismissed.
   - The waiting taps then fire as a burst, so two Next-turn taps skip a turn.
2. P2 Heroes.tsx:127-137 — a rename sent as `releaseUnit` + `claimUnit`.
   - The release entry stops `undoTarget` (domain undo.ts:39), so the DM's Undo turns null after every player rename.
   - Another player can claim the hero between the two POSTs.
   - Hypothesis: a late SSE release makes PlayerView.tsx:52-64 bounce the player to Heroes.
3. P3 hypothesis CombatScreen.tsx:148-158, hooks/useCombatLink.ts:21 — after one failed `link.get` (`retry:false`), the next Share tap sees the stale error and closes with a second toast while the refetch runs.
4. P3 Library.tsx:176-210 — a rejected non-network tag create stays in `tagCreates`. Every later Save ends in a silent `catch { return; }` with no toast.
5. P3 api/combats/log.ts:78-81 — `dmDocument` loads the unpruned log on every action, GET, open, PATCH, reissue and SSE connect (cost hypothesis).
6. P3 CombatScreen.tsx:200-207 — Undo from the «removed» toast reads `latest()?.undo` before the document arrives: null, or a wrong «Undid» label.
7. P3 Account.tsx:21,46 — `blurred` never resets, so after the first blur, clearing the name shows the error while typing.
8. P3 report :58 — 13b anchor is FakeApiClient.ts:397, not :86.
9. P3 CombatScreen — unit Duplicate is not disabled at 99 units; it shows the cap toast instead (report Question 4).
10. P3 hypothesis — 741f6dc..887468b carry stale APF16/APF35 baselines until 7a6ba94.

## Outside the reviewed scope

11. P3 hypothesis hooks/toasts.ts:128-135, hooks/mutations.ts:23 — the toast store survives `queryClient.clear()`. A stale Retry of `account.update` could patch account B's name with A's draft. A combat `dispatch` gets 404 for B.

4 pass / 1 fail (accepted) / 0 unverifiable; render 6 MATCH / 1 DIFF.
