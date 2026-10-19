# Report: fix-18-dm-locale (hand-back message, saved by the orchestrator)

## Commits
- 51c84cd fix(web): DM routes show the DM's language from the first frame — requireSession loader applies session.language; DmLocale removed; three router tests (from player route, sign-in, /missing) fail without the loader line.
- 9e88d54 fix(api): owner sub-apps are no longer exported without the session check — new requireUser test in combats.test.ts.
- 760b953 fix(api): a burst of malformed live events triggers one refetch — per-stream repair(); test: 4 malformed events → 1 GET.

## Checks run
pnpm check, pnpm test (2197), pnpm build, E2E_PORT=3100 pnpm e2e (24): green. check-commit red (brief untracked) — not part of the gate.

## Questions
1. A language change made on another device reaches DM routes on the next DM entry or reload. Orchestrator: accepted.
2. Loader uses session.language (same source as settings; session cache invalidated on settings update). Orchestrator: accepted.

## Left undone
none

## Processes left running
none
