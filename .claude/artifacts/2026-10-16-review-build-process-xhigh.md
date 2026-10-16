# Review of the build process at fed0d5c

Reviewer: Claude Fable 5.1 at effort xhigh, read-only, over CLAUDE.md, the plan, the
progress file, docs/vision.md, the handoff README and two handoff pages, and the
discrepancy report. Findings keep the reviewer's numbering.

Verdict: the run stalls in phase 0 or phase 2 as written; the docs are a spec, not
yet an executable process.

## Q1 Feasibility

1. plan 80-86, 98-111; vision 500-525 — every toolchain unknown lands on one phase-0 agent with no fallback tree (vp ^1.1 wrapping Vitest projects, Storybook 10 addon-vitest in browser mode, visual project in Docker, CSF factories and setProjectAnnotations mixed, Mantine 9, addon-mcp, storybook-addon-remix-react-router vs React Router 7; compat of the last three unverified). — Phase 0 is a spike with a decision tree per unknown ("try X; after 2 failures use Y; record in CLAUDE.md Commands"), a tool-call cap, acceptance "gate green from a fresh clone after `pnpm install --frozen-lockfile`".
2. plan 175-194 — conventions are prose; nine parallel agents produce nine styles. — Phase 0.5: one agent builds `Button` end to end (tsx, module.css, all 27 cells of Button.dc.html as stories, play, six i18n files, Docker baselines), guard-approved; CLAUDE.md: "copy `packages/ui/src/atoms/Button` exactly".
3. plan 59, 182-187 — batches of 5–7 do not fit 200k. Button has 27 cells (~35 stories), Chip 33, UnitRow 34 labels; CombatScreen 47 flow steps. — Atoms 3–4, molecules 3, organisms 2 per batch; UnitRow, UnitForm, NumpadSheet alone; one screen per agent.
4. handoff pages are `<x-dc>` templates rendered by a runtime loading React/Babel from unpkg and fonts from Google/jsDelivr; an agent sees data, not pixels; 13 screen PNGs, none per component. — Before phase 2 render every page and every `?flow=` to `docs/design/renders/<Name>[-<code>].png`; briefs list the PNGs; guard-bee compares baselines to them.
5. CLAUDE.md 43-45 × plan 53 — "new dependency is reported, orchestrator adds it" while every UI batch needs react-i18next, fontsource, tabler, ulid. — Phase 0 installs the whole vision Stack list plus test deps; only off-list packages are reported.
6. plan 248-252 — screen play replays the flow from step 1; toasts hide after 4 s, rows flash 2 s, screenshots land mid-animation. — FakeApiClient takes a seed scenario; each story seeds the step's state, play does the step's own tap + assert; a `motion: 'off'` provider flag kills timers and animations in Storybook.
7. CLAUDE.md 29, 49 — an organism agent cannot fix an atom bug; an atom fix invalidates baselines of other batches. — A `fix-<level>` single-agent batch between levels owns lower-level fixes and regenerates dependent baselines.
8. plan 61-64 + CLAUDE.md 22, 37 — agent rebases, then ff-only: the second parallel branch fails because master moved, and the agent may not rebase after reporting. — One integration lock; per branch: orchestrator rebases (conflict → re-dispatch "resolve only in your paths") → gate on branch → merge → guard-bee on master `<last-tag>..HEAD` → P0–P1 to a fix batch. Gate commands run in background with a log file.
9. plan 262-266, 277-290 — `3-server-combats` is the whole product in one agent. — Split into `3-server-actions` and `3-server-live`; move the `ApiClient` interface with explicit signatures into phase 1.
10. plan 319-321 — phase-4 acceptance "manual scenario in dev": nobody can run it. — Phase 4 includes a smoke e2e (sign-up, create, add unit, start, next turn, player join in a second context); phase 5 extends it.
11. CLAUDE.md 17 + .gitignore — `.worktrees/` inside the repo: root vitest/tsc/oxlint crawl `.worktrees/*/packages/**`; three agents each running browser Vitest, Docker Playwright and Storybook builds contend. — Worktrees at `../combat-planner-v2.wt/<phase>-<slug>`; parallelism ≤ 2; `screenshots:update` behind a file lock.

## Q2 Slop

