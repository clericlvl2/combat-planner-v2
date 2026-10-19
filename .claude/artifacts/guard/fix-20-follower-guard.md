# Guard: fix-20-follower-guard (3a693e4..0abeca6)

CRIT 1 PASS apps/web/src/routeLocale.test.ts:220-258, apps/web/src/router.test.ts:210-215, packages/api/test/hono-client.test.ts:469-527
CRIT 2 PASS .claude/run/fix-20-follower-guard/summary.log, e2e.log 24 passed

fix-19 findings 1, 2, 4: fixed. Scope held.

Findings (all P3):
1. router.tsx:63 late session during an in-DM navigation waits for the next query-cache event (hypothesis).
2. router.tsx:113 / pages.tsx:91 after a DM render error, Back may not re-run requireSession, late session leaves browser language until reload (hypothesis).
3. routeLocale.test.ts:220-238 RouteError useEffect→onShow not proven by a render test; onReload type check dropped.
4. hono-client.ts:433-437 an in-flight probe GET can overlap the reconnect repair; no delivery, pre-existing.
