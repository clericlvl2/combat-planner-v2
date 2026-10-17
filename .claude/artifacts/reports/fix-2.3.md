# REPORT fix-2.3

Text delivered by the agent in its hand-back (REPORT.md write blocked); saved by the orchestrator. Hashes below are the agent's, before the orchestrator split two commits and rebased.

## Commits

bafcc89 chore(toolchain): optimizeDeps · b975678 fix(toolchain): check-stories · e60cfd6 fix(ui): Stepper · 367b7b4 fix(ui): TextField · e15abc5 fix(ui): SearchField · e05e164 fix(ui): IconButton · 80461b1 fix(ui): RoleBlock · 5ae57b1 fix(ui): NoteField · eafb529 fix(ui): CheckList · a446e45 fix(ui): HpBox · 62ef577 fix(ui): InitiativePopover · 6ca35dd fix(ui): Menu · 8f0ce5e fix(ui): Sheet · 2902d97 fix(ui): Dialog · 58d065b fix(ui): Drawer · 10f3c31 fix(ui): TurnBar · 3a58fa1 fix(ui): BottomBar · 5066d63 fix(ui): ConditionPicker · 6bd163c fix(ui): TagSheet · 98cc5a5 fix(ui): PlayerHeader · f22000b fix(ui): CombatHeader · 3bd3618 fix(ui): ShareSheet · 273355f fix(ui): PlayerRow · cc3075e fix(ui): UnitRow · bb657d0 fix(ui): PresetCard · 8cc0d84 fix(ui): HpHistory · 03fc13a fix(ui): UnitForm · 2d68efa fix(ui): NumpadSheet

Per unit, «fails old» = the named play run against the pre-fix source failed there and passes on the fix.