12. play undefined → stories without assertions. — `scripts/check-stories.mjs`: a component whose dc page has flows must have ≥1 play; every play contains ≥1 `expect(`; fail on `.only`, `.skip`, `tags: ['!test']`, `expect(true)`, a sole `toBeDefined()`.
13. "story name = cell caption" unchecked. — Script extracts cell labels from `<Name>.dc.html` and `S('CODE'` from screen pages and requires an exported story per name/code; extra stories only with prefix `Extra`.
14. Baselines generated once and never seen. — Gate: (a) baseline count == story count; (b) no two byte-identical PNGs per component unless listed in `<Name>.same.txt`; (c) screens are 390 wide; (d) a commit touching `__screenshots__/X/` must touch `src/**/X/`; (e) threshold overrides forbidden; (f) marker `__screenshots__/.docker-<image-tag>`, host-generated baselines rejected.
15. `i18n:check` checks key parity only. — Non-en value identical to en fails unless listed in `i18n/allow-same.txt`; `ru` must match Cyrillic, `ja` CJK; empty strings fail; `packages/ui/src/i18n/REVIEWED.md` lists owner-read namespaces.
16. Edge stories copy-pasted in English. — An edge story must contain ≥1 non-ASCII literal present in its dc page; three-digit HP stories use the page's 999/−999 literals.
17. 100 % branch coverage rewards tests restating code. — Tests import only `packages/domain/src/index.ts`; test names equal vision table rows (script); optionally a mutation run on reduce.ts.
18. guard-bee has no output schema. — One line per criterion `CRIT <n> PASS|FAIL <file:line>`; orchestrator checks line count and that cited paths exist; all-PASS with no cited test/story names is rerun; a `feat(ui): X` commit >1500 lines or touching >1 component folder fails.
19. No-comments rule unenforced. — Grep gate for `//` and `/*` outside the allowlist in hand-written `src/**`, `test/**`.

## Q3 Document lifecycles

