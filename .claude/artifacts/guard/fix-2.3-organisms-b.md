# Guard: fix-2.3-organisms-b

Range `ee087d9..eedf22d` (7b3730d IconButton, 619c49d Menu, eedf22d Drawer). Read-only; gate logs `.claude/run/fix-2.3-organisms-b/`. Mantine sources `@mantine/hooks` 9.7.2 esm (H), `@mantine/core` 9.7.2 esm (C). Guard on Opus 5.5 xhigh.

CRIT 1 PASS .claude/run/fix-2.3-organisms-b/summary.log:4-11 — check, test (1172), visual without `--update` (745), storybook:build, build exit 0 on the rebased branch.
CRIT 2 PASS .claude/artifacts/reports/fix-2.3-organisms-b.md:21-33 — findings 1–5, 6 (scroll), 7 anchored (one mislabel, finding 7); each new play fails on the old code by reading (Menu ExtraEscapeOnSource, ExtraTab, ExtraTapInsidePanel, ExtraEditCloses, ExtraMotionOn, ExtraSourceOpen; Drawer ExtraShiftTabFirst, ExtraTapTitleThenKeys, ExtraScrollLock); ExtraMotionOn (Menu.stories.tsx:400-417) runs with the real 150 ms fade (provider.tsx:82-85, C/components/Popover/Popover.mjs:27-30, theme.ts:201, :294-297).
CRIT 3 PASS 7b3730d, 619c49d, eedf22d — subjects and trailer; one folder each with i18n and baselines (3, 14, 12 files); no comments.

Units: U1 IconButton.module.css:57-60 (tokens as CardActions.module.css:25-28), ExtraOpen IconButton.stories.tsx:177-187. U2.1 Menu.tsx:88-97, :120-126. U2.2 Menu.tsx:136-147, :155-163, :178-182, :195; stories :283, :298, :318. U2.3 Menu.tsx:242, IconButton.tsx:41; ring stories :238, :249. U2.4 Menu.tsx:83-86, :130-135, :239; ExtraEditCloses :357-369. U3.1 Drawer.tsx:58-62, :91-99 (H/use-focus-trap/scope-tab.mjs:12); stories :160-170, :172-187. U3.2 Drawer.tsx:64-72, story :189-197. U3.3 `opener` removed; literal at Drawer.stories.tsx:21, :38.

Checks requested: Menu rAF retry not timer-order fragile (panel mounts inside `flushSync` in the first rAF, C/components/Transition/use-transition.mjs:33-36, at `opacity: 0`, focusable); Drawer initial focus not fragile (no Transition; Mantine timers fire first, FIFO); PlayerHeader still works (button target, `sourceButtonOf` Menu.tsx:84; stories PlayerHeader.stories.tsx:117, :135 passed); two Menus do not fight over Escape (each acts only on its own panel/source, Menu.tsx:138-141); a Menu inside the Drawer closes alone; a Menu inside a Sheet fights (finding 2).

## Scope check

In scope only; `index.ts`, `REVIEWED.md`, `allow-same.txt` untouched.

## Findings

1. P3 packages/ui/src/organisms/Menu/Menu.tsx:120-126 — hypothesis: reopening before the exit transition ends reuses the mounted panel (C/components/Transition/Transition.mjs:47, use-transition.mjs:22-48), `setPanel` is not called again, and focus stays on the source. Fix: also focus on `opened` false → true (Popover `onEnterTransitionEnd` or an `opened` effect).
2. P3 packages/ui/src/organisms/Menu/Menu.tsx:136-147, :154-163 — hypothesis: a Menu inside a Sheet: Mantine Modal's window capture Escape (C/components/ModalBase/use-modal.mjs:15-22) closes the Sheet too (no `data-mantine-stop-propagation` on items); Tab to the source can wrap through the Sheet's `scopeTab` (H/use-focus-trap/use-focus-trap.mjs:36-39). Not a regression; vision places menus only in headers, cards and rows.
3. P3 packages/ui/src/organisms/Drawer/Drawer.stories.tsx:189-197 — ExtraScrollLock presses Escape without waiting for focus in the panel (ExtraEscape waits, :121); same pattern in ExtraFocusReturn (:205-207); depends on timer order in the test only.
4. P3 packages/ui/src/organisms/Drawer/Drawer.tsx:58-62, :91 — hypothesis: on open focus visits Combats before the panel (Mantine timers focus the first tabbable, use-focus-trap.mjs:9, :25-28, :33-35); a screen reader may announce "Combats" first.
5. P3 packages/ui/src/organisms/Drawer/Drawer.tsx:64-72 — hypothesis: `body.style.overflow` locks body only, not inner containers or touch chaining; save-and-restore breaks if lockers close out of order (Dialog.tsx:46-54 same pattern).
6. P3 packages/ui/src/atoms/IconButton/IconButton.module.css:57-60 — hypothesis: `plain`/`soft`/`filled` variants have `border: none` (:30-43), so an open source shows the fill without the ring; `filled` keeps surface text colour on accent. No current Menu source uses them.
7. P3 .claude/artifacts/reports/fix-2.3-organisms-b.md:27, :5-7 — `Menu.stories.tsx:238` is ExtraSourceOpen, not ExtraSelect (:249); Commits section lists pre-rebase hashes (merged as 7b3730d, 619c49d, eedf22d).

## Outside the reviewed scope

- Story-only `opener` keys remain in `packages/ui/src/i18n/*/Sheet.json:19` (Sheet.stories.tsx:189) and `packages/ui/src/i18n/*/Dialog.json:3` (Dialog.stories.tsx:119, :152).

3 pass / 0 fail / 0 unverifiable; 8/8 unit bullets; scope held; 7 findings, all P3.
