# Brief: fix-2.3-organisms-b

Batch `fix-2.3-organisms-b`, phase 2.3 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
the agent of `2.3-organisms-b` fixes the guard findings on Menu and Drawer.
Common rules: `.claude/artifacts/briefs/_phase-2-common.md`. Original brief:
`.claude/artifacts/briefs/2.3-organisms-b.md`. Guard:
`.claude/artifacts/guard/2.3-organisms-b.md`. Report and accepted decisions:
`.claude/artifacts/reports/2.3-organisms-b.md`, progress file
`.claude/artifacts/2026-10-16-handoff-build-progress.md` («Вопросы владельцу»,
bullet 2.3-organisms-b). The same class of focus defect was fixed in Sheet by
`fix-2.3-organisms-a` (initial focus on the trap node itself); reuse that
approach.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-2.3-organisms-b`,
  branch `agent/fix-2.3-organisms-b`. Work only inside that path.
- Tool-call limit: 200.

## Units, in this order, one commit each

1. `fix(ui): IconButton`: `&[data-open]` draws the source ring the Menu page
   shows (same token as CardActions' open ⋯); baselines unchanged unless
   pixels change; one `Extra` story with `data-open` (guard finding 4).
2. `fix(ui): Menu`:
   - Opened at a source with `motion: 'on'`, the first enabled item receives
     focus once the panel mounts; story with `parameters: { motion: 'on' }`
     presses Enter on the source and asserts the first item has focus
     (finding 2).
   - Escape closes the menu wherever focus is inside the menu or on its
     source; Tab and Shift+Tab from an item close the menu and return focus
     to the source (WAI-ARIA menu pattern); a tap on padding, a divider or a
     disabled item keeps focus in the panel; stories (finding 3).
   - The cloned `data-open` reaches the actual button that opens the menu,
     so an `IconButton` source shows the ring; the ring stories assert the
     attribute on the source button, not through CardActions' own `open`
     prop (finding 4).
   - A tap on another control of the source wrapper (Edit in CardActions)
     closes the menu; story (finding 5).
3. `fix(ui): Drawer`:
   - Focus stays inside the open drawer in both directions: the trap node is
     the panel, or initial focus goes to the current section; story presses
     Shift+Tab right after opening and asserts focus inside; a tap on the
     title or email keeps Escape working (finding 1).
   - Page scroll is locked while the drawer is open (finding 6, scroll part;
     the portal part belongs to `4-web`).
   - The `opener` key is removed; the stories' stand-in burger uses a literal
     label from the stories file (finding 7).

## Allowed paths

`packages/ui/src/atoms/IconButton/**`, `packages/ui/src/organisms/Menu/**`,
`packages/ui/src/organisms/Drawer/**`,
`packages/ui/src/i18n/<lng>/{IconButton,Menu,Drawer}.json`,
`packages/ui/src/i18n/allow-same.txt`,
`packages/ui/__screenshots__/{IconButton,Menu,Drawer}/**`. Nothing else.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm exec vp test
   --project visual` (all components, without `--update`), `pnpm
   storybook:build` exit 0.
2. Guard findings 1–5, 6 (scroll), 7 closed with file and line in the
   report; each behaviour fix is proven by a `play` that fails on the old
   code; the motion-on story runs with real transitions.
3. Three commits `fix(ui): IconButton`, `fix(ui): Menu`, `fix(ui): Drawer`,
   each touching only its folder, its i18n files and its baselines; no
   comments.

## Hand-back

Report per `CLAUDE.md` «REPORT.md». If writing `REPORT.md` is blocked, return
the full report as the final message.
