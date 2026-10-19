# Report: fix-19-locale-edges (hand-back message, saved by the orchestrator)

## Commits
- 1602c55 fix(web): DM routes reach the DM's language even when the session loads late, and an aborted DM navigation leaves the language alone
- 603034d fix(api): a stuck repair refetch no longer blocks later repairs, and an event during a repair gets one follow-up refetch

## Checks run
pnpm check, pnpm test (2203), pnpm build, E2E_PORT=3100 pnpm e2e (24): green. New tests fail on the old code except the follower-cancellation guard test.

## Questions
1. The late-session follower lives in the router loader; every non-DM loader calls leaveDm() (not-found got a loader). A future non-DM route without leaveDm() could be switched to the DM language.
2. REPAIR_TIMEOUT_MS = 5 s (same as PROBE_TIMEOUT_MS).
3. Burst: one GET plus one queued follow-up (fix-18 test adjusted).

## Left undone
none

## Processes left running
none
