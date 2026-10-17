# Guard fix-4-web

Range `e84687d..4d4efaa` (MessageScreen, swipe, router test, locale, teardown). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/fix-4-web/summary.log:2-32 — gate green, visual 1366 without `--update`, `pnpm e2e` 21 passed; the only ✘ is the `test.fail()` from 5-e2e.
CRIT 2 PASS swipeGuard.ts:1-6, pages.tsx:66-69, MessageScreen.tsx:29-33, router.test.ts:197-211, routeLocale.ts:23-38, main.tsx:27,40, playwright.config.ts:8-18, teardown.ts:7-13. Finding 5 has no automated test (waived by the orchestrator).
- After closing, a Sheet leaves only its hidden root, with no `aria-modal` and no `data-scrim`. Dialog and Drawer return null. So the swipe works on a plain DM page.
- The locale is restored only off the `dm` and `play` routes, with no loop.
- The teardown marker cannot be set from outside; the default run still removes its directory.
CRIT 3 PASS summary.log:31-32 — no listeners.
CRIT 4 PASS — five subjects, in their paths, no comments, trailer, no baselines changed.

## Findings

1. P3 pages.tsx:68, main.tsx:40 — the wiring is untested: reverting the `canStart` wiring or dropping `<RouteLocale>` keeps every test green.
2. P3 hypothesis pages.tsx:50-54 with routeLocale.ts:32-33 — a one-frame flash of the browser language when returning to a DM route. Fix: `useLayoutEffect` in DmLocale.
3. P3 teardown.ts:3, playwright.config.ts:8 — the marker key is duplicated, so a drift leaks tmp directories.
4. P3 — the gate ran on an earlier base. The interim master commits touch only `.claude/artifacts/**`, so the gated code equals the merged code.
5. P3 — `/tmp/fix4-passed-IK9p` is left over from the manual check, for the owner to remove.

4 pass / 0 fail / 0 unverifiable; scope held.
