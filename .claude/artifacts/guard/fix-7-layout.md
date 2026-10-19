# Guard fix-7-layout

Range `65d25dc..6c85a15` (viewport, Sheet). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/fix-7-layout/summary.log:8-9, 26-27 — visual 1372 without `--update`, e2e 22. check-commit flags 9 consumer folders, the accepted shared-component exception.
CRIT 2 PASS apps/web/src/root.css:5-21; e2e/layout.spec.ts:33-35; Sheet.module.css:105-106; Sheet.stories.tsx:490-493.
- Every screen root stretches: DM, auth, player, and the system screens through MessageScreen. The chain from `#root` emits no DOM.
- There is no double scrollbar and no horizontal overflow, and header and action spacing are unchanged.
- Sample baselines show the rings now drawn whole.
CRIT 3 PASS summary.log:31-32 — no listeners.
CRIT 4 PASS — subjects, paths, no comments, trailer.

## Findings

1. P2 Sheet.module.css:105-106 — in a scrolled sheet the clip edge sits 6px into the 12px gap (8px from the border when there are no actions), so slivers of scrolled-out content show. Baselines:
   - NumpadSheet/OpenEveryKind y126-127: a stray rule under the header;
   - CSF39, OpenAFewChanges, CSF12;
   - the NumpadSheet language stories y816-821.

   Owner decision.
2. P3 Sheet.stories.tsx:470-493 — TextField draws no keyboard outline (TextField.module.css:56-58, 115), so the story proves geometry only, and its top check is vacuous.
3. P3 CombatFormSheet/ExtraJapaneseNew.png — a 1px difference between `-t` and full runs. Not a gate risk, since the gate always runs full, but `--update -t` can write a baseline that the full run rejects. CLF23/CLF32 carry anti-aliasing noise.
4. P3 — SortSheet and UnitForm baselines changed (rings only) but are not named in the brief's consumer list. They are covered by the exception.

No other scroll container clips rings: padding under 6px holds only inset rings or non-focusable rows.

4 pass / 0 fail; scope held.
