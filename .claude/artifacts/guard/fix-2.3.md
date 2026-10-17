# Guard fix-2.3

Range `2b5edec..39671d9` (32 commits). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/fix-2.3/summary.log:4-23 — check, test, visual, storybook-build, scripts-test exit 0; one RUN each, no «optimized dependencies changed».
CRIT 2 FAIL .claude/artifacts/reports/fix-2.3.md:15-38 — file:line only for units 3, 4, 6. Code and fails-old hold (per-unit list below serves as the file:line record).
CRIT 3 PASS scripts/check-stories.mjs:12,97-102,106-157 — `items`/`rows`, `NP-n`, numeric suffix; fixtures expect messages the old script cannot produce.
CRIT 4 PASS .claude/run/fix-2.3/check-i18n.log:1 — touched namespaces keep identical keys; allow-same.txt appended at :19.
CRIT 5 PASS .claude/run/fix-2.3/check-comments.log:1 — subjects in unit order, no comments; Fable 5.1 trailer except the orchestrator splits dc565fd, 9326f29 (Opus 5.5). check-commit red only on the recorded baseline exception 39671d9.

## Per-unit file:line (at HEAD)

1 optimizeDeps: vite.config.ts `browserOptimizeDeps` (storybook, visual). 2 check-stories (d9a1a38): HpHistory ru `EdgeCasesInline2`/`EdgeCasesSheet2`; HpBox `EdgeCasesThreeDigits999999`/`…9999992` swap consistent. 3 Stepper.tsx:32, :121; UnitForm.module.css:71; `ExtraEmptyDecrease`. 4 TextField.tsx:55. 5 SearchField.tsx:72. 6 IconButton.module.css:57-68. 7 RoleBlock.tsx:65, .module.css:25. 8 NoteField.tsx:59. 9 CheckList.tsx:53, :102-114. 10 HpBox.tsx:86. 11 InitiativePopover.tsx:8, :68, :90. 12 Menu.tsx:129, :200, :216, stories:81. 13 Sheet.tsx:11, :54, :66-83. 14 Dialog.tsx:56, fr Dialog.json:7, :19. 15 Drawer.tsx:79, :91. 16 TurnBar.json:7, TurnBar.module.css:74. 17 BottomBar.tsx:13, layout.ts:11. 18 ConditionPicker.module.css:20. 19 TagSheet.tsx:30, :52-55, :73, :105. 20 PlayerHeader.tsx:52, allow-same.txt:19. 21 CombatHeader.tsx:50, :64, :244, :280, :290, :328, :377, :381. 22 ShareSheet.tsx:15, :79. 23 PlayerRow.tsx:105, .module.css:30. 24 UnitRow.tsx:72, :165, :194, :201, :217, .module.css:23, :28. 25 PresetCard.tsx:64. 26 HpHistory stories:529-531, HpHistory.tsx:52, :74. 27 UnitForm.tsx:171-188, :334, :377, .module.css:24, :71. 28 NumpadSheet.tsx:242, :246-248, :257, .module.css:251-263.

Every modified baseline pixel-diffed; each change sits where its unit predicts (UnitForm `+0`, open sheets, `#FAF6EE`, red counter; TextField counter; Menu label; ConditionPicker ring; TagSheet reopen and `new` row; PlayerHeader icon; CombatHeader round refocus; PlayerRow 14×14 corner ×9; UnitRow claimed/disabled/ink marker; NumpadSheet anti-aliasing ≤31/255; 39671d9 as in the hand-back).

## Findings

1. P2 report fix-2.3.md:15-38: no file:line for units 5, 7–28 (documentary; the list above closes it).
2. P3 Sheet.tsx:54: with motion on focus sits on × for ~200 ms before the section; Enter/Space then closes; Sheet.stories.tsx:378 checks only the end state.
3. P3 PlayerRow.same.txt:3, TagSheet.same.txt:2: stale identity groups (hashes differ); the report's reason for leaving them is false.
4. P3 en/NumpadSheet.json:20: `close` unused in six locales.
5. P3 report :62 understates NumpadSheet anti-aliasing (Anatomy.png up to 31/255).
6. P3 TagSheet.tsx:30, UnitRow.tsx:72: «Show all shows presetCount» and «callbacks optional when readOnly» closed by types only; the plays pass on old code.
7. P3 HpHistory.tsx:40-58: the keyboard handler replaces native scrolling; PageDown scrolls a full `clientHeight` with no overlap row.
8. P3 hypothesis NoteField.tsx:59: save-on-unmount fires when the host removes the row (unit removed over SSE) → rejected save, error toast.

## Scope check

Inside unit paths apart from accepted/declared exceptions (39671d9 screen PNGs, 4th fixture, HpBox swap, HpHistory handler, UnitRow popover toggle, cfab926 deps). `index.ts`, `theme.ts`, other scripts untouched.

4 pass / 1 fail (documentary P2) / 0 unverifiable.
