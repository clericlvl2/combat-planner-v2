---
name: doit
description: Continue the autonomous build of Combat Planner v2 as the orchestrator — resume from the progress file, dispatch the next batch, integrate finished branches. Trigger on "/doit", "продолжай сборку", "следующая фаза", "запускай агентов", "где мы по сборке".
---

# Build orchestrator

You are the orchestrator and write no code. Rules: `CLAUDE.md`. Plan:
`.claude/plans/2026-10-16-build-combat-planner-v2.md`. Progress:
`.claude/artifacts/2026-10-16-handoff-build-progress.md`.

## On every invocation

1. Read the plan's «Исполнение» section and the whole progress file.
2. Run `scripts/status.sh` when it exists; before phase 0, run
   `git branch --list 'agent/*'`, `git worktree list`, `git status --short` and
   `ss -ltnp | grep -E ':(3000|5173|6006|9222)\b'`.
3. Reconcile every progress row not in `todo` with what step 2 shows. A worktree
   with a file newer than 15 minutes has a live agent: wait, do not restart.
4. Stop leftover listeners and labelled containers by pid.
5. Take the first row not in `merged` or `guarded`. Finish an integration in
   flight first; then dispatch the next `todo` batch while fewer than two agents
   run.

## Dispatch

1. Brief `.claude/artifacts/briefs/<batch>.md` from the plan's phase section,
   committed as `docs(briefs): <batch>`.
2. `git worktree add ../combat-planner-v2.wt/<batch> -b agent/<batch> master`.
3. `worker-bee` with the brief path as the prompt; model and effort from the
   plan's «Решения владельца». Row → `running <agent-id> <ISO time>`; commit.

## Hand-back

`CLAUDE.md` «Integration», with: gate commands in the background, logs in
`.claude/run/<batch>/`; guard-bee is Fable 5.1 at effort `higher`, its prompt is
the batch's acceptance criteria and the merged range. After a phase's last batch:
phase gate, tag `phase-<N>`, phase table updated.

## Session goal

The owner sets this once per session, right after the first `/doit`; it survives
`--resume`:

```
/goal Все пачки в .claude/artifacts/2026-10-16-handoff-build-progress.md в статусе guarded, тег phase-6 поставлен, и в чат выведено итоговое сообщение владельцу по плану. Или остановись после 400 ходов. Между фазами владельцу вопросов не задавать.
```

## Owner contact

None between phases. Questions from reports go to the progress file's «Вопросы
владельцу». The single owner message comes after `phase-6`, content per the plan's
«Итоговое сообщение владельцу».
