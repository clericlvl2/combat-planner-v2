# Guard fix-5-e2e

Range `45b3029..319db19` (combat lifecycle, player, library, account). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/fix-5-e2e/summary.log:29-30, e2e.log:865 — `pnpm e2e` exit 0, 21 passed, with the gate's own server on port 3000. The `--repeat-each 5` 70/70 is the agent's claim, run on the pre-fix-4-web base e84687d.
CRIT 2 PASS — findings 1–8 closed:
- combat-lifecycle.spec.ts:109-111;
- account.spec.ts:19, 25-27, 46, 50-51, 54-57;
- player.spec.ts:45-46, 59-68, 85, 97, 104, 120;
- helpers.ts:106-115;
- library.spec.ts:62, 67, 74, 78.

No `waitForTimeout`, retries, `.only`/`.skip` or new `test.fail()`. Settings and account use PATCH (hono-client.ts:517, :520), so the brief's PUT was wrong.
CRIT 3 PASS summary.log:31-32 — no listeners.
CRIT 4 PASS — four subjects, five allowed files, no comments, trailer. `auth.spec.ts` stays compatible: only `rowInitiatives` was added.

## Findings

1. P2 hypothesis playwright.config.ts:5, :37-38 — a fixed port 3000 with `reuseExistingServer: false`. Parallel e2e runs from different worktrees can test against each other's server, which explains the agent's `ERR_CONNECTION_REFUSED`. The orchestrator's own runs wait for a free port.
2. P3 — the 70/70 repeat ran before fix-4-web; the merged tree's evidence is one 21/21 run.
3. P3 hypothesis smoke.spec.ts:30 — `getByText('Round 2')` also matches «Aria · round 2». Use the `Edit round, round 2` button.
4. P3 player.spec.ts:120 — `toHaveCount(0)` for Pat also passes if Aria's row is missing.
5. P3 hypothesis combat-lifecycle.spec.ts:151 — a fixed 3 s click budget on a loaded machine.
6. P3 — the report lists pre-rebase hashes and cites `auth.spec.ts:10` for the call at :13.
7. P3 — fix-5 must include unit 11, or its e2e fails with «expected to fail, but passed».

4 pass / 0 fail; scope held.