1. optimizeDeps: `vite.config.ts` `browserOptimizeDeps` adds `react-dom/client`, `react-qr-code`, `@mantine/hooks`, `@storybook/addon-vitest/internal/setup-file` for storybook and visual; cold-cache `pnpm test` and visual pass with no «optimized dependencies changed».
2. check-stories: reads `items` and `rows` pages, accepts `NP-n` flow codes, numeric suffix on colliding names. Fixtures `stories-items-page`, `stories-rows-page`, `stories-name-collision`, `stories-np-flow-code` fail old, pass new. Renames: UnitForm and NumpadSheet drop `Extra` (NP1–NP5; ja/ru `EdgeCasesLanguages`/`EdgeCasesLanguages2`); HpHistory ru `EdgeCasesInline2`/`EdgeCasesSheet2`, ja stories no longer assert absence of Russian; HpBox renames (999/999 and −999/999 collided).
3. Stepper: `Stepper.tsx:32` `+0`; `:121` inputMode by `min < 0`; disabled key stays `#F3EDE2` (Stepper.dc.html:86), UnitForm overrides in unit 27; `ExtraEmptyDecrease`. Fails old: `ExtraKeyboard`, `ExtraUnsigned`.
4. TextField: `TextField.tsx:55` `>=`. Fails old: `ExtraMaxLength`.
5. SearchField: `maxLength` reaches `<input>`. Fails old: `ExtraMaxLength`.
6. IconButton: `IconButton.module.css:57-68` inset ink ring and ink text on open for plain, soft, filled. Fails old: `ExtraOpenBorderless`.
7. RoleBlock: `fill` prop → `data-fill`. Fails old: `ExtraFill`.
8. NoteField: draft saved on unmount. Fails old: `ExtraSaveOnUnmount`.
9. CheckList: Create only when no option contains the query; `badge?: string` → `data-new`, highlight, replaces the count. Fails old: `VariantsQueryMatch`, `ExtraPartialMatch`, `ExtraNewBadge`.
10. HpBox: status-only box never renders a button; `ExtraReadOnly` spy reaches the component. Fails old: `ExtraReadOnly`.
11. InitiativePopover: on `PopoverFrame`; `triggerRef` excludes the trigger from outside close. Fails old: `ExtraTriggerCloses`.
12. Menu: refocuses first item on reopen; `data-mantine-stop-propagation`; key `heroes` replaces `changeHero`. Fails old: `ExtraReopenDuringExit`, `ExtraInsideSheet`.
13. Sheet: `header?: ReactNode` (content `aria-label={title}`); `onEnterTransitionEnd` focuses the section; `opener` removed. Fails old: `ExtraMotionOnFocus`, `ExtraHeaderSlot`.
14. Dialog: `RemoveScroll`; fr `_one` with `{{count}}`; `opener` removed. Fails old: `ExtraScrollLock`, `ExtraEmptyFr`.
15. Drawer: `RemoveScroll`; `FocusTrapInitialFocus` keeps first focus off Combats; stories wait for focus before Escape. Fails old: `ExtraScrollLock`, `ExtraInitialFocus`.
16. TurnBar: `addUnitFirst` key; `[data-disabled]` second line. Fails old: `ExtraBlockedNoUnits`, `ExtraDataDisabledLine`.
17. BottomBar: `onClick` required; `layout.ts` top padding 10 (98); `ExtraBottomOfScreen` via `layout.*` (fails old); full visual run showed no baseline change.
18. ConditionPicker: Checkbox mark ring suppressed in tapped rows; `TapAddingWeakened` fails old, baseline regenerated.
19. TagSheet: Create workaround and `onChange` truncation dropped; created tags first with a «new» badge; search resets on close; `presetCount` required in filter mode; `ExtraClose` presses Escape. Fails old: `ExtraFlowCreate`, `ExtraSearchResets`.
20. PlayerHeader: `IconSwitchHorizontal` «Heroes»; dead export removed; fr «Menu» + allow-same. Fails old: `ExtraMenuOpens`, `ExtraLocaleFr`.
21. CombatHeader: `undoDisabled`; Enter commits, closes, refocuses the round button; at a bound focus returns to the field; Escape discards; escalation from `LIMITS`, faces render `EscalationDie`; open ring via `data-tap`; die name carries its value. Fails old: `ExtraDieNameCarriesValue`, `ExtraRoundEnter`, `ExtraRoundEscapeDiscards`, `ExtraRoundBoundKeepsKeyboard`, `ExtraUndoDisabled`.
22. ShareSheet: `onCopy` → `Promise<boolean> | void`; «Copied» only on `void`/`true`. Fails old: `ExtraCopyFails`.
23. PlayerRow: RoleBlock `fill`; `ExtraHostCollapseSavesNote` fails against the pre-unit-8 NoteField.
24. UnitRow: Release claim disabled when unclaimed; flash skips dead and disabled; role block «Roll initiative»; callbacks optional when `readOnly`; ink tap marker on the active row; RoleBlock `fill`; role block closes its own popover via `triggerRef`. Fails old: `ExtraReleaseClaimUnclaimed`, `ExtraFlashSkipsDeadAndDisabled`, `ExtraRoleBlockTogglesPopover`, `ExtraTapMarkerOnActiveRow`.
25. PresetCard: RoleBlock `fill`; `ExtraRoleFillsHead`.
26. HpHistory: long-list story presses PageDown and asserts `scrollTop` grows (fails old); keyboard handler in `HpHistory.tsx`.
27. UnitForm: picked preset resets on tab, search, tag filter; «Add <name>» submits that preset; `hint?: 'setup' | 'active'`; stories keep the sheet open, `ExtraAddClosesTheSheet` covers the close; empty Edit name border `#E2D8C6`; disabled stepper keys `#FAF6EE`; `data-long` removed. Fails old: `MinimumValues`, `ExtraPickResetsOnSearch`, `ExtraPickResetsOnTab`, `ExtraHintActive`, `ExtraHintSetup`, `ExtraEditEmptyName`.
28. NumpadSheet: on `Sheet` with the header slot; amount `number | null`, Set Temp enabled at 0 and clears temp HP, others disabled at 0; amount resets on apply, guard against a second apply during exit; `data-tap` no longer pins the preview; actions keep Button's pressed colour. Fails old: `ExtraSetTempZero`, `ExtraDoubleTapAppliesOnce`, `ExtraTapDoesNotPinPreview`, `ExtraActionPressedColour`; new `ExtraEveryDigitAppends`, `ExtraSpaceOnAction`.

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: pass.
- `pnpm test`: pass, 1470 tests, cold Vite cache.
- `pnpm exec vp test --project visual` without `--update`: pass, 1043 tests, cold cache.
- `node scripts/test/run.mjs`: pass, 26 fixtures.
- `pnpm storybook:build`, `pnpm build`: pass.
- `bash scripts/check-commit.sh master..HEAD`: red on e60cfd6 (Stepper also changed UnitForm `NewEmpty` assertion and two UnitForm baselines, forced by `+0`) and 58d065b (Drawer also removed two unused `t` variables in `Dialog.stories.tsx`). The orchestrator split both into separate `fix(ui): UnitForm` and `fix(ui): Dialog` commits; final tree unchanged; check-commit passes on 30 commits.

## Questions

1. TextField page draws 40/40 grey (TextField.dc.html:124-125); brief and UnitForm page want red at `>=`; brief followed.
2. NoteField keeps the save callback `onChange` (brief said `onSave`).
3. UnitForm hint placed under the steppers, before Note.
4. With motion on, Mantine first focuses the first tabbable; focus moves to the section when the enter transition ends (~200 ms).

## Differences from the renders

- TextField `NameRuFilled`, `NameRuFocus`: 40/40 counter red.
- CheckList `VariantsQueryMatch`: no Create row (owner decision).
- PlayerRow expanded rows square the role block's bottom-left corner (PlayerRow.dc.html:101); 9 baselines, corner pixels only.
- UnitRow: ink tap ring on the active row.
- NumpadSheet: 7 baselines differ only by edge anti-aliasing (≤ 15/255, no layout shift).

## Dependencies needed

none

## Left undone

- Stale `.same.txt` groups `PlayerRow.same.txt` «ExtraMoreMenu OwnExpanded», `TagSheet.same.txt` «ExtraClose ExtraDone» (check-commit needs a source change in the folder).
- Hypothesis: `toMatchScreenshot --update` does not rewrite a PNG within tolerance; UnitForm and NumpadSheet regenerated from scratch, earlier units' subtle colour changes may sit on old PNGs.
- Toast `ExtraAutoHide` flaky once in a cold visual run (outside the batch).
- Baselines from the local Chromium; no `.docker-*` marker.

## Processes left running

none
