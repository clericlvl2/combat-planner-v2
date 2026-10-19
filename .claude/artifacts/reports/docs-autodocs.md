# REPORT docs-autodocs, first hand-back (stopped per brief)

(The text was returned by the agent and saved by the orchestrator, condensed.)

- `contain: layout` on `.phone` changes 72 baselines. All of them are phone-frame stories with an open Sheet, Dialog or Drawer. The scrim no longer paints the frame's rounded corners, and 43 of them show small antialiasing deltas. Diffs are in `/tmp/docs-autodocs/diffs/`.
- `tags: ['autodocs']` alone builds 69 docs entries for 69 stories files.
- Questions:
  - containment only in docs mode (→ 1b, orchestrator);
  - Mantine Modal `lockScroll`/`trapFocus` with several open sheets on one Docs page (hypothesis);
  - InitiativePopover portals to `body` on a Docs page.
- Nothing committed. The worktree is clean.

# Second hand-back

## Commits

489de69 chore(ui): autodocs:
- `preview.tsx`: `tags: ['autodocs']`, `docs.story.autoplay: false`, and the `withDocsTheme` decorator first.
- `PhoneFrame.tsx` / `.module.css`: `data-docs` and `.phone[data-docs] { contain: layout; }`, docs mode only.
- New `storybook/withDocsTheme.tsx`: docs mode only. Wraps the story in `MantineThemeProvider` with:
  - `ModalRoot.defaultProps`: `lockScroll`, `trapFocus` and `returnFocus` all `false`;
  - `Popover.defaultProps`: `withinPortal: false`.

## Checks run

- `pnpm check`: green.
- `pnpm test` (2179): green.
- visual 1372 without `--update`, no PNG changed: green.
- `storybook:build`: green, 69 docs entries = 69 stories files.
- check-commit: green.

## Questions

- Dialog and Drawer use `RemoveScroll`/`FocusTrap` directly, not Mantine Modal, so the theme can't reach them. Their Docs pages may lock scroll and trap focus (hypothesis).
- The Docs pages were not checked in a browser.

## Processes left running

none
