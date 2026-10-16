# Combat Planner v2 — rules for agents

## Sources

- `docs/vision.md`: behavior, data, limits, stack, architecture.
- `docs/design/handoff/`: visuals, layout, component tree, states. Read-only.
  `docs/design/handoff-errata.md` lists the lines of the bundle that do not apply.
- `docs/design/renders/<Name>.png` and `<Screen>-<FLOW>.png`: the handoff pages
  rendered in a browser. The brief names the renders to match.
- `.claude/plans/2026-10-16-build-combat-planner-v2.md`: the build plan.
- `.claude/artifacts/briefs/<batch>.md`: the agent's own brief.
- `packages/ui/src/atoms/Button/`: the reference component. Every component copies
  its file layout, story layout, play style, i18n layout and CSS conventions.
- `docs/archive/`: not a source.
- A question that the sources do not answer never stops the work: the agent builds
  per vision.md, then the handoff, and writes the question into `REPORT.md`.

## Documents and who writes them

| Document | Writer | When | Otherwise |
|----------|--------|------|-----------|
| `docs/vision.md` | orchestrator | between phases, on an owner answer, commit `docs(vision): <topic>` | frozen |
| the plan | orchestrator | between phases, a dated bullet under «Решения владельца» | frozen; criteria of a started phase never change |
| progress file `.claude/artifacts/2026-10-16-handoff-build-progress.md` | orchestrator | after every dispatch, report, gate, merge, guard | agents never |
| `.claude/artifacts/briefs/<batch>.md` | orchestrator | before dispatch, committed on `master` | frozen after dispatch |
| `REPORT.md` at the worktree root | the batch agent | continuously; final before the hand-back | gitignored; orchestrator copies it to `.claude/artifacts/reports/<batch>.md` |
| `.claude/artifacts/guard/<batch>.md` | orchestrator, from guard-bee output | after merge | frozen |
| `.claude/run/<batch>/*.log` | orchestrator | gate runs | gitignored |
| this file, sections Commands, Versions, Dependencies | phase-0 agent, one commit `chore(toolchain): CLAUDE.md commands` | phase 0 | frozen; one pre-written edit at tag `phase-0.5` adds the check scripts to `check` |
| `packages/ui/src/i18n/<lng>/<Name>.json` | the agent that owns `<Name>` | with the component's commit | `packages/ui/src/i18n/REVIEWED.md`, owner only, lists namespaces the owner read |
| `packages/ui/__screenshots__/<Name>/` | the agent that owns `<Name>`; a fix batch | with the component's commit, generated in Docker | never changed without a change under `src/**/<Name>/` in the same commit |
| `docs/archive/`, `docs/design/handoff/`, reports and reviews in `.claude/artifacts/` | nobody | | frozen |

## Branches and worktrees

- `master` is integrated by the orchestrator only. No agent commits to it.
- One batch, one agent, one branch, one worktree. Branch `agent/<batch>`, worktree
  `../combat-planner-v2.wt/<batch>`; batch names are in the plan, e.g.
  `2.1-atoms-a`, `3-server-actions`, `fix-2.2`. The orchestrator creates both from
  `master` and passes the worktree path in the brief; the agent works only inside
  that path and runs `pnpm install --frozen-lockfile` there first.
- At most two batch agents run at the same time.
- Tags `phase-<N>` mark `master` after the last batch of a phase is merged and
  guarded with no open P0–P1.
- Agents never push, never touch `master`, never rebase, never amend after a
  hand-back, never delete branches, never run `git worktree`.

## Commits

- One commit per unit of work. Units are named in the plan and in the brief; the
  commit subject is the unit name. UI: one component or screen with its stories,
  screenshots and six i18n files. Domain: one module with its tests. Server: one
  sub-app with its tests. Phase 0: `workspace`, `vitest projects`, `storybook`,
  `skeletons`, `CLAUDE.md commands`. Phase 4: `router`, `providers`,
  `player identity`, `drawer`, `smoke e2e`. Phase 5: one commit per scenario
  group. Phase 6: `Dockerfile`, `compose`, `README`.
- Message: `<type>(<scope>): <unit>`; types `feat`, `fix`, `test`, `chore`,
  `docs`; scopes `toolchain`, `domain`, `ui`, `api`, `server`, `web`, `e2e`,
  `docker`. Last line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- No work-in-progress commits. Nothing outside the paths listed in the brief. A
  UI commit touches one component folder, its i18n files and its screenshots; a
  commit over 1500 changed lines fails the gate.
- Pre-commit, run by the agent: type check and the unit's own tests or stories,
  commands in Commands below.

## Checks

Three levels. Commands in Commands below.

