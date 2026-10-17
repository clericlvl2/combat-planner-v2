# Guard fix-2.4-core

Range `5c9f0c8..c197f3f` (9140110 project, 77f06c2 api contract, 6668592 FakeApiClient, c197f3f hooks). guard-bee, Opus 5.5 xhigh, read-only.

CRIT 1 PASS .claude/run/fix-2.4-core/summary.log — check, test 1887, build, storybook-build, visual 1306 without `--update`.
CRIT 2 PASS .claude/artifacts/reports/fix-2.4-core.md:9 — anchors match HEAD (project.ts:39, authorize.ts:49, reduce.ts:147, client.ts:52/75/78/154/192, hono-client.ts:55/290/296, mutations.ts:23, connection.ts:62, settings.ts:34); `presetSaved` and the fake's `emailTaken` deferred to fix-2.4 (accepted).
CRIT 3 PASS packages/domain/src/project.ts:35-43, schemas.ts:155; tests project.test.ts:189-196, :214, :362-373, :390-399; maxHp rejection authorize.ts:49-51, test authorize.test.ts:260-268.
CRIT 4 PASS packages/api/src/hono-client.ts:288-348 — 401 → `unauthorized` (:290), reopen backoff 1, 2, 4, 8, 15 s (:296-307), reset on open (:339-348); tests hono-client.test.ts:405, :420 inside `describe.each(['dm','player'])` (:348).
CRIT 5 PASS four commits inside their paths, no comments, Fable 5.1 trailer; domain index.ts:131, :138-145 export accepted.

Re-walk: every player path goes through `project` (play/routes.ts:70, live/sse.ts:72, live/registry.ts:40, fake); enemies get the eight shared columns; own hero adds initiativeBonus, note, hpHistory; disabled units omitted. maxHp: `setMaxHp`/`undo` not player actions (authorize.ts:5-16). SSE reopen always through backoff; `close()` clears timers and the source. `clear()` in signIn, signUp, signOut, remove (account.ts:29-58). Retry/dismiss settles via the toast stack.

## Findings

1. P3 hono-client.test.ts:420: no test unsubscribes while the reopen timer or probe is pending.
2. P3 hono-client.test.ts:422: REST 200 with the stream refused (hono-client.ts:313-316) untested.
3. P3 hypothesis hono-client.ts:309: a probe fetch that never settles blocks reopening (no timeout).
4. P3 hypothesis combat.ts:104 with PlayerView.tsx:84-90: a 404 refetch before the `deleted` end shows UnexpectedError instead of CombatDeleted.
5. P3 hypothesis mutations.ts:44 with toasts.ts:128-136: the toast store survives `clear()`; an old Retry from DM A can resend under DM B's session.
6. P3 9140110, 77f06c2 red alone (play.test.ts; ui type check) — disclosed.
7. P3 report :85: agent ran read-only `git worktree list`.

5 pass / 0 fail / 0 unverifiable; scope held apart from the accepted export.
