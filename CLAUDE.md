# Combat Planner v2 — rules for agents

## Sources

- `docs/vision.md`: behavior, data, limits, stack, architecture.
- `docs/design/handoff/`: visuals, layout, component tree, states. Read-only.
- `.claude/plans/2026-10-16-build-combat-planner-v2.md`: the build plan; the brief
  names the phase section to follow.
- `docs/archive/`: not a source.
- A conflict between vision.md and the handoff that the plan does not resolve is
  reported in the final message, not decided.

## Branches and worktrees

- `master` is integrated by the orchestrator only. No agent commits to it.
- One agent, one branch, one worktree. Branch `agent/<phase>-<slug>`, worktree
  `.worktrees/<phase>-<slug>`; examples `agent/2.1-atoms-a`,
  `agent/3-server-schema`. The orchestrator creates both from `master` and passes
  the worktree path in the brief; the agent works only inside that path.
- Phase tags `phase-0`, `phase-1`, `phase-2.1`, … mark `master` after a phase's
  full gate.
- Agents never push, never rebase or amend commits after reporting, never delete
  branches, never run `git worktree` commands.

## Commits

- One commit per component, screen, domain module, server sub-app or route group.
  A commit holds the code, its stories or tests, its screenshots and its i18n files.
- No work-in-progress commits. Nothing outside the paths listed in the brief.
- Message: `<type>(<scope>): <subject>`; types `feat`, `fix`, `test`, `chore`,
  `docs`; scopes `toolchain`, `domain`, `ui`, `api`, `server`, `web`, `e2e`,
  `docker`. Subject is the component or module name: `feat(ui): Button`,
  `feat(domain): reduce`, `feat(api): combats routes`.
- Last line of every message: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Before each commit: type check passes and the commit's own tests or stories pass.
  Commands are in the section Commands below.
- Before reporting: `git rebase master` in the worktree; conflicts are resolved only
  in files the brief lists. A conflict elsewhere is reported, not resolved.

## Shared files

- `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, Storybook config, theme,
  `CLAUDE.md`, plans and progress files change only when the brief says so. A
  component that needs a new dependency is reported with the package name; the
  orchestrator adds it on `master`.
- i18n: one namespace file per component or screen,
  `packages/ui/src/i18n/<lng>/<Name>.json`, six locales each. Loaded by glob; no
  shared string file to merge.
- Screenshot baselines: `packages/ui/__screenshots__/<Name>/`.

## Code

- No comments in code: no line comments, no block comments, no JSDoc, no TODO.
  Names, types, tests and stories carry the meaning. The only exceptions are
  directives a tool requires (`// eslint-disable-next-line`, `/// <reference`,
  `// @ts-expect-error` with no prose after it).

## Report

The agent's final message lists: commits (hash, subject); gate commands run and
their result; questions for the owner; differences from the handoff screenshots;
dependencies needed. Nothing else.

## Commands

Set by phase 0.
