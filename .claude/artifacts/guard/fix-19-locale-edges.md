# Guard: fix-19-locale-edges (cf3427c..603034d)

CRIT 1 PASS apps/web/src/routeLocale.test.ts:178-205, packages/api/test/hono-client.test.ts:338-449
CRIT 2 PASS .claude/run/fix-19-locale-edges/summary.log, e2e.log 24 passed

Findings:
1. P2 router.tsx:60-68 follower applies the DM language to the root error page after a late session → fix-20-follower-guard.
2. P3 router.tsx:55-58 leaveDm() convention unenforced → fix-20 (state check makes it a second line).
3. P3 router.tsx:86 interrupted navigation away from DM drops the follower — degrades to browser language; accepted.
4. P3 hono-client.ts:437 reconnect refetch untracked by repair state, can overlap a repair GET → fix-20.
