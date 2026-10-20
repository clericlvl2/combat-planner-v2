# Report: fix-23-restart-wording (saved from the hand-back message)

## Commits
bd275f3 fix(ui): the ru restart action reads «Начать бой заново»

## Checks run
pnpm install green; pnpm check green; pnpm test first run red: `div "Начать заново" [199, 512, 149, 58] overflows by 12` → Dialog restart «Заново» (brief fallback); second run green 2216; screenshots:update green 1381; visual green 1381; build green.

## Changed baselines with cause
- Dialog/RestartRu.png: title «Начать бой заново?», button «Заново».
- Menu/Ru.png: restart item «Начать бой заново»; Menu.stories.tsx:210 label updated.

## Files
ru Menu, CombatHeader, Dialog (restartTitle «Начать бой заново?», restart «Заново»), Toast «Мастер начал бой заново», CombatScreen «Отменено: бой начат заново»; Dialog.stories.tsx RestartRu play; Menu.stories.tsx.

## Questions
none

## Left undone
none

## Processes left running
none (Chrome on 9222 belongs to the orchestrator's chrome-rider check)
