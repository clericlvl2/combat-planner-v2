# Guard: fix-15-geometry (a22bf85..b33382c)

CRIT 1 PASS packages/ui/.storybook/preview.tsx:32-34, geometry.ts:305-342
CRIT 2 FAIL packages/ui/__screenshots__/ 76 changed; 73 caused by fixes (286b8bb 71, 104d44a, 2fcab0e); 3 in 3d6945c without a proven cause
CRIT 3 PASS .claude/run/fix-15-geometry/summary.log, e2e.log 24 passed

Findings:
1. P2 SearchField.module.css:1-3 / 3d6945c: Library/LBF15, LBF16, UnitForm/LibraryNothingFound changed by invisible CSS; cause unproven → fix-21.
2. P2 CombatHeader.stories.tsx:179, Dialog.stories.tsx: no story renders the restart dialog in fr/ru/de or CombatHeader setup in de/es/ru/fr → fix-21.
3. P2 TurnBar.stories.tsx:80 and others: opt-outs cover the whole story, not the element (TurnBar ru, ShareSheet meta, CombatScreen :762 :795 :1062, CombatHeader :208, tapTargets in NoteField, PlayerRow, HpHistory, TagSheet, ShareSheet) → fix-21.
4. P2 geometry.ts:38-39, PhoneFrame.tsx:79-85: unframed stories are not measured at 390; frame/overlay checks return [] without a frame → fix-21.
5. P3 geometry.ts:239-245: hit area unions labels across gaps; ignores paint order → fix-21.
6. P3 44px literal in 17 CSS rules, not linked to layout.tapTarget → fix-21.
7. P3 NoteField.tsx:65-70: no play covers the frame-tap focus → fix-21.
8. P3 PresetFormSheet.same.txt:1 identical baselines → accepted.
9. P3 PhoneFrame.module.css:15 contain: layout makes overlay check true by construction → accepted until responsive work.
10. P3 fr/Dialog.json:5 button «Relancer», title «Recommencer le combat ?» → fix-21.
