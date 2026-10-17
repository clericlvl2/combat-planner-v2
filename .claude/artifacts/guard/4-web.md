# Guard 4-web

Range `c5fbf28..7d80d4c` (router, providers, player identity, drawer, smoke e2e). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/4-web/e2e.log:837-843 — gate green; smoke ran 1 test, passed, against `node apps/server/src/main.ts` with a /tmp database.
CRIT 2 PASS apps/web/src/router.test.ts:71-169 — every vision path, both guard directions, player route with token and playerId, NotFound.
CRIT 3 PASS apps/web/src/router.tsx:36-54 — no direct fetch; guards share `['session']`, no redirect loop.
CRIT 4 UNVERIFIABLE (for the guard) playwright.config.ts:8-12,29-39 — config correct (no reuse, SIGTERM, tmp DB removed). Orchestrator: `pnpm e2e` exit 0 and no listener on 3000/5173/6006/9222 after the run, recorded in `.claude/run/4-web/summary.log` (appended from the orchestrator's run output). → PASS.
CRIT 5 PASS apps/server/src/main.ts:44-46 — five subjects, paths, subpath export only, STATIC_ROOT only, .env.example moved.
CRIT 6 FAIL apps/web/src/pages.tsx:61-91 — system screens inside DM routes accept the swipe (finding 2); every other item passes.
CRIT 7 PASS apps/web/vite.config.ts:11-14 — no secret in the bundle; the player route does no DM fetch.

## Findings

1. P2 apps/web/src/pages.tsx:58-59,67-69 — `outsideModal` only refuses starts inside `[aria-modal="true"]`. Scrims (Sheet gutter, Dialog scrim) are outside it, so a swipe over an open Sheet or Dialog opens the app Drawer above the modal: two focus traps.
2. P3 pages.tsx:61-81 — CombatNotFound, CantReachServer and other system screens inside DM routes accept the swipe (brief unit 4).
3. P3 router.test.ts:166-169 — the errorElement test checks config only; `RouteError` → UnexpectedError is never rendered.
4. P3 hypothesis pages.tsx:48-56 — the browser language is never restored after `DmLocale`/PlayerView switch it; sign-out leaves `/auth/sign-in` in the DM's language.
5. P3 e2e/teardown.ts:4-5 — teardown `rm -rf`s whatever `COMBAT_PLANNER_E2E_DIR` names; `=data` deletes the dev database.
6. P3 .claude/run/4-web/summary.log — e2e exit and listener state were not on file (fixed by the orchestrator, see CRIT 4).

## Outside the reviewed scope

- package.json:13 `playwright test --pass-with-no-tests` would let a zero-test run pass the phase gate (CLAUDE.md Commands, owner).
- CLAUDE.md trailer still names Fable 5.1 (owner question already open).
