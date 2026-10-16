# Guard: fix-2.2

Range `e72503c..9bc5b56`, 10 commits. Read-only; gate logs `.claude/run/fix-2.2/`. Guard on Opus 5.5 xhigh.

CRIT 1 PASS .claude/run/fix-2.2/summary.log:2-27 — install, check, test 945/945, visual 593/593 without `--update`, storybook-build, build, check scripts, scripts-test, check-commit (10) exit 0.
CRIT 2 PASS .claude/artifacts/reports/fix-2.2.md:18-30, :57-71 — every unit verified in merged code:
- U1 packages/ui/src/theme.ts:44-48 `healthTints`, :111 palette, :170 `--cp-health-tint-*`.
- U2 packages/ui/src/atoms/Chip/Chip.tsx:79 span `{...rest}`, :61 `data-condition` from `condition`; story Chip.stories.tsx:441-461.
- U3 packages/ui/src/atoms/SearchField/SearchField.tsx:47 guard; SearchField.stories.tsx:182-188 icon mousedown focuses.
- U4 packages/ui/src/molecules/Stepper/Stepper.tsx:14, :19/:48, :27-30, :126, :59/:90/:112/:140, :68-72, :74-86; Stepper.stories.tsx:211, `ExtraUnsigned` :237, `ExtraEmpty` :253.
- U5 packages/ui/src/molecules/Segmented/Segmented.tsx:50; `ExtraNoMatch` Segmented.stories.tsx:214-226.
- U6 packages/ui/src/molecules/HpBox/HpBox.module.css:3,29,34; HpBox.stories.tsx:350,357, :144/:154/:166.
- U7 packages/ui/src/molecules/HistoryRow/HistoryRow.tsx:71-79, :66; HistoryRow.module.css:34-37; HistoryRow.stories.tsx:62-63.
- U8 packages/ui/src/molecules/NoteField/NoteField.tsx:73; NoteField.stories.tsx:104.
- U9 packages/ui/src/molecules/InitiativePopover/InitiativePopover.tsx:95-96, :46, :73-78; overlay removed; `ExtraKeyDownComposed` :247.
- U10 packages/ui/src/molecules/Toast/Toast.tsx:78, :56-58.
- U11 Toast.stories.tsx:157-168, :170-182.
- Uncovered P3s listed under Left undone with reasons.
CRIT 3 PASS Stepper.tsx:14,:19; InitiativePopover.stories.tsx:101, :110-111, :132, :140, :266; regenerated baselines match the render; NoInitiativeYet.png unchanged.
CRIT 4 PASS Toast.stories.tsx:267-297 `ExtraMotionOffStays`; duration stories run with `motion: 'on'` (:209, :222, :246).
CRIT 5 PASS HpBox.module.css has no hex; theme.ts:44 `healthTints`.
CRIT 6 PASS 10 commits in brief order, one folder each plus baselines and `.same.txt`; unit 11 inside the Toast commit.

## Scope check

43 files, all in scope; no i18n, `allow-same.txt`, `index.ts` or ThemeAudit touched; `.same.txt` pairs match blob hashes.

## Findings

1. P3 packages/ui/src/molecules/Stepper/Stepper.tsx:121 — `inputMode` follows `signed`; InitiativePopover (`signed={false}`, min −9) moves to `numeric`. Hypothesis: iOS numeric keypads have no minus key. Fix: key `inputMode` on `min < 0`.
2. P3 packages/ui/src/molecules/HpBox/HpBox.stories.tsx:350-357 — the `ExtraReadOnly` spy never reaches HpBox (`viewer` always `'player'`); `not.toHaveBeenCalled()` cannot fail.
3. P3 packages/ui/src/molecules/Stepper/Stepper.stories.tsx:253-266 — `ExtraEmpty` proves only + from `null`; − from `null` not asserted.
4. P3 .claude/artifacts/reports/fix-2.2.md:29 — line refs and pre-rebase hashes are stale. Documentary.
5. P3 .claude/artifacts/2026-10-16-handoff-build-progress.md:300-301 — the deferred note on Stepper live `onChange` is stale; Stepper commits on blur/Enter.

6 pass / 0 fail / 0 unverifiable; scope held.
