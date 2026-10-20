# Report: fix-15-geometry (saved from the hand-back message; the worktree had no REPORT.md)

## Commits (master..HEAD before rebase)
7404d05 test(ui): shared geometry helpers replace the local fit checks
2661e93 fix(ui): Chip buttons are 44 px tap targets
0b08588 fix(ui): the small IconButton is a 44 px tap target
eee2b43 fix(ui): Swatch buttons are 44 px tap targets
612c6e1 fix(ui): the small ToolButton is a 44 px tap target
ad64f07 fix(ui): the SearchField frame and clear button are 44 px tap targets
cbf3ab4 fix(ui): the small TextField frame is a 44 px tap target
93bc111 fix(ui): a Checkbox without a label is a 44 px tap target
48163f4 fix(ui): a Radio without a label is a 44 px tap target
4bf1551 fix(ui): small Segmented options are 44 px tap targets
23624b6 fix(ui): small Stepper keys are 44 px tap targets
f1ffd21 fix(ui): Toast action and close buttons are 44 px tap targets
5e300c5 fix(ui): tapping anywhere on the note being edited focuses it
628f57f fix(ui): the CombatCard details chevron is a 44 px tap target
3d1af3b fix(ui): the round button and escalation faces are 44 px tap targets
57728d3 fix(ui): the player's own name is a 44 px tap target
acf3750 fix(ui): the PresetCard actions chevron is a 44 px tap target
bf97a3f fix(ui): the ShareSheet Copy button is a 44 px tap target
ce5a405 fix(ui): the UnitRow details chevron is a 44 px tap target
ba5d200 fix(ui): the sign-in and sign-up switch links are 44 px tap targets
1286b12 fix(ui): an eight-character HP reading fits the calculator preview
2005017 fix(ui): the German Set Temp label fits its key
7ec2b12 fix(ui): the French Restart label fits its dialog button
db6577e fix(ui): overlays in a story phone frame stay inside the frame at any viewport
9e9dc68 test(ui): every story checks overflow, tap targets, frame bounds, truncation and overlays
cd3029e test(ui): the PresetFormSheet edit and keyboard-submit baselines are listed as identical
7e32bd4 feat(ui): stories take the phone width from a frame global

## How the fixes work
- Tap targets: invisible ::after with `position:absolute; inset:min(0px,(100% - 44px)/2)` on a `position:relative` control. Field frames (TextField .control, SearchField root) use ::before z-index:-1 inside a z-index:0 frame. Checkbox/Radio enlarge their invisible .input.
- NoteField: the editing frame carries data-field and focuses its textarea on mousedown (behaviour change).
- NumpadSheet: a reading of 8+ characters gets data-long and the heading font size.
- PhoneFrame: .phone always has `contain: layout`; before, fixed sheets/scrims escaped the frame at any viewport other than 390x844 (72 storybook tests at 1200x900 failed).
- geometry.ts: tap targets measured as hit areas (element + absolutely positioned pseudos + [data-field] frame + labels, clipped by overflow:hidden ancestors up to the nearest scroller); overflow measured from element boxes against container padding boxes, not scrollWidth.

## Checks run
- pnpm check: green after cd3029e (before: check-screenshots failed on byte-identical EditPreset/ExtraKeyboardSubmit).
- pnpm test: green, 2193 tests, 120 files.
- vp test --project visual: green, 1373.
- pnpm screenshots:update: 76 PNGs changed:
  - NumpadSheet/Damage400113320.png: smaller font for the long reading.
  - NumpadSheet/Deutsch.png: «Temp. setzen».
  - UnitForm/LibraryNothingFound.png, Library/LBF15.png, Library/LBF16.png: text anti-aliasing shift with Chip+ToolButton+SearchField hit areas together; no single one causes it (hypothesis: positioned layers change rasterisation).
  - 71 PNGs in db6577e: the scrim no longer paints the corners outside the rounded phone frame (`git show --stat db6577e`).

## Opt-outs (story: check: reason)
- Stepper "Stepper · S": tapTargets; S keeps the 36 px handoff input, no screen uses it.
- SwatchRow "Widths · 366 wide": overflow; pinned to 366 content width.
- InitiativePopover "Tapping its own trigger closes the popover": overflow; 264 px stage.
- tapTargets, test-fixture openers: NoteField "Flow: edit, collapse row saves", "Tapping the host collapse saves the draft before the swap", "The host removing the editing instance does not save"; PlayerRow "A host collapse tap while editing saves the note"; ShareSheet "Reopening shows Copy again"; HpHistory "Sheet: Escape closes, Tab stays inside", "Sheet with motion: long list scrolls by keyboard, Escape closes"; TagSheet "Close and Escape call onClose only", "Search resets when the sheet closes".
- truncation by design: ShareSheet meta level; CombatScreen "CS-F7.3 Link and QR", "CS-F7.5 Revoke link", "Extra: Revoke reissues the link after confirm"; CombatHeader "Long title, round 99"; PlayerHeader "Long title, round 12"; PresetCard "Tag line ellipsises after two lines"; TurnBar "ru: longest labels", "Name at the length limit ends with an ellipsis".
- ThemeAudit meta level: overflow and truncation (audit table).

## Deviations
- Global `frame` (narrow 320, phone 390, desktop 1280; default phone); layout.viewports added.
- Opt-outs are reason strings `geometry: { truncation: '<reason>' }`.
- 76 baselines changed (listed above).
- Without a phone frame, overflow is measured against [data-story-canvas]; frame and overlay checks skipped.

## Questions
1. Should S-size field variants (Stepper S, TextField S, SearchField S) exist? No screen uses them. TextField S and SearchField S fixed; Stepper S opted out.
2. Dialog confirm: only fr «Recommencer» overflowed (164 px in 149 px) → «Relancer». ru «Перезапустить» 133 px stays 8 px inside; de «Neu starten» fits. No story renders the restart dialog in ru/fr/de (story coverage gap); measured with a throwaway probe.
3. CombatHeader «Setup» de/es/ru/fr: not reproduced; slot 264 px, all fit at 390. No story renders setup in those locales.

## Left undone
none

## Processes left running
none
