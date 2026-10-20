# Guard: fix-23-restart-wording (c7bd30d..bd275f3)

CRIT 1 PASS ru Menu.json:7, CombatHeader.json:16, Dialog.json:3, Dialog.json:5 («Заново» fallback), Toast.json:16, CombatScreen.json:6
CRIT 2 PASS .claude/run/fix-23-restart-wording/summary.log, e2e.log 24 passed

Findings (P3, closed):
1. Dialog.json:5 fallback «Заново»: the overflow (12 px) is in the report's Checks run.
2. UnitForm.json, PageHeader.json «Сбросить» is the filter reset, unrelated.
3. Changed PNGs judged by the visual project only.
