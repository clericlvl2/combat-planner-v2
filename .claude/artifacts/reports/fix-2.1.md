# REPORT: fix-2.1

Copied by the orchestrator from the agent's hand-back message (the worktree
`REPORT.md` write was blocked). The branch was rewritten once with the
orchestrator's authorization so that `Button/ExtraPhoneFrame.png` lands in
`fix(ui): Button`; the final tree equals the first hand-back's tree.

## Commits

- 71004a9 fix(ui): theme
- d0bca54 chore(ui): PhoneFrame
- 0f42423 chore(ui): Hello
- 76b64cc fix(ui): Button
- 41019bb fix(ui): TextField
- a67381d fix(ui): TextArea
- bb1824b fix(ui): ToolButton
- ba4d048 fix(ui): NumberField
- 206221c fix(ui): SearchField
- 84402be fix(ui): Swatch
- 54523b0 fix(ui): Chip
- c976982 fix(ui): RoleBlock

No `chore(ui): domain link` commit: the link already existed.

## Where each guard finding is closed

- 0.5 P3 pressed selector: `Button.module.css:58` `&:active, &[data-pressed]`; disabled wins by rule order (:72, :78).
- 0.5 P3 status bar: `PhoneFrame.module.css:48` `padding-top: var(--cp-layout-status-bar)`; `parameters.phoneFrame.overlay: true` removes it; `Button/ExtraPhoneFrame` asserts ≥ 44 px offset.
- 0.5 P3 `type` prop removed from `Button.tsx`; `type="button"` internal (:39).
- 0.5 P3 `columns: 2`: `ThemeAudit.module.css:12` single column; swatches 4 per row, conditions 3; page 390×820.
- 0.5 P3 `.sampleUse` deleted with its data and markup.
- 2.1-a P1 TextField height: `.control` min-height 48, padding `0 12px`, centred (`TextField.module.css:44`); textarea without padding/border (:76-107); `Name, ru` cells 73.6 px; `NameRuFilled` asserts it.
- 2.1-a P3 `ActiveEn` → `labelKey: 'lastPlayed'`; `aria-multiline` removed.
- TextField `type?: 'email' | 'password'` renders a single-line `<input>` (`ExtraSignIn`).
- 2.1-b P2: `NumberField` width `calc(var(--number-digits) * 1ch)` + `size`; `field-sizing` removed (`ExtraDefenseWidth`).
- 2.1-b P3: `SearchField` `placeholder || t('search')` (`ExtraEmptyPlaceholder`); frame click focuses the input in SearchField, NumberField, TextField (`ExtraFrameClick`).
- 2.1-c P3: Chip `ExtraToggleKeyboard`; pressed rule limited to `tag` and `add` (`ExtraPressedFills`).
- 2.1-d P2/P3: RoleBlock `ActiveTurn` asserts `15`/`Hero`; enemy fill asserted in four stories; `Tap` compares `interaction.tapMarker`; prop `unitRole`, attribute `data-unit-role`.
- LIMITS: TextField default `LIMITS.unitName` (none with `type`), TextArea `LIMITS.combatDescription`, NumberField `LIMITS.amount`, Swatch `CombatColor` from `LIMITS.color`; `theme.combatColors[7] = '#8C8578'`, CSS `--cp-combat-0..7`.

## Checks run

On the rewritten branch after `pnpm install --frozen-lockfile`: `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` exit 0; `pnpm test` 616 tests; `pnpm exec vp test --project visual` 366 tests exit 0; `bash scripts/check-commit.sh master..HEAD` 12 commits pass. `pnpm storybook:build`, `pnpm build`, `node scripts/test/run.mjs` exit 0 before the rewrite on the identical tree.

## Questions

All eight answered by the orchestrator (see the progress file).

## Differences from the renders

- ThemeAudit: one column, 12-px swatches 4 per row (conditions 3), long token names ellipsised.
- TextField `type="email"/"password"`: not on the page; M box, 48 high, single line.

## Dependencies needed

none

## Left undone

- Baselines from the local Playwright Chromium, no `.docker-*` marker; regenerated or new: `ThemeAudit/Tokens`, `Button/ExtraPhoneFrame`, TextField `NameRuFilled`, `NameRuFocus`, `NameRuOverLimit`, `ExtraLocaleRu`, `ExtraMaxLength`, `ExtraSignIn`, `ExtraFrameClick`; NumberField `ExtraFrameClick`, `ExtraDefenseWidth`; SearchField `ExtraEmptyPlaceholder`, `ExtraFrameClick`; Swatch `Colour8`, `ExtraKeyboard`; Chip `ExtraToggleKeyboard`, `ExtraPressedFills`.
- New `.same.txt` groups: TextField `ExtraFrameClick Title80Focus`; NumberField `Anatomy AmountFilled ExtraFrameClick`; SearchField `Anatomy CombatsFilled ExtraFrameClick ExtraTyping`; Chip `ExtraToggle ExtraToggleKeyboard`.

## Processes left running

none
