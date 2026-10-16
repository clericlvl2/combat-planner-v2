# Brief: fix-2.3

Batch `fix-2.3`, phase 2.3 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
Common rules: `.claude/artifacts/briefs/_phase-2-common.md`, read first. Inputs:
the guard files `.claude/artifacts/guard/2.2-*.md`, `fix-2.2.md`, `2.3-*.md`,
`fix-2.3-organisms-*.md`; the progress file
`.claude/artifacts/2026-10-16-handoff-build-progress.md` sections «Вопросы
владельцу» and «Замечания guard-bee P2–P3, отложены» (every entry routed to
`fix-2.3`). This brief is the list to build; the files above give the line
anchors and the failure scenarios.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-2.3`, branch
  `agent/fix-2.3`. Work only inside that path.
- Tool-call limit: 450. At the limit, write `REPORT.md`, stop every process,
  hand back with what is committed; list the units not done under Left undone.

## Units, in this order, one commit each

Subject `fix(ui): <Unit>` unless stated. Every behaviour fix comes with a
`play` that fails on the old code; every changed visual gets its baseline
regenerated (`--update -t <Name>`, then a second run without `--update`).
A unit touches only its component folder, its six i18n files, its baselines
and the extra paths named in the unit.

1. `optimizeDeps` (`chore(toolchain): optimizeDeps`), `vite.config.ts` only:
   `optimizeDeps.include` gets `react-dom/client`, `react-qr-code`,
   `@mantine/hooks` and the `@storybook/addon-vitest` setup module the gate
   logs show being re-optimised (`.claude/run/2.3-organisms-e/visual.log`,
   `.claude/run/2.3-organisms-h/`), for the `storybook` and `visual`
   projects. Proof: `pnpm test` and `pnpm exec vp test --project visual` each
   pass on the first run after `rm -rf node_modules/.vite`.
2. `check-stories` (`fix(toolchain): check-stories`):
   `scripts/check-stories.mjs` reads cells from a page script that returns
   `items` (UnitForm.dc.html) as well as `groups`, and gives every cell a
   unique export name (a numeric suffix when two cells collide, e.g. the
   «日本語, inline» / «Русский, inline» cells of HpHistory.dc.html). New
   fixtures `scripts/test/stories-items-page/` and
   `scripts/test/stories-name-collision/`; `node scripts/test/run.mjs` passes.
   The same commit renames the stories and baselines the new names require in
   `organisms/UnitForm` (drop the `Extra` prefix from cell stories) and
   `organisms/HpHistory` (ja and ru cells get their own exports; the ja
   stories stop asserting the absence of Russian text). Only stories files,
   `.same.txt` and PNG renames in those two folders.
3. `Stepper`: signed `0` renders `+0` (Stepper.tsx:32); `inputMode` follows
   `min < 0`, not `signed` (Stepper.tsx:121); a disabled key at a bound uses
   the page fill (`minBg #FAF6EE`, UnitForm.dc.html:169, check
   Stepper.dc.html; if the two pages differ, Stepper follows its own page and
   UnitForm overrides in its module); `ExtraEmpty` steps − from `null`.
4. `TextField`: the counter turns to the error colour at
   `value.length >= maxLength` (TextField.tsx:55).
5. `SearchField`: `maxLength` reaches the `<input>`.
6. `IconButton`: borderless variants draw the `[data-open]` ring.
7. `RoleBlock`: the block fills its container's height when placed in a row
   (a `fill` prop or a container rule in RoleBlock itself), so no organism
   overrides `min-height`.
8. `NoteField`: a changed draft is saved through `onSave` when the field
   unmounts or collapses, whichever instance holds it.
9. `CheckList`: Create shows only when no option contains the query
   (case-insensitive, owner decision); `badge?: string` on
   `CheckListOption` renders the `new` label and the highlight of a new row.
10. `HpBox`: `ExtraReadOnly` passes a `fn()` spy that reaches the component
    and asserts it never fires.
11. `InitiativePopover`: built on `PopoverFrame` from `organisms/Menu`; the
    outside-pointerdown close excludes its own trigger, as Menu does.
12. `Menu`: reopening during the exit transition focuses the first item again;
    inside a Sheet the items carry `data-mantine-stop-propagation` and Escape
    closes only the menu; the «Player menu» story uses the `heroes` key.
