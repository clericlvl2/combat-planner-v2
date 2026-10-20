# Brief: fix-21-geometry-scope

Batch `fix-21-geometry-scope`, a fix batch for `fix-15-geometry`. The guard is `.claude/artifacts/guard/fix-15-geometry.md`; the fix-15 report is `.claude/artifacts/reports/fix-15-geometry.md`.
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the result. Where `CLAUDE.md` mentions Docker screenshots, `COMBAT_PLANNER_NO_DOCKER`, check-domain-tests, handoff cells or Extra prefixes, it is outdated.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-21-geometry-scope`, branch `agent/fix-21-geometry-scope`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- Baselines: `pnpm screenshots:update` locally. Every changed PNG needs a cause named in the report.
- Do not start Storybook or a dev server. Another agent may run browser tests on the main checkout; that does not concern you.
- Tool-call limit: 150.

## Units, one commit each, in this order

1. `fix(ui): the stories without a phone frame are measured at 390 px`
   - Give the storybook test project in `vite.config.ts` a 390×844 viewport, the same as `layout.viewports.phone`.
   - In `geometry.ts`, `outsideFrame` and `overlaysOffFrame` fail when the story renders an overlay (a scrim or a fixed sheet) and has no `[data-phone-frame]`. They no longer return `[]` silently.
2. `fix(ui): geometry opt-outs name the element they excuse`
   - `parameters.geometry` takes, per check, either a reason string (the whole story) or `{ reason, except: '<selector>' }`, which skips only the matching elements.
   - Narrow every opt-out the guard lists under finding 3 to the element it excuses:
     - TurnBar "ru: longest labels": only the unit name. The «Следующий ход» label stays checked.
     - ShareSheet meta: only the link.
     - CombatScreen :762, :795, :1062: only the link.
     - CombatHeader :208: only the title.
     - NoteField, PlayerRow, HpHistory, TagSheet, ShareSheet tapTargets: only the test opener or host button.
   - Fix any defect that this uncovers. Do not opt it out.
   - Whole-story opt-outs stay only where the guard found them sound: Stepper S, SwatchRow 366, InitiativePopover, ThemeAudit.
3. `fix(ui): a tap area counts only the control, its pseudo-elements and the labels that enclose or touch it`
   - In `geometry.ts` `hitAreaOf`, a label separated from the control by a gap no longer extends the area.
4. `fix(ui): tap-target size comes from one CSS token`
   - Define a single custom property, e.g. `--cp-tap-target: 44px`, where the theme tokens live (`theme.module.css` or the Mantine CSS variables resolver, whichever the repo uses for layout tokens). Derive it from `layout.tapTarget` if the theme already generates CSS variables from `layout.ts`.
   - Replace the 44px literals in the hit-area rules with it.
   - The geometry checks still measure against `layout.tapTarget`.
5. `test(ui): restart dialog and setup header render in the long locales`
   - New stories:
     - Dialog: the restart confirm in fr, ru and de;
     - CombatHeader: the setup state in de, es, ru and fr.
   - The afterEach geometry checks cover them.
   - Any overflow they reveal is fixed in the same commit, through the translation or the layout.
   - fr `Dialog.json`: the title matches the button verb («Relancer le combat ?»).
6. `test(ui): tapping the note frame focuses the editor`
   - A NoteField `play` taps the edit frame outside the textarea and expects the textarea focused.
7. `fix(ui): <what the image diff shows>`, or no commit.
   - Establish what changed in `Library/LBF15.png`, `Library/LBF16.png` and `UnitForm/LibraryNothingFound.png` between `a22bf85` and `b33382c`: pixel diff, bounding box of the changed region, and the max channel delta.
   - If the change is visible (layout, colour, clipping, stacking), fix the CSS so the baseline returns and commit.
   - If it is sub-pixel text anti-aliasing only, no commit. Put the measurements in the report.

## Acceptance

1. Each finding 1–7 and 10 of the guard is fixed or, for finding 1, measured as above.
2. No whole-story opt-out remains except the four listed.
3. `pnpm check`, `pnpm test`, `pnpm build`, `pnpm exec vp test --project visual` and `E2E_PORT=3100 pnpm e2e` are green. For e2e, check `ss -ltn` first and never kill a process you did not start.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Changed baselines with cause;
- Questions;
- Left undone;
- Processes left running (`none`).
