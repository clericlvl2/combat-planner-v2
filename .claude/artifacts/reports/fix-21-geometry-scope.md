# Report: fix-21-geometry-scope (saved from the hand-back message; the harness blocked REPORT.md)

## Commits
31b1cf6 fix(ui): the stories without a phone frame are measured at 390 px
4959cfc fix(ui): geometry opt-outs name the element they excuse
cdc763a fix(ui): a tap area counts only the control, its pseudo-elements and the labels that enclose or touch it
8bfc1f3 fix(ui): tap-target size comes from one CSS token
954b12a test(ui): restart dialog and setup header render in the long locales
e3184f4 test(ui): tapping the note frame focuses the editor
e7d006a fix(ui): every ru and fr restart string uses the dialog verb
Unit 7: no commit (anti-aliasing only).

## Checks run (worktree, on e7d006a)
pnpm check green; pnpm test green 2216; visual green 1381; pnpm build green; E2E_PORT=3100 pnpm e2e 24 passed; pnpm screenshots:update run after units 5, 6 and e7d006a.

## Changed baselines with cause
- New (unit 5): CombatHeader/SetupDe, SetupEs, SetupFr, SetupRu; Dialog/RestartDe, RestartFr, RestartRu.
- New (unit 6): NoteField/ExtraFrameTapFocuses.
- Changed (e7d006a): Menu/Ru.png, restart item «Сбросить бой», diff box (76,248)-(233,264).

Unit 7, baselines changed a22bf85→b33382c:
| PNG | Changed px | Box | Max delta |
| Library/LBF15 | 2041 | 0,116,390,844 | 93 |
| Library/LBF16 | 3981 | 90,120,364,797 | 97 |
| UnitForm/LibraryNothingFound | 3289 | 28,304,351,745 | 92 |
Glyph edges and frame corners only; no ±1 px shift fits better; mean delta 0.2-1.4/255; changed-pixel colour spread 7.6/10.0/6.1 → 48.7/52.5/52.3: grayscale → LCD subpixel AA. Hypothesis: position:relative; z-index:0 layers from 3d6945c change Chromium's text raster mode.

## Questions / deviations
1. Restart wording (e7d006a): ru Menu/CombatHeader «Сбросить бой», Toast «Мастер сбросил бой», undo «Отменено: сброс боя»; fr «Relancer le combat», «Le MJ a relancé le combat», «Annulé : combat relancé» (U+202F kept). Menu.stories.tsx ru literal updated.
2. ru restart dialog: «Перезапустить» 179 px in 149 px button (fix-15's 133 px was measured before fonts loaded) → «Сбросить» / «Сбросить бой?». Wrapping layout tried and reverted (unequal buttons on ru clear dialog).
3. Viewport set in packages/ui/.storybook/preview.tsx (phone viewport from layout.phone, initialGlobals.viewport); browser.viewport in vite.config.ts has no effect under addon-vitest (1200×900). Storybook UI now opens at 390.
4. expectGeometry forces layout and awaits document.fonts.ready.
5. Extra opt-outs narrowed: TurnBar "Name at the length limit", PlayerHeader "Long title, round 12", PresetCard tag line. Test openers carry data-story-fixture. Whole-story opt-outs only on Stepper S, SwatchRow 366, InitiativePopover, ThemeAudit.
6. --cp-tap-target from layout.tapTarget via cssVariablesResolver in theme.ts; 21 rules replaced.

## Left undone
Paint-order half of guard finding 5.

## Processes left running
none