13. `Sheet`: with `motion: 'on'` the initial focus lands on the section, not
    the first tabbable (Sheet.tsx:34-38; story opening from closed with motion
    on); story-only `opener` keys removed.
14. `Dialog`: scroll lock through Mantine `RemoveScroll` (shared with Drawer);
    fr `_one` does not cover 0 (Dialog.json:8, :20); story-only `opener` keys
    removed.
15. `Drawer`: the same `RemoveScroll`; initial focus does not land on
    Combats; `ExtraScrollLock` and `ExtraFocusReturn` wait for focus before
    Escape.
16. `TurnBar`: key and story for the reason «Add a unit first» (six locales);
    `[data-disabled]` on the second line.
17. `BottomBar`: `onClick` required; story geometry through `layout.*`; extra
    path `packages/ui/src/layout.ts`: `bottomBar.padding.top` 12 → 10 (total
    98); every baseline that changes is regenerated in this commit.
18. `ConditionPicker`: one tap ring in «Tap: adding weakened» (the label ring
    of Checkbox is suppressed inside picker rows).
19. `TagSheet`: drops its Create workaround and its `onChange` truncation
    (units 5, 9); the `new` badge on a created tag; the «Close and Escape»
    story presses Escape; search resets on close; «Show all» with an active
    filter shows `presetCount`.
20. `PlayerHeader`: the heroes item uses `IconSwitchHorizontal` with the label
    «Heroes»; dead export `PlayerHeaderMenuItem` removed; fr «Menu» with a
    line in `allow-same.txt`.
21. `CombatHeader`: `undoDisabled` prop (the Undo item disabled when there is
    nothing to undo); Enter in the round field commits, closes the popover and
    returns focus to the round button, also when − / + reach a bound; Escape
    closes without committing; escalation values from `LIMITS`, pip layout
    taken from EscalationDie, not copied; the open ring through the atom's
    `data-tap`; the die's accessible name carries its value.
22. `ShareSheet`: `onCopy` returns `Promise<boolean> | void`; «Copied» shows
    only on `true` or `void`.
23. `PlayerRow`: drops the RoleBlock override (unit 7) and relies on NoteField
    (unit 8).
24. `UnitRow`: Release claim in ⋯ stays visible and is disabled when
    `claimedBy === null`; `[data-flash]` does not paint dead or disabled rows;
    the role block has the accessible name «Roll initiative»; every callback is
    optional when `readOnly`; the tap marker is visible on an active row (a
    marker colour other than `--cp-color-accent` there); drops the RoleBlock
    override (unit 7).
25. `PresetCard`: drops the RoleBlock override (unit 7).
26. `HpHistory`: the «long list scrolls by keyboard» story presses a key and
    asserts `scrollTop` grows.
27. `UnitForm`: the picked preset resets on tab and filter change, and the
    «Add <name>» button submits exactly the named preset; a `hint` prop shows
    the initiative hint from vision (Unit → Form: rolled at Start in Setup, on
    add in Active), en copy in the six locales; stories that end by submit or
    cancel keep the sheet open for the baseline (the submit is a separate
    `Extra` story); an empty name in Edit draws the `#E2D8C6` border without
    `:placeholder-shown`; dead `data-long` removed.

## Allowed paths

Each unit's component folder `packages/ui/src/<level>/<Name>/**`, its six
`packages/ui/src/i18n/<lng>/<Name>.json`, `packages/ui/__screenshots__/<Name>/**`,
`packages/ui/src/i18n/allow-same.txt` (append only); plus `vite.config.ts`
(unit 1), `scripts/check-stories.mjs` and `scripts/test/stories-*/**` (unit 2),
`packages/ui/src/layout.ts` (unit 17). Nothing else: no `index.ts`, no
`theme.ts`, no other script.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm storybook:build`,
   `node scripts/test/run.mjs` exit 0; `pnpm exec vp test --project visual`
   passes without `--update` on the first run.
2. Every item of units 3–27 is closed with file and line in `REPORT.md`; every
   behaviour item has a `play` that fails on the old code (named in the
   report).
3. `check-stories` derives the UnitForm cells and unique names; its two new
   fixtures fail on the old script and pass on the new one.
4. Six i18n files per touched namespace with identical keys; `check-i18n`
   passes.
5. One commit per unit with the subjects above, each inside its paths; no
   comments; trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
