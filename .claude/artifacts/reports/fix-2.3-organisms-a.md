# REPORT fix-2.3-organisms-a

## Commits

- `995c8cb` fix(ui): Sheet
- `97f08ff` fix(ui): Dialog

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: pass. That covers `vp check`, `tsc -b`, check-stories (30), check-i18n (29), check-screenshots (30), check-comments and check-domain-tests (84).
- `pnpm test`: 57 files, 1050 tests pass.
- `pnpm exec vp test --project visual -t 'Sheet|Dialog'` without `--update`: 41 pass.
- `pnpm storybook:build`: exit 0.
- `bash scripts/check-commit.sh 474e7c0..HEAD`: 2 commits pass.
- Each new play was also run against the old component, by putting the `HEAD~` `Sheet.tsx` or `Dialog.tsx` back in the working tree and then restoring it.
  - Sheet, failing on the old code: ExtraShiftTab, ExtraDescriptionIsSubtitle, ExtraNoActions, ExtraFragmentActions, TwoButtonsPrimaryDisabled (new description assertion) and ExtraLongContent (status-bar offset and content hook).
  - Dialog, failing on the old code: ExtraTapTextThenEscape, ExtraOverSheet, ExtraScrollLock.

## Guard findings closed

1. P1, Shift+Tab leaves the Sheet.
   - Fix: `packages/ui/src/organisms/Sheet/Sheet.tsx:32-38` and `:54`. Initial focus goes to the content section (`Modal.Content`, `tabIndex=-1`, the node `scopeTab` traps). This runs from a `setTimeout` that is queued after Mantine's own focus timer. `data-autofocus` is gone from the title.
   - Play: `Sheet.stories.tsx:399` ExtraShiftTab, with no `onBack`. Shift+Tab keeps focus inside and lands on Done; Tab then goes to Close.
2. P2, Escape in a Dialog over a Sheet also closed the Sheet.
   - Fix: `packages/ui/src/organisms/Dialog/Dialog.tsx:73`, `:97`, `:108`. The alertdialog and both buttons carry `data-mantine-stop-propagation="true"`. Mantine Modal's window capture listener skips events whose target has that attribute.
   - Play: `Dialog.stories.tsx:353` ExtraOverSheet. Escape calls `onCancel` once, the Sheet's `onClose` is not called, and the Sheet stays open.
3. P2, a tap on the Dialog text lost focus.
   - Fix: `Dialog.tsx:72`, `tabIndex={-1}` on the alertdialog. Escape is handled on the root `onKeyDown` for any focused descendant, including the dialog itself.
   - Play: `Dialog.stories.tsx:337` ExtraTapTextThenEscape. It taps the body, checks focus is inside and Tab stays inside, taps the title, presses Escape, and gets `onCancel` once.
5. P3, status-bar offset.
   - Fix: `packages/ui/src/organisms/Sheet/Sheet.module.css:20-23`. `--cp-sheet-status-bar: var(--cp-layout-status-bar, 0px)` is declared in the component, and the padding uses it.
   - Play: `Sheet.stories.tsx` ExtraLongContent asserts the sheet top equals frame top + `layout.statusBar` + `layout.sheet.inset`, which proves the harness still sets the variable.
6. P3, the whole body was the accessible description.
   - Fix: `Sheet.tsx:66` and `:70`. The subtitle is the `Modal.Body` (Mantine's `aria-describedby` target). The content is a plain `div[data-sheet-content]`.
   - Plays: TwoButtonsPrimaryDisabled asserts the description is `Title is required`. `Sheet.stories.tsx:412` ExtraDescriptionIsSubtitle asserts no `aria-describedby` when there is no subtitle.
7. P3, actions.
   - Fix: `Sheet.tsx:15` makes `actions` optional, and `:19-26` flattens Fragments recursively.
   - Plays: `Sheet.stories.tsx:422` ExtraNoActions shows no actions row. `:433` ExtraFragmentActions shows two Fragment buttons on one row at equal width.
8. P3, plurals.
   - `Sheet.doneTags`, `Dialog.clearBody` and `Dialog.deleteCombatBody` become `_one`/`_few`/`_many`/`_other` with `{{count}}` in all six locales. Every locale carries all four keys, because check-i18n requires identical keys.
   - Plays: `Sheet.stories.tsx:451` ExtraOneTag ("Done · 1 tag"), `:459` ExtraDoneTagsRu ("Готово · 3 тега"), `Dialog.stories.tsx:381` ExtraOneUnit, `:391` ExtraPluralRu ("его 3 юнита").

Report item, scroll lock: `Dialog.tsx:46-54` sets `document.body.style.overflow = 'hidden'` while the Dialog is open and restores the previous value on close. Play: `Dialog.stories.tsx:368` ExtraScrollLock.

Finding 4 (portal) is not addressed, per the brief.

## Questions

- In en, de, es and fr the `_few`/`_many` plural keys are present only because check-i18n requires identical keys in every locale; those languages never use them, and they repeat `_other`. ja repeats one form across all four keys.

## Differences from the renders

- No existing baseline changed pixels.
- The new Extra stories have their own baselines:
  - Sheet: ExtraShiftTab, ExtraDescriptionIsSubtitle, ExtraNoActions, ExtraFragmentActions, ExtraOneTag, ExtraDoneTagsRu.
  - Dialog: ExtraTapTextThenEscape, ExtraOverSheet, ExtraScrollLock, ExtraOneUnit, ExtraPluralRu.
- New byte-identical groups are listed in `Dialog.same.txt`.

## Dependencies needed

none

## Left undone

- The baselines come from the local Playwright Chromium, so there is no `.docker-*` marker.
- Finding 4 (portal) is left to `4-web`.

## Processes left running

none
