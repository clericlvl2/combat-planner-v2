# Brief: fix-4

Batch `fix-4`, phase 4 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
It closes the guard findings routed to `fix-4`. Rules: `CLAUDE.md` (all sections).
Inputs:
- guard files `.claude/artifacts/guard/fix-2.4-core.md` and `fix-2.4.md`;
- reports `.claude/artifacts/reports/fix-2.4-core.md` and `fix-2.4.md`;
- the progress file `.claude/artifacts/2026-10-16-handoff-build-progress.md`,
  section «Замечания guard-bee P2–P3, отложены», entries marked `→ fix-4`;
- `docs/vision.md` Claims (a re-claim of an own hero renames), Action log, Undo,
  Connection.

The guard files carry the line anchors and the failure scenarios; this brief is
the list to build. `4-web` runs at the same time in `apps/**`. This batch never
touches `apps/**`, `packages/api/package.json` or `packages/ui/src/index.ts`.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-4`, branch
  `agent/fix-4`. Work only inside that path.
- Tool-call limit: 350. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed. List the units not done under Left
  undone.

## Units, in this order, one commit each

Every behaviour fix comes with a test or `play` that fails on the old code. Name
it in the report with the file:line of the fix. A changed visual gets its
baseline regenerated: delete the PNG, run `--update -t <Name>`, then run once
more without `--update`.

1. `claim` (`fix(domain): claim`), `packages/domain/src/**`,
   `packages/domain/test/**`: `authorize` accepts a `claimUnit` of a hero the
   same player already holds; `reduce` then updates `players[playerId]` and
   keeps the claim. The test names follow vision rows
   (`check-domain-tests.mjs`).
2. `undo summary` (`fix(api): undo summary`), `packages/api/src/**`,
   `packages/api/test/**`: `dmDocument` (`combats/log.ts:78-81`) no longer
   loads the whole log on every action, GET, open, PATCH, reissue and SSE
   connect. It reads newest-first and stops once the summary is known (the
   newest undoable entry not undone, or the first entry without a patch). A
   player SSE connect reads no log. A test seeds a long log and asserts the
   result and the bounded read.
3. `event stream` (`fix(api): event stream`), `packages/api/src/hono-client.ts`,
   `packages/api/test/**`:
   - the probe fetch after a non-200 stream has a timeout, and a timed-out probe
     counts as a failed reopen;
   - tests: unsubscribing while the reopen timer or the probe is pending leaves
     no timer, source or fetch; REST answers 200 while the stream is refused
     (`hono-client.ts:313-316`).
4. `hooks` (`fix(ui): hooks`), `packages/ui/src/hooks/**`,
   `packages/ui/src/api/**`, `packages/ui/test/**`:
   - the toast store is cleared with `queryClient.clear()` (sign-in, sign-up,
     sign-out, account removal). A Retry from the previous session never runs
     under the next one;
   - `useCombatLink`: a Share tap after a failed `link.get` refetches. The
     stale error never closes the sheet while that refetch runs.
5. `UnitRow` (`fix(ui): UnitRow`): `duplicateDisabled` prop for the menu's
   Duplicate, as on `CombatCard` and `PresetCard`.
6. `CombatScreen` (`fix(ui): CombatScreen`):
   - a failed action never holds the action queue. Later taps run at once on
     the newest known version, while the failure toast and its Retry stay. A
     Retry that has gone stale answers like any other 409;
   - Undo from the «<name> removed» toast acts on the removal's own summary
     (from its dispatch result or the returned document), never on the
     pre-removal `latest()?.undo`;
   - Duplicate disabled at `LIMITS.unitsPerCombat` through `UnitRow`
     `duplicateDisabled`;
   - stories: a tap while a failure toast is up, and a double Next turn after a
     failure that skips no turn.
7. `Heroes` (`fix(ui): Heroes`): a returning player's rename sends one
   `claimUnit` of an own hero (unit 1); the release + claim pair is removed.
   The play asserts exactly one call, of type `claimUnit`. Like every claim, it is logged
   without a patch (vision Action log 9–10).
8. `PlayerView` (`fix(ui): PlayerView`): a 404 refetch before the `deleted`
   end shows CombatDeleted, not UnexpectedError.
9. `Library` (`fix(ui): Library`): a tag create that fails with any error is
   dropped from `tagCreates`. Save then shows the error toast and never stays
   stuck.
10. `Account` (`fix(ui): Account`): `blurred` resets when the name is edited
    again. The empty-name error shows only after a blur of the current edit.

## Allowed paths

Per unit as above, plus:
- the component folder of a UI unit;
- its six i18n files;
- its baselines in `packages/ui/__screenshots__/<Name>/**`;
- `packages/ui/src/i18n/allow-same.txt`: append only.

`pnpm-lock.yaml` may change only for a dependency already listed in `CLAUDE.md`
Dependencies. Not allowed: `apps/**`, `packages/api/package.json`,
`packages/ui/src/index.ts`, `vite.config.ts`, scripts.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. These exit 0:
   - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
   - `pnpm test`;
   - `pnpm build`;
   - `pnpm storybook:build`;
   - `pnpm exec vp test --project visual` without `--update`.
2. Every item above is closed in `REPORT.md` with file and line, and each
   behaviour item has a test or play that fails on the old code.
3. A rename is one `claimUnit`, with no `releaseUnit`. No failure toast delays a
   later DM action. A Retry never crosses sessions.
4. `dmDocument` does a bounded read, and a player SSE connect reads no log.
5. Ten commits with the subjects above, each inside its paths; no comments;
   trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
