# Guard: fix-13-default-names (8d319f2..5e90c3a)

CRIT 1 PASS CombatFormSheet.tsx:69, PresetFormSheet.tsx:111, UnitForm.tsx:223
CRIT 2 PASS .claude/run/fix-13-default-names/summary.log

Findings (P3, accepted):
1. CombatFormSheet `now?: number` prop wired from CombatList.tsx:290 — unlisted seam for a stable date in stories.
