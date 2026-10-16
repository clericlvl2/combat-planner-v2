# Brief: fix-2.2

Batch `fix-2.2`, phase 2.2 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
one agent fixes the guard findings and the deferred decisions of the five
molecule batches, the two atom bugs they exposed, and regenerates the dependent
baselines. Common rules: `.claude/artifacts/briefs/_phase-2-common.md`, read
first. Guard files: `.claude/artifacts/guard/fix-2.1.md`, `2.2-molecules-a.md`
… `2.2-molecules-e.md`. Reports (decisions already taken):
`.claude/artifacts/reports/2.2-molecules-a.md` … `2.2-molecules-e.md`; the
orchestrator's decisions per report: `.claude/artifacts/2026-10-16-handoff-build-progress.md`,
sections «Вопросы владельцу» and «Замечания guard-bee P2–P3, отложены».

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-2.2`, branch
  `agent/fix-2.2`. Work only inside that path.
- Tool-call limit: 250.

## Units, in this order, one commit each

Subjects `fix(ui): <Name>` for a component, `fix(ui): theme` for the theme. A
commit touches one component folder plus its i18n files and baselines; a change
in a lower component is committed before the components that render it, and
their baselines are regenerated in their own commits.

1. `fix(ui): theme`: `packages/ui/src/theme.ts` gains `healthTints` with the
   three player tints of the HpBox page (`#E3F1E6`, `#F8ECD2`, `#FBE3D8`, keyed
   by the health status they tint), exposed as CSS variables
   `--cp-health-tint-<status>` next to the other palettes; `ThemeAudit`
   unchanged.
2. `fix(ui): Chip`: a non-interactive Chip (`span`) forwards `...rest` (`data-*`,
   `aria-*`, `id`) like the button variant; `data-condition` is emitted only
   when `condition` is set; baselines unchanged unless pixels change.
3. `fix(ui): SearchField`: mousedown anywhere on the frame, including the
   leading icon, focuses the input (`event.target === inputRef.current` guard as
   in NumberField and TextField).
4. `fix(ui): Stepper`: `signed?: boolean` (default `min < 0`) controls the `+`
   sign; `value: number | null` renders `—` (U+2014) when `null` and the
   spinbutton omits `aria-valuenow`; − / + from `null` start at 0; `handleText`
   commits on blur and Enter only (no `onChange` per keystroke); stories
   `ExtraUnsigned`, `ExtraEmpty` added with `play`; baselines regenerated.
5. `fix(ui): Segmented`: a `value` matching no option keeps the first enabled
   segment as the tab stop (`selectedIndex >= 0` guard); story `ExtraNoMatch`
   asserts a segment is reachable by Tab.
6. `fix(ui): HpBox`: the three tints come from `theme.healthTints` CSS
   variables, no raw hex in `HpBox.module.css`; `ExtraReadOnly` spies `onClick`
   with `fn()` and asserts no call; baselines unchanged unless pixels change.
7. `fix(ui): HistoryRow`: drop the wrapper `span[data-part="kind"]` and pass
   `data-part="kind"` to the Chip; the kind chip no longer sets
   `variant="condition"` (fill and text through `--chip-fill`/`--chip-text`
   only, no `data-condition`); `i18n.resolvedLanguage` for the 84 px column;
   baselines regenerated where changed.
8. `fix(ui): NoteField`: `IconNote` carries `role="img"` with its `aria-label`
   or `aria-hidden` with the label on the text; baselines unchanged unless
   pixels change.
9. `fix(ui): InitiativePopover`: passes `signed={false}` and `value={null}` to
   Stepper for "No initiative yet" (no transparent-input overlay); `onKeyDown`
   from `rest` is composed with the Escape handler; cell stories show `15`,
   `4`, `27`, `17` without a sign and `—` through the Stepper; baselines
   regenerated.
10. `fix(ui): Toast`: under `motion: 'off'` the auto-hide timer does not start
    (the toast stays until dismiss, action or unmount); dismiss and action
    still call `onHide` at once under `motion: 'off'`; a story
    `ExtraMotionOffStays` asserts the toast is still rendered after the
    duration with fake timers; baselines unchanged unless pixels change.
11. `fix(ui): <Name>` for each P1–P3 item of
    `.claude/artifacts/guard/2.2-molecules-e.md` listed in the appendix below.

## Allowed paths

`packages/ui/src/theme.ts`, `packages/ui/src/theme.module.css`,
`packages/ui/src/atoms/Chip/**`, `packages/ui/src/atoms/SearchField/**`,
`packages/ui/src/molecules/**`, `packages/ui/src/i18n/<lng>/*.json` for the
touched components, `packages/ui/src/i18n/allow-same.txt`,
`packages/ui/__screenshots__/**` for the touched components. Nothing else.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm exec vp test
   --project visual` (all components, without `--update`), `pnpm
   storybook:build`, `pnpm build` exit 0.
2. Every item of units 1–11 is closed with the file and line named in
   `REPORT.md`; every P3 of the six guard files not covered by a unit is closed
   or listed under Left undone with a reason.
3. `Stepper` accepts `value: null` and `signed`; `InitiativePopover` renders no
   sign on positive values and `—` without an overlay (stories and baselines
   prove it).
4. `Toast` under `motion: 'off'` stays rendered past its duration (story with
   fake timers).
5. No raw hex in `HpBox.module.css`; `theme.healthTints` exists.
6. One commit per unit above with the given subjects; a `fix(ui): <Name>`
   commit touches one component folder, its i18n files and its baselines.

## Appendix: 2.2-molecules-e findings

- `fix(ui): Toast` (same commit as unit 10): `ExtraKeyboard` is split so the
  Space-on-dismiss leg proves itself: one story asserts Enter on the action
  calls `onAction` and `onHide`; another, with no prior hide, asserts Space on
  Dismiss calls `onHide` once (Toast.stories.tsx:166-169 today passes on the
  earlier call). The timer site is `Toast.tsx:77-81`. The i18n keys `show`
  (story helper) and the vision copy keys stay as they are: the 2.4 host reads
  the toast copy from the `Toast` namespace.
- `EmptyState`: nothing to fix.
