# Phase 2 common rules

Included by reference from every phase-2 brief. The brief names the batch, the
components, the pages, the renders and the acceptance criteria; this file holds
what every UI batch shares.

## Sources

`CLAUDE.md` at the worktree root (all sections, including Commands, Versions,
Dependencies). Plan `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
sections «Решения владельца» and «Фаза 2 — packages/ui». `docs/vision.md`:
sections Design, Limits, and the feature section the component serves.
`docs/design/handoff/README.md`: Page structure, Layout rules, Design tokens, Key
interaction rules. `docs/design/handoff-errata.md`. The component's page
`docs/design/handoff/<Name>.dc.html` (read the whole page script: the groups,
rows, cells and the SPEC array carry the exact values) and its render
`docs/design/renders/<Name>.png`.

## Reference component

`packages/ui/src/atoms/Button/`: `Button.tsx`, `Button.module.css`,
`Button.stories.tsx`; i18n `packages/ui/src/i18n/<lng>/Button.json` for en, de,
es, fr, ja, ru; baselines `packages/ui/__screenshots__/Button/`. Every component
copies that layout: a `<Name>Cell` wrapper in the stories file that reads labels
through `useTranslation('<Name>')`, `preview.meta({ title: '<Level>/<Name>',
component })`, one exported story per page cell with `name` = the human label,
`render` helpers that set `data-pressed` / `data-focus` / other `data-*` for
visual states, `play` with `expect` from `storybook/test`. Theme tokens come
from `packages/ui/src/theme.ts` (`palette`, `roles`, `health`, `hpActions`,
`conditions`, `fontFamilies`, `fontSizes`, `lineHeights`, `spacing`, `radius`,
`focusRing`, `tapMarker`, `iconSizes`) and layout numbers from
`packages/ui/src/layout.ts`; CSS uses the CSS variables `theme.ts` resolves
(see `Button.module.css`), never a raw hex that a token covers. Icons from
`@tabler/icons-react`. A Mantine component is used when its meaning matches and
every size and color is overridden to the page.

## Folder and commit

`packages/ui/src/<level>/<Name>/<Name>.tsx`, `<Name>.module.css`,
`<Name>.stories.tsx`; `packages/ui/src/i18n/<lng>/<Name>.json` × 6;
`packages/ui/__screenshots__/<Name>/<Story>.png`; optional
`packages/ui/__screenshots__/<Name>/<Name>.same.txt` listing byte-identical
groups. `<level>` is `atoms`, `molecules` or `organisms`. One commit per
component, subject `feat(ui): <Name>`, touching only those paths. A component
that reuses a lower-level component imports it by relative path
(`../../atoms/Button/Button.tsx`). `packages/ui/src/index.ts` is not edited in
phase 2; the exports are assembled by `fix-2.4`.

## Stories

- Story names: run `node scripts/check-stories.mjs` with an empty
  `<Name>.stories.tsx` committed to the working tree (not to git) to print every
  required export name for the page; the script derives them from the page's
  groups (`rows[].label × cols[]`, or `cells[].caption`, Anatomy by group title,
  group title prefixed when a name repeats or starts with a digit; groups from
  Flow on are flow steps, not cells). Extra stories carry the prefix `Extra`.
- A page with a Flow section needs at least one `play`; every `play` has at least
  one `expect(`. Interaction stories assert the callback spy (`fn()`), the
  keyboard path (Enter, Space, arrows where the page says) and the disabled path.
- Edge-case stories use the page's own literals (de, ru, ja strings, 999/−999)
  verbatim.
- Visual states are real pseudo-classes plus `data-*`: `&:active,
  &[data-pressed]`, `&:focus-visible, &[data-focus]`, `&[data-selected]`,
  `&[data-open]`; stories set the attribute; no `state` prop that only switches
  looks. Props carry meaning (`disabled`, `checked`, `value`, `role`).
- Stories of atoms and molecules render on the plain canvas; organisms that are
  bars, sheets, headers or full-width rows set `parameters: { phoneFrame: true }`.

## Baselines

`pnpm exec vp test --project visual --update -t <Name>` on the local Chromium
(Docker is not reachable on this machine; `pnpm screenshots:update` fails with
`permission denied` on the socket, do not try to fix it). Run it a second time
without `--update` to confirm the PNGs are stable. No `.docker-*` marker is
written; `COMBAT_PLANNER_NO_DOCKER=1` is set for `pnpm check`. Record under Left
undone that the baselines come from the local Chromium.

## i18n

Six files with identical keys, English written by the agent, the other five
translated by the agent; `ru` Cyrillic, `ja` CJK; a non-en value equal to en is
listed in `packages/ui/src/i18n/allow-same.txt` as `<Name>.<key>` (brand names,
numbers, symbols only). `packages/ui/src/i18n/REVIEWED.md` is never touched.

## Lower-level bugs

A bug in a component from an earlier batch is not fixed here: it goes into
`REPORT.md` under Questions with the file and the symptom, and the current
component works around it only when the page cannot be met otherwise.

## Environment and checks

`source ~/.nvm/nvm.sh && nvm use` in every shell; `pnpm install --frozen-lockfile`
first. Pre-commit: `COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.
Hand-back: stop Storybook (6006) and any browser (9222); `REPORT.md` sections
per `CLAUDE.md`; the hand-back message is the `REPORT.md` path only.
