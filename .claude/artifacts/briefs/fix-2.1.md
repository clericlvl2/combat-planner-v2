# Brief: fix-2.1

Batch `fix-2.1`, phase 2.1 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
one agent fixes the guard findings of phase 0.5 and the four atoms batches and
regenerates the dependent baselines. Common rules:
`.claude/artifacts/briefs/_phase-2-common.md`, read first. Guard files:
`.claude/artifacts/guard/0.5-reference.md`, `2.1-atoms-a.md`, `2.1-atoms-b.md`,
`2.1-atoms-c.md`, `2.1-atoms-d.md`. Reports (decisions already taken):
`.claude/artifacts/reports/0.5-reference.md`, `2.1-atoms-a.md` … `2.1-atoms-d.md`.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-2.1`, branch
  `agent/fix-2.1`. Work only inside that path.
- Tool-call limit: 250.

## Units, in this order, one commit each

Subjects `fix(ui): <Name>` for a component, `chore(ui): <unit>` otherwise. A
commit touches one component folder plus its i18n files and baselines; the
`theme` and `domain link` units touch the package files named below.

1. `chore(ui): domain link`: `packages/ui/package.json` adds
   `@combat-planner/domain` as `workspace:*`; `packages/ui/tsconfig.json`
   references `../domain`; `pnpm install` updates the lockfile. No component
   changes in this commit.
2. `fix(ui): theme`: `packages/ui/src/theme.ts` gains `combatColors`, the eight
   combat colours (indices 0–7) with index 7 = `#8C8578`, exposed as CSS
   variables `--cp-combat-<index>` next to the other palettes; the
   `ThemeAudit` story shows them as a ninth group; `ThemeAudit.module.css`
   drops `columns: 2` in favour of a single column that keeps the page's
   reading order within 390×844 (reduce swatch size further if needed) and
   deletes the hidden `.sampleUse` rule together with the markup that rendered
   it; baselines of `ThemeAudit` regenerated.
3. `chore(ui): PhoneFrame`: `PhoneFrame` reserves the top 44 px for the status
   bar (`padding-top: var(--cp-layout-status-bar)` on the screen area) unless
   the story sets `parameters: { phoneFrame: { overlay: true } }`, which
   organisms with their own header use; `Button/ExtraPhoneFrame` baseline
   regenerated.
4. `chore(ui): Hello`: delete `packages/ui/src/Hello/`, its baseline folder and
   its export from `packages/ui/src/index.ts`.
5. `fix(ui): Button`: pressed selector exactly `&:active, &[data-pressed]`
   (disabled handled by `&:disabled` ordering, not `:not`); drop the `type`
   prop (`type="button"` is set internally); baselines regenerated where
   changed.
6. `fix(ui): TextField`: the wrapped multi-line cells (`Name, ru` filled, focus,
   over limit) render at the page's height (min-height 48 box, textarea
   without vertical padding, centred when single-line); add `type?: 'email' |
   'password'` that renders a single-line `<input>` for the sign-in forms (no
   wrapping); drop `aria-multiline="false"`; `maxLength` defaults come from
   `LIMITS` of `@combat-planner/domain` where the page's number equals a limit
   (title 80, name 40, description 500, note 250), stories keep the page's
   literals; baselines regenerated.
7. `fix(ui): TextArea`: `maxLength` defaults from `LIMITS` as above;
   baselines regenerated only if pixels change.
8. `fix(ui): ToolButton`: `ActiveEn` story uses `labelKey: 'lastPlayed'`;
   baselines unchanged unless pixels change.
9. `fix(ui): NumberField`: input width no longer depends on `field-sizing:
   content` alone (`size` attribute or ch-based width from `max`); `min`,
   `max` and the error text come from `LIMITS` where the page's number equals
   a limit (defenses 0–99, Max HP 999); frame click focuses the input;
   baselines regenerated where changed.
10. `fix(ui): SearchField`: an explicit empty `placeholder` never yields
    `aria-label=""` (fallback to the i18n `search` label); frame click focuses
    the input.
11. `fix(ui): Swatch`: `combatColors` imported from `theme.ts` (index 7 now
    `#8C8578`); `CombatColor` type derived from `LIMITS.color`; baselines of
    `Colour8` and any story showing colour 8 regenerated.
12. `fix(ui): Chip`: keyboard story asserts Enter and Space flip `aria-pressed`
    on the toggle tag; `&[data-pressed]` no longer overrides condition /
    status / meta fills (scope the pressed rule to interactive variants);
    baselines regenerated where changed.
13. `fix(ui): <Name>` for each item of `.claude/artifacts/guard/2.1-atoms-d.md`
    at P1–P3 listed in the appendix below.

## Allowed paths

`packages/ui/package.json`, `packages/ui/tsconfig.json`, `pnpm-lock.yaml`,
`packages/ui/src/theme.ts`, `packages/ui/src/theme.module.css`,
`packages/ui/src/index.ts` (only the `Hello` export removal),
`packages/ui/src/storybook/**`, `packages/ui/src/Hello/**` (deletion),
`packages/ui/src/atoms/**`, `packages/ui/src/i18n/<lng>/*.json` for the atoms
and ThemeAudit, `packages/ui/src/i18n/allow-same.txt`,
`packages/ui/__screenshots__/**` for the touched components and `Hello`
(deletion). Nothing else.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm exec vp test
   --project visual` (all components, without `--update`), `pnpm
   storybook:build`, `pnpm build` exit 0.
2. Every P1 and P2 of the five guard files is closed with the file and line
   named in `REPORT.md`; every P3 is closed or listed under Left undone with a
   reason.
3. `packages/ui` imports `LIMITS` from `@combat-planner/domain` in TextField,
   TextArea, NumberField and Swatch; no literal that equals a `LIMITS` value
   remains in those components (stories may keep page literals).
4. `theme.combatColors[7] === '#8C8578'`; `Swatch` uses `theme.combatColors`.
5. `Hello` is gone; `check-screenshots` and `check-stories` pass.
6. One commit per unit above with the given subjects; a `fix(ui): <Name>`
   commit touches one component folder, its i18n files and its baselines.

## Appendix: 2.1-atoms-d findings

(filled by the orchestrator after the `2.1-atoms-d` guard)
