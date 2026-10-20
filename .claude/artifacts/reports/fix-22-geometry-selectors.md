# Report: fix-22-geometry-selectors (saved from the hand-back message)

## Commits
658f5ef fix(ui): an opt-out selector that matches nothing fails the story
def4999 fix(ui): the PresetCard opt-out excuses only the tag line
fa2d114 test(ui): the note frame tap is proven to focus the editor
dd7166d fix(ui): labelled Checkbox and Radio rows use the tap-target token

## What changed
- Unit 1: expectGeometry fails when an except selector matches nothing in the canvas; message names check and selector. Exposed a stale ShareSheet meta opt-out `[data-url]` (three stories close the sheet); moved to `openSheetGeometry`, set on the 12 stories that end with the sheet open; ExtraReopenResetsCopied spreads it.
- Unit 2: PresetCard tag span carries `data-tag-line`; opt-out `except: '[data-tag-line]'`.
- Unit 3: play presses 4 px inside the frame's top-left corner after asserting elementFromPoint returns the frame; fails on toHaveFocus with onMouseDown={focusEditor} removed (verified, restored).
- Unit 4: min-height var(--cp-tap-target) in Checkbox and Radio CSS.

## Checks run
pnpm check green; pnpm test green 2216; visual green 1381; pnpm build green.

## Changed baselines
None.

## Questions
1. Blurring the textarea first is impossible: onBlur saves and closes the editor. The textarea stays focused; the padding click without focusEditor moves focus away, saves and closes, so the test fails. The editor.focus() call alone is not observable.

## Left undone
none

## Processes left running
none
