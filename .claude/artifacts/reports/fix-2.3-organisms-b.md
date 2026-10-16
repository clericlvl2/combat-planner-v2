# REPORT fix-2.3-organisms-b

## Commits

- a27932d fix(ui): IconButton
- 375c640 fix(ui): Menu
- 678b05d fix(ui): Drawer

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: pass.
- `pnpm test`: pass, 1138 tests.
- `pnpm exec vp test --project visual` for all components, without `--update`: pass, 722 tests. Ran twice and it passed both times.
- `pnpm storybook:build`: pass.
- `bash scripts/check-commit.sh master..HEAD`: pass, 3 commits.
- Proof against the old code: I ran the new plays against the unchanged `Menu.tsx` and `Drawer.tsx` before making the fix. These failed: Menu `ExtraEscapeOnSource`, `ExtraTab`, `ExtraTapInsidePanel`, `ExtraEditCloses` and `ExtraMotionOn`; Drawer `ExtraShiftTabFirst`, `ExtraTapTitleThenKeys` and `ExtraScrollLock`. All of them pass after the fix.

## Guard findings closed

1. Finding 1, Drawer focus escaping. `packages/ui/src/organisms/Drawer/Drawer.tsx:91` now puts the `FocusTrap` on the panel through `innerRef`. `Drawer.tsx:60` gives the panel itself the initial focus, which is the same approach the Sheet fix used. Mantine's `scopeTab` therefore wraps in both directions from the panel. `tabIndex={-1}` sends a tap on the title or the email back to the panel. Escape is handled on the panel at `Drawer.tsx:98`. Stories: `Drawer.stories.tsx:160` `ExtraShiftTabFirst`, `:172` `ExtraTapTitleThenKeys`.
2. Finding 2, Menu focus with motion on. `packages/ui/src/organisms/Menu/Menu.tsx:120` focuses through a callback ref on the panel, which fires whenever the dropdown mounts. `focusFirstItem` at `:88` retries on animation frames, up to 30, while the transition has the item unfocusable. Story: `Menu.stories.tsx:400` `ExtraMotionOn` runs with `parameters: { motion: 'on' }`. It asserts `data-motion="on"`, presses Enter on the source, and checks focus on the first item, ArrowDown, then Escape.
3. Finding 3, Menu keyboard and taps inside the panel.
   - Escape: a document keydown listener in the capture phase at `Menu.tsx:136` closes the menu when focus is in the panel or on the source, then returns focus to the source button.
   - Tab and Shift+Tab from an item close the menu and return focus to the source (`:155`).
   - A tap on padding, a divider or a disabled item keeps focus in the panel. Mousedown outside an enabled item is prevented (`:178`), and the panel has `tabIndex={-1}` (`:195`).
   - Stories: `ExtraEscapeOnSource` (`Menu.stories.tsx:283`), `ExtraTab` (`:298`), `ExtraTapInsidePanel` (`:318`).
4. Finding 4, the source ring. `packages/ui/src/atoms/IconButton/IconButton.module.css:57` adds `&[data-open]`, using the same ink border and accent fill as the open ⋯ in CardActions. Story: `IconButton.stories.tsx:177` `ExtraOpen`; no other IconButton baseline changed. `Menu.tsx:242` clones `data-open` and a merged ref onto `target`, so a button source receives it directly. The ring stories now use an `IconButton` source and check `data-open` and the computed accent background on that button (`Menu.stories.tsx:238`, `ExtraSelect`). The `target` API is unchanged (`MenuTargetProps`: `ref?`, `data-open?`), so PlayerHeader stays compatible.
5. Finding 5, Edit leaving the menu open. Mantine's `closeOnClickOutside` is off (`Menu.tsx:239`). Menu's own pointerdown listener (`:130`) treats only the panel and the source button as inside. When the target is a wrapper, the source button is the target if it is a `button`, otherwise its first `[aria-haspopup]` descendant (`sourceButtonOf`, `:83`). A tap on Edit in CardActions now closes the menu. Story: `Menu.stories.tsx:357` `ExtraEditCloses`.
6. Finding 6, scroll part. `Drawer.tsx:68` sets `document.body.style.overflow = 'hidden'` while the drawer is open and puts the previous value back on close. Story: `Drawer.stories.tsx:189` `ExtraScrollLock`. The portal part is left to `4-web`, as the brief says.
7. Finding 7. The `opener` key is gone from all six `Drawer.json` files. The stand-in burger in the stories uses the literal `burgerLabel` (`Drawer.stories.tsx:21`).

## Questions

- When `target` is a wrapper such as CardActions, the cloned `data-open` still lands on the wrapper's root. The ring on the ⋯ comes from CardActions' own `open` prop. CardActions is outside this batch's paths, so I did not change it.
- Menu now returns focus to the source button after a select, Escape or Tab. Mantine `returnFocus` is no longer used. A tap outside closes the menu without moving focus.

## Differences from the renders

- None new. Menu and Drawer cell baselines are byte-identical to master. The changed or new baselines are all `Extra*`: Menu stories with an IconButton source, three new Drawer stories, and the IconButton `ExtraOpen`.

## Dependencies needed

none

## Left undone

- Baselines are rendered by the local Playwright Chromium because the Docker socket is not accessible. No `.docker-*` marker was written.

## Processes left running

none
