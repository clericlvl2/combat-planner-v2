# Guard: fix-2.1

Range `856dc84..ab729f2`, 12 commits. Read-only; gate logs `.claude/run/fix-2.1/`.

CRIT 1 PASS .claude/run/fix-2.1/summary.log — every step exit 0: check, test 647/647, visual 366/366 (no `--update`), storybook-build, build, check-commit 12 commits.
CRIT 2 FAIL .claude/artifacts/reports/fix-2.1.md:35,38 — the 2.1-b NumberField width P2 and 2.1-d RoleBlock assertions P2 are named without file:line. Closures verified in code: P1 2.1-a TextField height → packages/ui/src/atoms/TextField/TextField.module.css:44-52, :94-100, TextField.stories.tsx:133-135. P2 2.1-b → NumberField.module.css:54 `width: calc(var(--number-digits) * 1ch)`, NumberField.tsx:41-42, :90, story ExtraDefenseWidth NumberField.stories.tsx:214-231. P2 2.1-d → RoleBlock.stories.tsx:76-77, :96, :114, :167, :178. P2 2.1-c (visual in gate) → visual.log exists. All P3s closed: Button.module.css:58-59; PhoneFrame.module.css:48 + PhoneFrame.tsx:18-21,53-63; Button.tsx `type` prop removed, `type="button"` :39; ThemeAudit.module.css:12-16 single column; `.sampleUse` deleted (ThemeAudit.tsx:191-196, :272); ToolButton.stories.tsx:173 `args: sortActive` with `labelKey: 'lastPlayed'` :39; `aria-multiline` gone (TextField.tsx:118); SearchField.tsx:37 `placeholder || t('search')`; frame click SearchField.tsx:46-50, NumberField.tsx:87-91, TextField.tsx:69-73 with ExtraFrameClick stories; Chip.stories.tsx:320-334 Enter/Space `aria-pressed`; Chip.module.css:83-91 pressed scoped to `tag`/`add`; RoleBlock.stories.tsx:115 `interaction.tapMarker`; RoleBlock.tsx:12,28,61 `unitRole` / `data-unit-role`.
CRIT 3 PASS TextField.tsx:1,40 `LIMITS.unitName`; TextArea.tsx:1,29 `LIMITS.combatDescription`; NumberField.tsx:1,30-31 `LIMITS.amount`; Swatch.tsx:1,16 `LIMITS.color.max`. Only `font-weight: 500` (TextField.module.css:102) remains among the literals.
CRIT 4 PASS packages/ui/src/theme.ts:90-99 `combatColors[7] = '#8C8578'`, CSS vars :169-171; Swatch.tsx:5,40 uses `combatColors`; ThemeAudit.stories.tsx:48-51 asserts; Colour8 and ExtraKeyboard PNGs regenerated.
CRIT 5 PASS `Hello` folder and `__screenshots__/Hello/Default.png` deleted; index.ts export removed; `git grep Hello` empty; check-stories 15, check-screenshots 15.
CRIT 6 PASS 12 commits with the brief's subjects in order; `chore(ui): domain link` absent because the base already links `@combat-planner/domain` (856dc84:packages/ui/package.json:13, tsconfig.json:9); each `fix(ui): <Name>` touches one folder plus i18n and baselines; `Button/ExtraPhoneFrame.png` in `fix(ui): Button` authorized by the orchestrator.

## Scope check

apps/web/src/App.tsx:1,17 (29ad6d2 `chore(ui): Hello`) outside allowed paths; required for `pnpm build` after `Hello` deletion; accepted by the orchestrator (progress file). Every other file inside the allowed paths.

## Findings

1. P2 .claude/artifacts/reports/fix-2.1.md:35,38 — 2.1-b and 2.1-d P2 entries carry no file:line; closures verified above. Documentary only.
2. P3 packages/ui/src/atoms/SearchField/SearchField.tsx:47 — `event.target !== event.currentTarget` guard means a mousedown on the leading `IconSearch` svg does not focus the input; NumberField and TextField use `event.target === inputRef.current` and cover the whole frame.
3. P3 packages/ui/src/atoms/TextField/TextField.tsx:40 — the single default `maxLength = LIMITS.unitName` (40) applies to every non-`type` TextField, including title fields (`LIMITS.combatTitle` 80); consumers must pass `maxLength` explicitly.
4. P3 packages/ui/src/storybook/ThemeAudit/ThemeAudit.stories.tsx:24 — "Combat colours" is the sixth group, not the ninth the brief names; accepted. No action.

5 pass / 1 fail (documentary, CRIT 2) / 0 unverifiable. No P0–P1.
