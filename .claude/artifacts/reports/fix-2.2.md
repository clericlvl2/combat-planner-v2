# REPORT fix-2.2

## Commits

- 808e760 fix(ui): theme
- b558b18 fix(ui): Chip
- 613a666 fix(ui): SearchField
- 0722892 fix(ui): Stepper
- eadfa15 fix(ui): Segmented
- 2d2038b fix(ui): HpBox
- a05c76d fix(ui): HistoryRow
- a953756 fix(ui): NoteField
- 434656a fix(ui): InitiativePopover
- 4908fab fix(ui): Toast

Unit 11 (appendix, 2.2-molecules-e) is inside 4908fab as the brief says; EmptyState has nothing to fix, so it has no commit.

Closures, unit by unit:

1. theme: `healthTints` `{ full: '#E3F1E6', wounded: '#F8ECD2', bloodied: '#FBE3D8' }` at packages/ui/src/theme.ts:44, in `palette` at :111, CSS variables `--cp-health-tint-<status>` through the `'health-tint'` group at :170. ThemeAudit is not changed.
2. Chip: a static `span` forwards `...rest` at packages/ui/src/atoms/Chip/Chip.tsx:79; `data-condition` is emitted only from `condition` (:61). Story `ExtraStaticForwardsProps` at Chip.stories.tsx:441 asserts that `data-part`, `aria-describedby` and `id` reach the span and that there is no `data-condition`. Existing baselines are unchanged; one new baseline for the new story.
3. SearchField: guard `event.target === inputRef.current` at packages/ui/src/atoms/SearchField/SearchField.tsx:47. `ExtraFrameClick` now also clicks the leading icon svg and asserts focus (SearchField.stories.tsx:183-188). It fails on the old guard and passes on the new one.
4. Stepper: `signed = min < 0` default at packages/ui/src/molecules/Stepper/Stepper.tsx:48. `value: number | null` renders `—` (:27, :30). `aria-valuenow` is omitted when the value is null (:126). − / + / arrows step from `value ?? 0` (:59). `handleText` only stores the draft (:68-72) and commits on blur and on Enter. `ExtraClampAtBounds` asserts that typing does not call `onChange` (Stepper.stories.tsx:211). New stories `ExtraUnsigned` (:237) and `ExtraEmpty` (:253) have `play` and baselines. Existing baselines are unchanged.
5. Segmented: `selectedIndex >= 0` guard at packages/ui/src/molecules/Segmented/Segmented.tsx:50. Story `ExtraNoMatch` (Segmented.stories.tsx:214) tabs to Hero and moves with an arrow. It fails on the old code.
6. HpBox: the tints are now `var(--cp-health-tint-*)` at packages/ui/src/molecules/HpBox/HpBox.module.css:3,29,34, and the file has no hex. `ExtraReadOnly` (HpBox.stories.tsx:348) passes an `fn()` `onClick` that the consumer withholds for a player viewer, then asserts no call (:357). The player cells assert the three tints against `healthTints` (:144, :154, :166). Baselines are unchanged.
7. HistoryRow: the wrapper span is gone; `Chip` gets `data-part="kind"` and `variant="meta"` (packages/ui/src/molecules/HistoryRow/HistoryRow.tsx:72-75). The fill and text colours come only from `--chip-fill`/`--chip-text` through `.change > .kind[data-variant]` (HistoryRow.module.css:34-37). `i18n.resolvedLanguage` is at HistoryRow.tsx:66. Anatomy asserts there is no `data-condition` (HistoryRow.stories.tsx:63). Pixels are unchanged, so no baselines were regenerated.
8. NoteField: `IconNote` has `role="img"` with its `aria-label` (packages/ui/src/molecules/NoteField/NoteField.tsx:73). The `Line` story asserts `getByRole('img', { name: 'Note' })` (NoteField.stories.tsx:104). Baselines are unchanged.
9. InitiativePopover: passes `value={value}` and `signed={false}` to Stepper (packages/ui/src/molecules/InitiativePopover/InitiativePopover.tsx:95-96). The overlay and the `data-empty` CSS are removed. The consumer's `onKeyDown` runs before the Escape handler (:46, :74). Stories assert `15` (InitiativePopover.stories.tsx:101), `—` without `aria-valuenow` (:110), `4` (:132), `27` (:140) and `17` (:266). New story `ExtraKeyDownComposed` (:247). 12 baselines were regenerated, plus 1 new one. `ExtraKeyDownComposed` is added to `InitiativePopover.same.txt`.
10. Toast: the auto-hide effect returns early under `motion: 'off'` (packages/ui/src/molecules/Toast/Toast.tsx:78). Dismiss and action still call `onHide` at once through `hide()`. Story `ExtraMotionOffStays` (Toast.stories.tsx:267) replaces `setTimeout` with a fake that fires any timer of `toastDuration.plain` at once. It asserts that the toast is still rendered and `onHide` was not called, and that Dismiss then hides it. It fails on the old code. `ExtraAutoHide`, `ExtraDefaultDuration` and `ExtraActionDuration` now run with `parameters: { motion: 'on' }` (:196, :209, :222). The duration stories wait for the enter animation to finish before the screenshot.
11. Appendix: `ExtraKeyboard` (Toast.stories.tsx:157) asserts that Enter on Retry calls both `onAction` and `onHide`. The new `ExtraKeyboardDismiss` (:170) asserts no hide before Space and exactly one `onHide` after Space on Dismiss. The `Toast.show` key and the vision copy keys are left as they are. EmptyState: nothing to fix. The baseline `ExtraKeyboard` was regenerated; `ExtraKeyboardDismiss` and `ExtraMotionOffStays` are new. `Toast.same.txt` gets `ExtraAction ExtraKeyboard` and `ExtraDismissMotionOn ExtraMotionOffStays`.

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: exit 0 before each commit and on 4908fab.
- `pnpm test`: exit 0, 917 tests.
- `pnpm exec vp test --project visual` (all components, no `--update`): exit 0, 593 tests. Every regenerated or new baseline was checked by a second run without `--update`.
- `pnpm storybook:build`: exit 0.
- `pnpm build`: exit 0.
- `node scripts/check-*.mjs` (each one, `COMBAT_PLANNER_NO_DOCKER=1`): exit 0.
- `bash scripts/check-commit.sh master..agent/fix-2.2`: exit 0, 10 commits.

