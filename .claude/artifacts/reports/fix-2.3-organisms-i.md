# REPORT fix-2.3-organisms-i

## Commits

- `67f3db1` fix(ui): PlayerRow
- `007032c` fix(ui): MessageScreen

## Checks run

- `pnpm install --frozen-lockfile`: pass.
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: exit 0 (check-screenshots 42 components; check-stories, check-i18n, check-comments, check-domain-tests pass).
- `pnpm test`: exit 0, 69 files, 1239 tests.
- `pnpm exec vp test --project visual -t 'PlayerRow|MessageScreen'` without `--update`: 35 pass.
- `pnpm storybook:build`: exit 0.
- `bash scripts/check-commit.sh master..agent/fix-2.3-organisms-i`: 2 commits pass.
- Finding 1 regression proof: pre-fix `PlayerRow.tsx` restored for one run, `ExtraEnemyWithFields` failed with an AssertionError; passes with the fix.

## Questions

none

## Differences from the renders

- Guard finding 1 (P1), closed: `PlayerRow.tsx:66-80` decides enemy display by `unit.role !== 'enemy'`; an enemy row shows no HP numbers, temp HP, defenses, claimer, never `mine`, no expand, HP, initiative or note. Story `ExtraEnemyWithFields` (`PlayerRow.stories.tsx:577`) asserts none render and no spy fires; its baseline equals `EnemyBloodied`, listed in `PlayerRow.same.txt`.
- Guard finding 2 (P3), closed: `PlayerRow.stories.tsx:36-78` builds a `Unit` and `Combat` and gets each `PlayerUnit` from `project(combat, { kind: 'player', playerId: MIKA })`; local visibility copy removed; baselines unchanged.
- Guard finding 3 (P3), closed: `MessageScreen.stories.tsx:68,110` `LinkRevoked` and `De` no longer click; they assert the button is visible, not focused, not called; `De` asserts one line. Clicks moved to `ExtraTapAction` (:127) and `ExtraTapActionDe` (:137). `LinkRevoked.png` equals `Anatomy`, listed in `MessageScreen.same.txt`.
- Guard finding 4 (P3), closed: `ExtraLocaleFr`, `ExtraLocaleEs` (`PlayerRow.stories.tsx:627,637`) assert `scrollWidth <= clientWidth` for both trigger labels; `hpHistory` shortened to «Historique PV» (fr) and «Historial PG» (es).
- Guard finding 5 (P3, trailer): both commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` per `CLAUDE.md`.

## Dependencies needed

none

## Left undone

- Baselines from the local Playwright Chromium; no `.docker-*` marker.

## Processes left running

none
