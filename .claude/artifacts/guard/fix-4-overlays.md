# Guard fix-4-overlays

Range `1e3fcd1..130f90d` (1 commit `fix(ui): Sheet`). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/fix-4-overlays/summary.log:2-27 — every step exit 0; test 2050, visual 1358; one new baseline, `Sheet/ExtraClosedDoesNotBlock.png`, byte-unique.
CRIT 2 PASS packages/ui/src/organisms/Sheet/Sheet.tsx:48-49,66-67; Sheet.module.css:6-8; Sheet.stories.tsx:571-582:
- `present` follows `opened` and clears on `onExitTransitionEnd`, both with motion on (200 ms timer) and with `motion: 'off'` (synchronous).
- `.root:not([data-present]) { display: none }` applies only after the exit, when overlay and content are unmounted.
- The audit holds: Menu.tsx:235-251, CombatHeader.tsx:176-198, Dialog.tsx:46, Drawer.tsx:64. InitiativePopover.tsx:122-127 (default portal) also does not block.
CRIT 3 PASS 130f90d — 4 files under Sheet/** and __screenshots__/Sheet/**; 22 lines; no comments; trailer.

No regressions found in focus return, scrim and Escape, the exit transition, or nested Sheets. A closed TagSheet no longer sits above an open PresetFormSheet.

## Findings

1. P2 Sheet.stories.tsx:571-582 — the hit-test covers only a Sheet that was never opened, so it stays green with the `onExitTransitionEnd` wiring (Sheet.tsx:66) removed. Missing: open, close, wait for the exit, then `elementFromPoint`.
2. P3 hypothesis, process — the gate ran on 18781c8 before the rebase. `git diff 18781c8 130f90d` touches only `.claude/artifacts/**`.

3 pass / 0 fail / 0 unverifiable; scope held.