- `pre-commit`: agent, before each commit: type check, the unit's tests or stories.
- `gate`: orchestrator, per batch on the rebased branch: `check`, `test`,
  `storybook:build`, `build`, plus the scripts in `scripts/check-*.mjs`.
- `phase-gate`: `gate` plus `e2e`, from phase 5 on, before a phase tag.

Scripts in `scripts/`, each exits non-zero with the offending path:

- `check-stories.mjs`: every cell label of `<Name>.dc.html` and every flow code of
  a screen page has an exported story with that name; extra stories carry the
  prefix `Extra`; a component whose page has a Flow section has at least one
  `play`; every `play` contains `expect(`; `.only`, `.skip`, `tags: ['!test']`,
  `expect(true)` and a sole `toBeDefined()` fail; an edge-case story contains at
  least one non-ASCII literal from its page.
- `check-i18n.mjs`: six locale files per namespace with the same keys; no empty
  value; a non-en value equal to the en value fails unless the key is listed in
  `packages/ui/src/i18n/allow-same.txt`; `ru` values contain Cyrillic, `ja` values
  contain CJK.
- `check-screenshots.mjs`: baseline count equals story count per component; no two
  byte-identical PNGs in one component folder unless listed in `<Name>.same.txt`;
  screen baselines are 390 wide; `__screenshots__/.docker-<image-tag>` marker
  present; no `toMatchScreenshot` threshold overrides.
- `check-comments.mjs`: no `//` or `/*` in hand-written `src/**` and `test/**`
  `.ts`, `.tsx`, `.css` except `// eslint-disable-next-line`, `// @ts-expect-error`,
  `/// <reference`, `// @vitest-environment`. Generated files, `drizzle/**`,
  `*.config.*`, `*.cjs` are exempt.
- `check-commit.sh <range>`: subject format, unit name present in the plan or
  brief, path scope, size cap.
- `status.sh`: per `agent/*` branch: ahead/behind `master`, merged or not,
  worktree dirty, `REPORT.md` present, newest file mtime, gate log present;
  listeners on the agent ports; labelled Docker containers.
- `kill-leftovers.sh`: stops listeners on the agent ports and the labelled
  containers. Wired to the `SubagentStop` and `Stop` hooks in
  `.claude/settings.json`.

## Integration, orchestrator only

1. Agent hands back: one line with the `REPORT.md` path. Orchestrator copies the
   report to `.claude/artifacts/reports/<batch>.md`, updates the progress row.
2. `git rebase master` in the agent's worktree. A conflict goes back to the same
   agent with "resolve only in your paths"; the agent hands back again.
3. `gate` on the branch, commands in background with logs in `.claude/run/<batch>/`.
4. `git merge --ff-only agent/<batch>` into `master`. One integration at a time.
5. guard-bee on `master`, range `<previous merge>..HEAD`, against the batch's
   acceptance criteria; output one line per criterion `CRIT <n> PASS|FAIL
   <file:line>`; saved to `.claude/artifacts/guard/<batch>.md`. P0–P1 open a
   `fix-<batch>` batch for the same agent in a new worktree.
6. Branch and worktree deleted after a clean guard.

## Code

- No comments in code, scope and exceptions as in `check-comments.mjs`. Names,
  types, tests and stories carry the meaning.
- Visual states are driven by real pseudo-classes and `data-*` attributes:
  selectors `&:active, &[data-pressed]`; stories set the `data-*` attribute. No
  `state` prop that only switches looks.
- Stories of screens seed the state through `FakeApiClient` scenarios and play
  only the step's own interaction. The UI provider takes `motion: 'off'`, which
  disables timers and transitions; Storybook sets it.
- Internal packages are imported from source through workspace links and TS
  project references. Nothing is packed.

## Processes

- Everything an agent starts that outlives a command — dev server, Storybook,
  `serve`, a Docker container, a browser — is stopped before the hand-back.
- Agent ports: web 5173, server 3000, Storybook 6006, browser 9222. A process the
  owner runs by hand uses other ports.
- Docker containers started by agents carry the label `combat-planner=agent`.
- `scripts/status.sh` prints listeners on the agent ports and `docker ps` filtered
  by that label; the orchestrator runs it before every dispatch and before every
  integration and stops what it finds.
- `scripts/kill-leftovers.sh` stops listeners on the agent ports and the labelled
  containers; `.claude/settings.json` runs it on the `SubagentStop` and `Stop`
  hooks.

## REPORT.md

Sections, in this order: Commits (hash, subject); Checks run (command, result);
Questions; Differences from the renders; Dependencies needed; Left undone;
Processes left running, allowed value `none`. Nothing else. Written before the
hand-back; the hand-back message is the path only.

## Commands

Set by phase 0.

## Versions

Set by phase 0.

## Dependencies

Set by phase 0. Only packages outside this list are "needed" in a report.
