# Guard: fix-21-geometry-scope (468dc85..e7d006a)

CRIT 1 FAIL packages/ui/src/storybook/geometry.ts:170-186 finding 5 paint-order half open (outside unit 3) → accepted
CRIT 2 PASS whole-story opt-outs only Stepper S, SwatchRow, InitiativePopover, ThemeAudit
CRIT 3 PASS .claude/run/fix-21-geometry-scope/summary.log, e2e.log 24 passed

fix-15 findings: 1 measured; 2, 3, 4, 6, 10 fixed; 5 half; 7 fixed, weak test.
Unverifiable: Storybook Docs pages under the 390 viewport global.

Findings:
1. P2 PresetCard.stories.tsx:329 `span:first-child + span:last-child` also matches StatSquare value spans and RoleBlock label → fix-22.
2. P3 geometry.ts:414-418 an except selector matching nothing passes silently → fix-22.
3. P3 NoteField.stories.tsx:173-175 play clicks the centre with the textarea already focused → fix-22.
4. P3 Checkbox.module.css:18, Radio.module.css:18 min-height 44px literal → fix-22.
5. P3 commit scope (fonts wait in a test commit; unit 1 location deviation, correct) → accepted.
6. P3 ru Menu «Сбросить бой» next to «Очистить бой» → owner.
