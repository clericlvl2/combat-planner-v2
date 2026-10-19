# REPORT fix-7-layout

(The text was returned by the agent and saved by the orchestrator, condensed.)

## Commits

394c6e8 fix(web): viewport · 6c85a15 fix(ui): Sheet

## Checks run

- These passed:
  - `pnpm check`;
  - `pnpm test` (2179);
  - `pnpm build`;
  - `pnpm storybook:build`;
  - visual (1372, two runs);
  - `pnpm e2e` (22).
- The new tests fail on the old code:
  - `e2e/layout.spec.ts` on the old `root.css`: the `/combats` root ends at 491.875 instead of ≥ 931;
  - `ExtraFocusRingInside` on the old Sheet CSS: `expected 23 to be ≥ 28`.
- `check-commit` is red on `fix(ui): Sheet`: 9 consumer baseline folders changed. This is the shared-component exception the brief allows.

## Differences from the renders

- Regenerated baselines:
  - Sheet (+ new ExtraFocusRingInside);
  - CombatFormSheet;
  - NumpadSheet;
  - PresetFormSheet;
  - SortSheet;
  - UnitForm;
  - CombatList CLF22–24, CLF32;
  - CombatScreen CSF12, CSF35, CSF36, CSF38, CSF39;
  - Library ExtraTagReused, LBF42, LBF46;
  - PlayerView PVF33.

  TagSheet and ShareSheet are unchanged.
- What changed: rings are drawn whole, and in scrolling sheets 6px more content shows at the edges.
- `CombatFormSheet/ExtraJapaneseNew.png` differs by 1px between a full visual run and a `-t` run. It was regenerated in a full run.
- A new `Sheet.same.txt` line: ExtraDescriptionIsSubtitle = FormEditCombat.

## Left undone

- Dialog: does not clip. `Dialog.module.css:31-32` has a 16px padding on its scrolling element.

## Questions

- A Storybook from the main checkout is listening on 6006 (pid 35169, started 05:05). The agent did not start it.

## Processes left running

none
