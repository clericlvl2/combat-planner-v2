# Guard: fix-18-dm-locale (bfe5901..d58f801)

CRIT 1 PASS apps/web/src/router.tsx:48-55, routeLocale.test.ts:119,135,146; packages/api/src/index.ts:7,15, combats.test.ts:53; hono-client.ts:359-374,383, hono-client.test.ts:338
CRIT 2 PASS .claude/run/fix-18-dm-locale/summary.log; e2e 24/24 on port 3000 (/tmp/fix18-gate.out)

Findings → fix-19-locale-edges:
1. P3 router.tsx:51 session fetch failure leaves DM route in the active language, nothing corrects it later.
2. P3 router.tsx:52-53 aborted DM navigation still switches i18n.
3. P3 hono-client.ts:359-374 a hanging repair GET blocks later repairs, also after reconnect.
4. P3 hono-client.ts:362 malformed event during an in-flight GET gets no follow-up refetch (brief-mandated; accepted only if 3 makes a follow-up cheap — see fix-19).
