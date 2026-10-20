# Brief: fix-23-restart-wording

Batch `fix-23-restart-wording`. The owner's decision: the ru restart action reads «Начать бой заново», so it does not sound like «Очистить бой».
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the result. Where `CLAUDE.md` mentions Docker screenshots, `COMBAT_PLANNER_NO_DOCKER`, check-domain-tests, handoff cells or Extra prefixes, it is outdated.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-23-restart-wording`, branch `agent/fix-23-restart-wording`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- Baselines: `pnpm screenshots:update` locally. List every changed PNG with its cause.
- Do not start Storybook or a dev server. Tool-call limit: 50.

## Unit, one commit

`fix(ui): the ru restart action reads «Начать бой заново»`

In `packages/ui/src/i18n/ru/`:
- `Menu.json` `restart`: «Начать бой заново»;
- `CombatHeader.json` `restart`: «Начать бой заново»;
- `Dialog.json` `restartTitle`: «Начать бой заново?»;
- `Dialog.json` `restart`: «Начать заново». If the geometry checks report an overflow in the 149 px button, use «Заново» instead. Never opt it out.
- `Toast.json` `dmRestarted`: «Мастер начал бой заново»;
- `CombatScreen.json` `undoRestart`: «Отменено: бой начат заново».

Update any story or e2e literal the change breaks.

## Acceptance

1. All six keys hold the values above.
2. `pnpm check`, `pnpm test`, `pnpm exec vp test --project visual` and `pnpm build` are green.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Changed baselines with cause;
- Questions;
- Left undone;
- Processes left running (`none`).
