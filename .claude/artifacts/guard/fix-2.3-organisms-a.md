# Guard: fix-2.3-organisms-a

Range `ea48288..42544a4` (4915713 Sheet, 42544a4 Dialog). Read-only; gate logs `.claude/run/fix-2.3-organisms-a/`. Guard on Opus 5.5 xhigh. Mantine sources: `@mantine/hooks` 9.7.2 esm (H), `@mantine/core` 9.7.2 esm (C).

CRIT 1 PASS .claude/run/fix-2.3-organisms-a/summary.log — check, test (63 files, 1129), full visual without `--update` (713, includes ConditionPicker and TagSheet), storybook:build exit 0 on the rebased branch.
CRIT 2 PASS .claude/artifacts/reports/fix-2.3-organisms-a.md:21-43 — every anchor matches the merged tree; each play fails on the old code by reading (ExtraShiftTab, ExtraOverSheet via C/components/ModalBase/use-modal.mjs:17, ExtraTapTextThenEscape, ExtraFragmentActions, TwoButtonsPrimaryDisabled:273, ExtraDescriptionIsSubtitle, ExtraScrollLock, four plural stories).
CRIT 3 PASS packages/ui/src/organisms/Sheet/Sheet.stories.tsx:422-431 ExtraNoActions; Sheet.tsx:15, :73-81.
CRIT 4 PASS 4915713 and 42544a4 — one folder each with six json files and new PNGs; trailer; no comments.

Units: U1.1 Sheet.tsx:34-38, :54, :65 — title without autofocus, `sheetRef` on the trap section (C/components/FocusTrap/FocusTrap.mjs:10-13, C/components/ModalBase/ModalBaseContent.mjs:28-37), `scopeTab` edge on the node itself (H/use-focus-trap/scope-tab.mjs:12). U1.2 Sheet.tsx:15, :19-27, :73-81. U1.3 Sheet.tsx:66, :70-72 (ConditionPicker description becomes the unit name, ConditionPicker.tsx:45). U1.4 Sheet.module.css:20, :23. U1.5 six new PNGs, none modified. U2.1 Dialog.tsx:66, :72. U2.2 Dialog.tsx:73, :97, :108 (`data-mantine-stop-propagation` on every focusable node). U2.3 Dialog.tsx:46-54. U2.4 five new PNGs. U3 plurals in six locales, ru forms correct. ConditionPicker and TagSheet unchanged in behaviour and baselines.

## Scope check

In scope only.

## Findings

1. P2 packages/ui/src/organisms/Sheet/Sheet.tsx:34-38 — hypothesis: with motion on (provider.tsx:81-84 keeps Modal's 200 ms transition, C/components/Modal/ModalRoot.mjs:25-28), Transition renders nothing until a requestAnimationFrame (C/components/Transition/Transition.mjs:47, use-transition.mjs:33-35), so the `setTimeout(0)` finds `sheetRef.current` null and Mantine focuses the first tabbable (H/use-focus-trap/use-focus-trap.mjs:8-17). Focus still stays inside (Shift+Tab wraps from tabbable[0]); the brief's "initial focus on the content section" and a motion-on story from closed are missing. Fix: focus from Modal.Root `onEnterTransitionEnd` or the Content ref callback.
2. P3 packages/ui/src/i18n/fr/Dialog.json:8, :20 — French `one` covers 0: an empty combat reads "L'unique unité est retirée…".
3. P3 packages/ui/src/organisms/Dialog/Dialog.tsx:46-54 — hypothesis: `body.style.overflow = 'hidden'` locks only body scrolling, not an inner scroll container or touch chaining; Sheet uses Mantine RemoveScroll (C/components/ModalBase/ModalBase.mjs:49-51); ExtraScrollLock checks the style only.
4. P3 packages/ui/src/organisms/Sheet/Sheet.module.css:20-23 — no behaviour change: the base already had `var(--cp-layout-status-bar, 0px)`; ExtraLongContent and ExtraNoActions fail on the old code through the new `[data-sheet-content]` selector, not behaviour. For the record.

4 pass / 0 fail / 0 unverifiable; 10/10 unit bullets pass; scope held.
