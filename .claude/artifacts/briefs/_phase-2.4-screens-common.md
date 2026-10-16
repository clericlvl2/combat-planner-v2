# Phase 2.4 screens: common rules

Included by reference from every 2.4 screen brief, on top of
`.claude/artifacts/briefs/_phase-2-common.md` (Sources, Reference component,
Baselines, i18n apply; Folder and commit is replaced by the section below).

## Sources

Plan `.claude/plans/2026-10-16-build-combat-planner-v2.md` paragraph 2.4 and the
list «Экраны и состояния, которых нет в хэндоффе». The screen page
`docs/design/handoff/<Page>.dc.html` (Anatomy, Key states, Flows: every
`S('<CODE>', …)` step carries the exact state), its renders
`docs/design/renders/<Page>-<FLOW>.png`, `docs/vision.md` sections the brief
names. Hooks and data: `packages/ui/src/api/` (`ApiProvider`, `useApi`,
`FakeApiClient`, `scenarios.ts`), `packages/ui/src/hooks/`, the report
`.claude/artifacts/reports/2.4-api-hooks.md` (hook signatures and scenario
shape). Organisms, molecules, atoms on `master` are reused by relative import;
their props are read from the source, not guessed.

## Folder and commit

- A screen lives in `packages/ui/src/screens/<Name>/` with `<Name>.tsx`,
  `<Name>.module.css`. The stories file that `scripts/check-stories.mjs`
  checks is `<Page>.stories.tsx` in `packages/ui/src/screens/<Page>/`, where
  `<Page>` is the handoff page name; it holds one export per flow step code
  (`CL-F1.1` → the export name the script prints) and the `Extra*` stories.
- Units are named in the brief; one commit per unit, subject
  `feat(ui): <Unit>`. A commit over 1500 changed lines (screenshots and the
  lockfile excluded) fails the gate: put scenario builders in
  `<Page>.scenarios.ts` in an earlier unit when the stories file grows.
- `check-stories` checks a page's stories file in every commit that contains
  it: the stories file is added in the unit that completes every step story.

## Data and state

- A screen reads and writes only through the hooks (vision Data flow 12). It
  never calls `useApi()` directly except to pass the client to a hook, and it
  never changes displayed state on its own: the document comes back through
  the hook (vision Data flow 11).
- Navigation uses `react-router` (`useNavigate`, `Link`) to the paths in vision
  Pages; route params come in as props (`combatId`, `token`), so 4-web wires
  the router.
- Stories: `parameters: { phoneFrame: true, scenario: <Scenario> }`; the
  decorator `withApi` (`packages/ui/src/storybook/withApi.tsx`) builds a
  `FakeApiClient({ scenario, delay: 0 })` and a fresh `QueryClient` per story
  and wraps the story in `ApiProvider`; screen stories add
  `withRouter` from `storybook-addon-remix-react-router` with
  `reactRouterParameters({ location, routing })` for the route.
- Each step story seeds the step's state through `scenario` (and, where the
  step starts inside an open sheet or menu, through the story's `args` or a
  `play` that opens it as the step's own action); its `play` performs only
  the step's own interaction and asserts with `expect`. Key states are the
  steps the page picks; no separate story when the script picks an existing
  step.
- Toast copy comes from the `Toast` namespace; a screen adds keys there only
  for toasts vision names that do not exist yet, in six locales, in the unit
  that uses them.
- `motion: 'off'` is set by Storybook; no story waits on a timer.

## Baselines

Screen baselines are 390 wide (`check-screenshots`); a story whose canvas is
taller than 844 is captured at full height (`visual.test.tsx`).
