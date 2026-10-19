# Guard: fix-14-open-defects (5e90c3a..f0143c1)

CRIT 1 FAIL apps/web/src/routeLocale.test.ts:84 — items 1–5, 7–9 PASS; item 6 test never mounts DmLocale; DmLocale applies the language in useEffect (after paint)
CRIT 2 FAIL (orchestrator's saved report summarised the routed list) — fixed: the report now carries the per-finding list from the hand-back
CRIT 3 PASS .claude/run/fix-14-open-defects/summary.log; e2e 24 passed

Findings:
1. P2 DmLocale language after paint, item 6 untested → fix-18-dm-locale.
2. P2 routed list missing in saved report → fixed by the orchestrator.
3. P3 packages/api/src/index.ts:7,16-18 exports owner sub-apps without requireUser → fix-18-dm-locale.
4. P3 hono-client.ts:366 refetch per malformed event, no dedupe → fix-18-dm-locale.
