# Report: fix-13-default-names (hand-back message, saved by the orchestrator)

## Commits
- ae67012 feat(ui): an empty combat title saves as "Combat <date>"
- 87137e3 feat(ui): an empty unit name saves as the first free "<Role> N"
- 5e90c3a feat(ui): an empty preset name saves as "<Role> 1"

## Checks run
pnpm check, pnpm test (2182), screenshots:update full (no change after commit), visual verify (1372): green.

## Questions
1. CombatFormSheet takes optional `now` for stable screenshots; CombatList passes its `now`.
2. UnitForm `unitNames?` defaults to [] (edit-mode hosts need not pass it).
3. Edit-mode preset placeholder shows the previous name; `required` removed from title/name fields.
4. Exports NoTitle, CLF23, NoName, LBF33 kept; UnitForm ExtraBlankNameBlocks → ExtraBlankNameKeepsPrevious; PresetFormSheet ExtraEditClearedName added.
5. Partial `screenshots:update -t` renders ja font differently; baselines must come from a full run.

## Left undone
none

## Processes left running
none
