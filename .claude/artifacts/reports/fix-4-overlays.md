# REPORT fix-4-overlays

## Commits

- `18781c8` fix(ui): Sheet

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: passed (69 story files, 64 i18n namespaces, 69 screenshot components, no comments).
- `pnpm test`: passed, 2050 tests.
- `pnpm exec vp test --project visual` without `--update`: passed, 1358 tests. Only new baseline: `packages/ui/__screenshots__/Sheet/ExtraClosedDoesNotBlock.png`, written with `--update -t ExtraClosedDoesNotBlock`, then confirmed by a run without `--update`. No existing baseline changed; the new PNG is byte-unique in its folder.
- `pnpm build`: passed.
- `pnpm storybook:build`: passed.
- `bash scripts/check-commit.sh master..HEAD`: passed, 1 commit.
- `ExtraClosedDoesNotBlock` against the old `Sheet.tsx` and `Sheet.module.css` (new story kept): failed as required; with the fix it passes.

## Questions

None.

## Differences from the renders

None. The fix hides the empty Mantine `Modal.Root` box only while the Sheet is closed and its exit transition has ended (`data-present` is absent, `.root:not([data-present]) { display: none }`). Open and closing Sheets keep their look, focus, scrim and transitions.

## Dependencies needed

None.

## Left undone

- Unit 2 (`Menu`, `Dialog`, `Drawer`, `CombatHeader`): no closed overlay blocks clicks, so there is no commit for this unit.
  - `packages/ui/src/organisms/Menu/Menu.tsx:238-250`: a Mantine `Popover` with `withinPortal={false}` and no `keepMounted`. `PopoverDropdown` wraps the dropdown in `Transition mounted={ctx.opened}`, so a closed Menu leaves no element. The inline form returns `null` when closed (`Menu.tsx:235`).
  - `packages/ui/src/organisms/CombatHeader/CombatHeader.tsx:175-198`: the same `Popover` pattern, no `keepMounted`.
  - `packages/ui/src/organisms/Dialog/Dialog.tsx:46`: returns `null` while closed, so the fixed `.root` in `Dialog.module.css:1-5` is never mounted while closed.
  - `packages/ui/src/organisms/Drawer/Drawer.tsx:64`: returns `null` while closed, so the fixed `.root` in `Drawer.module.css:1-5` is never mounted while closed.
  - `grep -rn keepMounted packages/ui/src` finds nothing. `Modal.Root` is used only in `Sheet.tsx`.

## Processes left running

none
