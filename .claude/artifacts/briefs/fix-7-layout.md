# Brief: fix-7-layout

Batch `fix-7-layout`. It fixes two layout defects the owner found on a real
phone. Rules: `CLAUDE.md` (all sections).

## Defects

1. **White strip on tall phones.** `html`, `body` and `#root` have no height,
   so screens laid out as `height: 100%` (`screens/shared/PageScreen.module.css:8`,
   `screens/CombatList/CombatList.module.css:8`, Library, PlayerView, …) end
   at their content. Below them the white `body` shows. In Storybook the
   390×844 `PhoneFrame` (`storybook/PhoneFrame.module.css:16`) hides this.
2. **Focus outlines clipped inside popups.** `organisms/Sheet/Sheet.module.css:100-107`
   `.content` has `overflow-y: auto` and `padding: 0`. Focus rings sit outside
   the element: `--cp-state-focus` is 2px with offset 2px, and the tap marker
   is 3px with offset 2px, so up to 5px. They are clipped at the scroll edge in
   every Sheet: CombatFormSheet, PresetFormSheet, TagSheet, NumpadSheet,
   ShareSheet.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-7-layout`,
  branch `agent/fix-7-layout`. Work only inside that path.
- Tool-call limit: 200. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed.
- Ports 3000 and 5173 are shared. Check them with `ss -ltn` before `pnpm e2e`
  or `pnpm dev`. Never kill a process you did not start.

## Units, in this order, one commit each

1. `viewport` (`fix(web): viewport`), `apps/web/src/root.css`,
   `e2e/layout.spec.ts`:
   - `html`, `body` and `#root` fill the viewport: `height: 100vh` first, then
     `height: 100dvh`;
   - `#root` is a flex column, so the routed screen stretches;
   - `body` has `margin: 0` and `background: var(--cp-color-background)`.
   - `e2e/layout.spec.ts`, viewport 430×932: after sign-up, on `/combats`,
     `/library` and `/settings` the screen root's bottom edge equals the
     viewport height (±1px) and the page has no vertical scroll. It fails on
     the old `root.css`; say so in the report.
2. `Sheet` (`fix(ui): Sheet`), `packages/ui/src/organisms/Sheet/**`, its
   baselines:
   - `.content` gets `padding: 6px` and `margin: -6px`. The ring fits inside
     the scroll area, and the visible layout stays where it was;
   - story `ExtraFocusRingInside`: the first field of a form in the Sheet is
     focused with the keyboard (`userEvent.tab`). The play asserts that the
     field's rect, grown by 5px on every side, lies inside the `.content`
     element's client rect. It fails on the old CSS;
   - if any Sheet baseline changes, regenerate it: delete the PNG,
     `--update -t <Name>`, run again without `--update`. Do the same for
     consumers' baselines (CombatFormSheet, PresetFormSheet, TagSheet,
     NumpadSheet, ShareSheet, screens). Name each changed folder in the report.
     Baseline-only changes of consumers are allowed in this commit; that is the
     owner-accepted shared-component exception.
3. `Dialog` (`fix(ui): Dialog`), `packages/ui/src/organisms/Dialog/**`: only
   if its scrolling body clips a focus ring in the same way. Same fix and a
   story. If it does not clip, commit nothing and give the file:line checked
   under Left undone.

## Allowed paths

As listed per unit, plus the consumer baselines named in unit 2.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`. For unit 1, also
`pnpm build && pnpm e2e`.

## Acceptance criteria

1. These exit 0:
   - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
   - `pnpm test`;
   - `pnpm build`;
   - `pnpm storybook:build`;
   - `pnpm exec vp test --project visual` without `--update`;
   - `pnpm e2e`, 22 or more passed.
2. The new e2e test and the new story both fail on the old code.
3. No listener remains on 3000 or 5173.
4. One commit per unit with the subjects above; no comments; trailer as in
   `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`. If `REPORT.md` cannot be written,
return its full text as the final message.
