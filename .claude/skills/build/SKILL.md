---
name: build
description: Continue the autonomous build of Combat Planner v2 as the orchestrator — resume from the progress file, dispatch the next batch, integrate finished branches. Trigger on "/build", "продолжай сборку", "следующая фаза", "запускай агентов", "где мы по сборке".
---

# Build orchestrator

You are the orchestrator. You write no code. Rules for agents and documents:
`CLAUDE.md` at the repo root. Plan:
`.claude/plans/2026-10-16-build-combat-planner-v2.md`. Progress:
`.claude/artifacts/2026-10-16-handoff-build-progress.md`.

## On every invocation

1. Read the plan's «Исполнение» section and the whole progress file.
2. Run `scripts/status.sh` when it exists; before phase 0, run `git branch --list
   'agent/*'`, `git worktree list`, `git status --short`, and
   `ss -ltnp | grep -E ':(3000|5173|6006|9222)\b'`.
3. Reconcile every progress row not in `todo` with what step 2 shows. A worktree
   with a file newer than 15 minutes has a live agent: wait, do not restart.
4. Stop leftover listeners and labelled containers.
5. Take the first row whose status is not `merged`/`guarded` and do its next
   transition, in this order of priority: finish an integration in flight
   (rebase → gate → merge → guard), then dispatch the next `todo` batch while fewer
   than two agents run.

## Dispatch

1. Write `.claude/artifacts/briefs/<batch>.md` from the plan's phase section:
   worktree path, units in commit order, handoff pages and renders to read,
   allowed paths, acceptance criteria, pre-commit commands, REPORT.md contract.
   Commit it: `docs(briefs): <batch>`.
2. `git worktree add ../combat-planner-v2.wt/<batch> -b agent/<batch> master`.
3. Launch `worker-bee` with the brief path as the prompt. Model and effort from the
   plan's phase table: Fable 5.1 for domain, server and guard-bee; Opus 5.5
   otherwise; effort as the phase states.
4. Progress row → `running <agent-id> <ISO time>`. Commit the progress file.

## Hand-back

1. Copy the worktree's `REPORT.md` to `.claude/artifacts/reports/<batch>.md`;
   row → `reported`; commit.
2. Integrate as `CLAUDE.md` «Integration» says, one branch at a time; gate
   commands run in the background with logs under `.claude/run/<batch>/`.
3. guard-bee (Fable 5.1, higher) on `master` over the merged range with the
   batch's acceptance criteria; save its output to
   `.claude/artifacts/guard/<batch>.md`; row → `guarded`; P0–P1 → dispatch
   `fix-<batch>` to the same agent.
4. After the last batch of a phase: phase gate, tag `phase-<N>`, update the phase
   table.

## Owner contact

Nothing between phases. Questions from reports accumulate in the progress file's
«Вопросы владельцу». The one message to the owner is written after `phase-6`, with
the content listed in the plan's «Итоговое сообщение владельцу».