## Questions

1. Stepper from `null`: − / + / arrows step from 0, so + gives `1` and − gives `−1`, clamped to `min`. The brief says "start at 0". I read that as "the base is 0", which matches the accepted behaviour of 2.2-molecules-d. If the first press should land on exactly `0`, that is a one-line change at Stepper.tsx:59.
2. HistoryRow kind chip: Chip has no variant that reads `--chip-fill`/`--chip-text` except `condition`. The chip uses `variant="meta"` (borderless, non-interactive), and HistoryRow.module.css applies the two variables. The alternative would be a Chip change outside unit 7.
3. HpBox `ExtraReadOnly`: HpBox is read-only exactly when `onClick` is absent. So the story models a consumer that passes the spy only for `viewer === 'dm'` and asserts the spy is not called. A `readOnly` prop is not added.

## Differences from the renders

- InitiativePopover: positive values have no sign, and `—` is rendered by the Stepper field. Both now match the page; the `+15` deviation is gone.
- Otherwise as recorded for 2.2-molecules-a…e.

## Dependencies needed

none

## Left undone

- Baselines come from the local Playwright Chromium. Docker is unreachable, and no `.docker-*` marker is written.
- P3s from the guard files that no unit covers:
  - fix-2.1 #1: documentary P2; the closures are verified in the guard file.
  - fix-2.1 #3: `TextField` default `maxLength = LIMITS.unitName`. The orchestrator decided that consumers pass `maxLength` explicitly, and TextField is outside the allowed paths.
  - fix-2.1 #4: no action, accepted.
  - 2.2-molecules-a #3: `RadioList.alphabetical` `A–Z` in allow-same is an owner call.
  - 2.2-molecules-a #4: RadioList locale names belong to the Settings screen in 2.4.
  - 2.2-molecules-c #2: `/max` of old history rows; `HpHistoryEntry` has no max, so this is an owner question.
  - 2.2-molecules-c #4: `HistoryRow` keys in allow-same for de are an owner call.
  - 2.2-molecules-d #2: NoteField `label?`, deferred by the orchestrator.
  - 2.2-molecules-d #3: story-only keys `NoteField.collapseRow` and `InitiativePopover.anchor`, deferred by the orchestrator.
  - 2.2-molecules-e #3: `Toast.show` stays by the orchestrator's decision in the brief appendix.
  - 2.2-molecules-e #4: the vision copy stays by the orchestrator's decision in the brief appendix.

## Processes left running

none