20. vision.md — writer undefined; "tests win" lets a wrong test override the spec mid-run. — `frozen` for the run → `amended` only by the orchestrator between phases on an owner answer, recorded as a dated bullet in plan "Решения владельца", commit `docs(vision): <question>`; "tests win" only after the owner accepts phase 1; add vision.md to shared files.
21. Plan — `approved` → immutable for the run; changes are dated bullets by the orchestrator between phases; acceptance criteria of a started phase never change; agents never write.
22. Progress file — contradictory writers (plan says agents write questions; CLAUDE.md forbids; agent's copy lives in its worktree). — Single writer orchestrator: unit `todo → done <hash>`; batch `todo → running <branch> <agent-id> <started> → reported <REPORT path> → rebased → gate ok|fail <log> → merged <hash> → guarded <path>`; `gate fail`/`guard P0–P1` → `rework <n>`; silent → `restarted <n>`. Checkbox rows become named units.
23. Discrepancy report — still says "fold unless objected". — `frozen 2026-10-16`, nobody writes; later decisions go to the plan.
24. Root CLAUDE.md — phase-0 agent writes Commands but shared-files rule forbids; "без изменений" yet phase 2 changes `check`. — `draft` → `commands-set` (phase-0 agent writes only Commands, Versions, Dependencies in `chore(toolchain): CLAUDE.md commands`) → `frozen`; the later `i18n:check` edit is pre-written in the plan and applied by the orchestrator at `phase-1`.
25. i18n JSON — writer the component's agent; `draft` → `reviewed` via REVIEWED.md; gate: changed `i18n/*/<Name>.json` must match the commit subject.
26. Screenshot baselines — writer component agent plus fix batch; `generated` → `checked` (guard-bee compared to render). Forbidden: change without story/component change; host generation.
27. docs/archive — `frozen`, owner only; add to shared files. Handoff bundle — read-only yet it instructs edits (PROTOTYPE-RULES.md "update nav.js"), invites another stack (README 9), keeps closed questions (README 95-98), stamps pages `status="Draft"`. — `docs/design/handoff-errata.md` outside the bundle listing those; CLAUDE.md points to it.
28. Agent report is a chat message, gone on compaction and worktree deletion. — Agent writes `REPORT.md` at the worktree root (gitignored) with the CLAUDE.md sections plus Questions; chat message is one line with the path; orchestrator copies it into the progress file first.

## Q4 Compaction survival

29. Simulation (2.3: one merged, one reported, one silent): git yields merged units and an unmerged branch; missing: agent-id ↔ branch, whether the reported branch passed the gate, whether the silent agent is alive (restart while running puts two agents in one worktree), the brief (chat only), guard findings, integration step. settings.local.json sets autocompact at 40 %, so this happens several times per batch.
30. Add: (a) briefs as files `.claude/artifacts/briefs/<batch>.md` committed before dispatch; (b) row fields agent-id, started, last-seen, report, gate log, guard path; (c) `scripts/status.sh`: per `agent/*` branch ahead/behind, is-ancestor, worktree dirty, REPORT.md present, newest mtime (<15 min ⇒ alive, never restart), gate log present; (d) gate logs in `.claude/run/<batch>/` (gitignored), guard output in `.claude/artifacts/guard/<batch>.md` (committed); (e) progress header rule "after compaction run status.sh, reconcile every non-todo row, then continue"; (f) unit names == commit subjects everywhere (progress "Heroes, TurnOrder" vs plan "PlayerView, PlayerClaim" already differ).

## Q5 Rule conflicts

31. "stop the phase, ask the owner" vs "one run, one message" vs "reported in the final message". — One rule: build per vision, question goes in REPORT.md, nobody waits.
32. Commit per component vs per phase (plan 33, vision 624). — Commit per unit, phase is a tag.
33. Five gate commands incl. e2e vs four vs agent-level checks. — Three levels: `pre-commit` (agent), `gate` (orchestrator, four), `phase-gate` (four + e2e from phase 5).
34. Agent rebases before reporting, never after, ff-only — unsatisfiable in parallel. — Orchestrator rebases.
35. guard-bee between phases vs per branch vs before merge. — Per batch on master after merge; tag only after the last batch's guard with no open P0–P1.
36. No commit unit for phases 0, 2.0, 4, 5, 6. — 0: `chore(toolchain): workspace | vitest projects | storybook | skeletons | CLAUDE.md commands`; 2.0: `feat(ui): theme`, `feat(ui): PhoneFrame`; 4: `feat(web): router | providers | player identity | drawer`; 5: one commit per scenario group; 6: `chore(docker): Dockerfile | compose`, `docs: README`.
37. No-comments rule vs drizzle migrations, postcss `/** @type */`, `// @vitest-environment`. — Scope to hand-written `src/**`, `test/**` ts/tsx/css; exempt generated and config files.
38. "theme in the first agent's brief" while 2.1 has two parallel first agents. — 2.0 its own batch, merged before 2.1.
39. Orchestrator adds dependencies vs writes no code. — Finding 5.
40. Tests override vision vs tests written per vision. — Finding 20.

## Q6 Anything else

41. Mantine defaults leaking (focus ring, transitions, Notifications position). — 2.0 ships a `ThemeAudit` story rendering every token with a baseline compared to a Tokens render.
42. No rule for forcing `:active`/`:focus` in screenshots; agents add display-only `state` props. — Selectors `&:active, &[data-pressed]`; stories set `data-*`; no `state` prop.
43. Screens with no handoff design after the owner's decisions (Heroes with checkboxes, player Edit form, About rows, Undo toast without Redo) are named only "nearest component". — List each with the exact handoff component and copy.
44. `vp run`/`vp pack` for internal packages adds a build per package to every gate. — Workspace source imports, TS project references; no packing.
45. Cookies + SSE through the Vite proxy unproven. — Phase 0 hello server includes one SSE route consumed through the proxy.
46. Parallel Playwright containers unbounded; Docker only assumed. — Phase 0 acceptance: `docker run` of the pinned image succeeds; parallelism cap.
47. Autocompact at 40 % halves usable orchestrator context. — Raise it, or finding 30 is mandatory.

## Do before phase 0, by impact

1. On-disk briefs, REPORT.md, status.sh, new progress-row fields, post-compaction procedure (28, 30).
2. Integration: orchestrator rebases under one lock, gate → merge → guard on master, tag after the last clean guard (8, 34, 35).
3. Halve batches; UnitRow/UnitForm/NumpadSheet/CombatScreen single-agent; 2.0 own batch; fix batches between levels (3, 7, 38).
4. Phase 0 as spike with fallback tree and all dependencies; phase 0.5 reference Button (1, 2, 5).
5. Render every handoff page and flow to docs/design/renders/; write handoff-errata.md (4, 27).
6. Seeded FakeApiClient scenarios and a motion-off flag (6).
7. Gate scripts: cell/story parity, play/expect, baseline dedup + Docker marker, i18n content checks, comment grep, commit-size cap, guard-bee schema (12–19).
8. Resolve contradictions: questions never stop the run, commit per unit, three gate levels, vision over tests during the run, vision.md in shared files (20, 31–33, 40).
9. Commit units for phases 0/2.0/4/5/6; one status vocabulary; screen names identical everywhere (22, 36, 30f).
10. ApiClient signatures into phase 1, split 3-server-combats, smoke e2e in phase 4, worktrees outside the repo (9, 10, 11).
