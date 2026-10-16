# Brief: fix-2.3-organisms-a

Batch `fix-2.3-organisms-a`, phase 2.3 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
the agent of `2.3-organisms-a` fixes the guard findings on Sheet and Dialog.
Common rules: `.claude/artifacts/briefs/_phase-2-common.md`. Original brief:
`.claude/artifacts/briefs/2.3-organisms-a.md`. Guard:
`.claude/artifacts/guard/2.3-organisms-a.md`. Report and accepted decisions:
`.claude/artifacts/reports/2.3-organisms-a.md`, progress file
`.claude/artifacts/2026-10-16-handoff-build-progress.md` («Вопросы владельцу»,
bullet 2.3-organisms-a).

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-2.3-organisms-a`,
  branch `agent/fix-2.3-organisms-a`. Work only inside that path.
- Tool-call limit: 200.

## Units, in this order, one commit each

1. `fix(ui): Sheet`:
   - Focus stays inside the open Sheet in both directions: initial focus on a
     node `scopeTab` treats as the trap (the content section with
     `tabIndex={-1}`), not on the title; story `ExtraShiftTab` opens the sheet
     without `onBack`, presses Shift+Tab and asserts `document.activeElement`
     is inside the dialog (guard finding 1).
   - `actions` optional: no actions row when absent; `actions` given as a
     Fragment of two buttons renders side by side (flatten Fragments) (finding 7).
   - The accessible description is the subtitle only, not the whole body
     (finding 6).
   - The status-bar offset has a fallback that matches the app: the variable
     defaults to `0px` explicitly in the component and the story harness keeps
     setting it (finding 5).
   - Baselines regenerated only where pixels change.
2. `fix(ui): Dialog`:
   - The `alertdialog` element carries `tabIndex={-1}`; Escape is handled while
     focus is anywhere inside, including after a tap on text; story
     `ExtraTapTextThenEscape` (finding 3).
   - Escape in a Dialog opened over an open Sheet closes only the Dialog;
     story `ExtraOverSheet` stacks a Sheet and a Dialog and asserts the Sheet's
     `onClose` is not called (finding 2).
   - Page scroll is locked while the Dialog is open (report, Left undone).
   - Baselines regenerated only where pixels change.
3. i18n plurals: `Dialog.clearBody`, `Dialog.deleteCombatBody`, `Sheet.doneTags`
   use i18next plural keys (`_one`/`_other`, plus `_few`/`_many` for ru) in all
   six locales; committed with the Sheet and Dialog units they belong to, not
   separately (finding 8).

Finding 4 (portal) is not fixed here: `4-web` decides where overlays mount.

## Allowed paths

`packages/ui/src/organisms/Sheet/**`, `packages/ui/src/organisms/Dialog/**`,
`packages/ui/src/i18n/<lng>/{Sheet,Dialog}.json`,
`packages/ui/__screenshots__/{Sheet,Dialog}/**`. Nothing else.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm exec vp test
   --project visual -t 'Sheet|Dialog'` without `--update`, `pnpm
   storybook:build` exit 0.
2. Guard findings 1, 2, 3, 5, 6, 7, 8 closed with file and line in the report;
   each behaviour fix is proven by a `play` that fails on the old code.
3. `Sheet` without `actions` renders no actions row (story).
4. Two commits `fix(ui): Sheet`, `fix(ui): Dialog`, each touching only its
   folder, its six i18n files and its baselines; no comments.

## Hand-back

Report per `CLAUDE.md` «REPORT.md». If writing `REPORT.md` is blocked, return
the full report as the final message.
