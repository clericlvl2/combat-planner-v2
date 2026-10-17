# Brief: fix-5-e2e

Batch `fix-5-e2e`, phase 5 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
It hardens the e2e specs against the races and weak assertions in
`.claude/artifacts/guard/5-e2e.md`, findings 1–8. That file carries the anchors
and the failure scenarios. Rules: `CLAUDE.md` (all sections).

`fix-5` runs at the same time and edits `e2e/auth.spec.ts` and
`packages/**`. This batch never touches them.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-5-e2e`, branch
  `agent/fix-5-e2e`. Work only inside that path.
- Tool-call limit: 200. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed.
- Port 3000 is shared with other runs. Before `pnpm e2e`, wait until
  `ss -ltn` shows 3000 free. Never kill a process you did not start.

## Units, in this order, one commit each

Subject `test(e2e): <unit>`. Wait on visible state, never on time: use
`expect(...).toHave*`, `expect.poll`, or a response wait for the request the
step depends on.

1. `combat lifecycle`, `e2e/combat-lifecycle.spec.ts`: wait for the started
   document (`Edit round, round 1`) before reading the order for Undo
   (finding 1).
2. `player`, `e2e/player.spec.ts`:
   - the DM side first shows Pat's claim, then shows it gone after the reissue
     (finding 4);
   - «You» is asserted only where Start changes it (finding 5);
   - the order check covers a run where the roll matches insertion order:
     assert the order the initiative values imply, not just DM equals player
     (finding 6);
   - drop the URL equality that cannot see a reload, and use a marker set on
     `window` before the damage that is still there after it (finding 7).
3. `library`, `e2e/library.spec.ts`: the sort reads at :62 and :74 retry
   (`expect.poll` or `toHaveText([...])`) (finding 8).
4. `account`, `e2e/account.spec.ts`:
   - before each reload, wait for the settings PUT and the account PATCH
     responses (findings 2 and 3);
   - after the reload, assert the saved name from the server, not the draft.

## Allowed paths

`e2e/combat-lifecycle.spec.ts`, `e2e/player.spec.ts`, `e2e/library.spec.ts`,
`e2e/account.spec.ts`, `e2e/helpers.ts`. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm e2e`.

## Acceptance criteria

1. `pnpm e2e` exits 0. `pnpm exec playwright test e2e/combat-lifecycle.spec.ts
   e2e/player.spec.ts e2e/library.spec.ts e2e/account.spec.ts --repeat-each 5`
   passes 100 %; the report shows the counts.
2. Findings 1–8 are closed with file:line. No `waitForTimeout`, no retries, no
   `test.fail()` added.
3. No listener on 3000 after the hand-back.
4. Four commits with the subjects above, inside their paths; no comments;
   trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`. If `REPORT.md` cannot be written, return
its full text as the final message. Otherwise the hand-back message is the
path only.
