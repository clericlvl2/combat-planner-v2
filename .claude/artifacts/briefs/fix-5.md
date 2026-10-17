# Brief: fix-5

Batch `fix-5`, phase 5 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
It fixes the defect `5-e2e` found and the findings routed from the guards.
Rules: `CLAUDE.md` (all sections).

Inputs:
- the report `.claude/artifacts/reports/5-e2e.md`, Questions 1 and 3;
- the guard file `.claude/artifacts/guard/fix-4.md`, findings 1–6 and 9;
- the progress file `.claude/artifacts/2026-10-16-handoff-build-progress.md`,
  entries routed to `fix-5`;
- `docs/vision.md`: Undo, Account, Toasts, Player view.

The guard file carries the line anchors and the failure scenarios.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-5`, branch
  `agent/fix-5`. Work only inside that path.
- Tool-call limit: 350. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed. List the units not done under Left
  undone.

## Units, in this order, one commit each

Every behaviour fix comes with a test, play or e2e that fails on the old code,
named in the report with the file:line of the fix. A changed visual gets its
baseline regenerated: delete the PNG, run `--update -t <Name>`, then run once
more without `--update`.

1. `sign-out` (`fix(api): sign-out`), `packages/api/src/hono-client.ts`,
   `packages/api/test/**`: sign-out sends a JSON body with `Content-Type:
   application/json`, which Better Auth requires (today it answers 415).
   Check every other Better Auth call in the client the same way. The test
   runs against the real Hono app, as the existing client tests do.
2. `event stream` (`fix(api): event stream`), `packages/api/src/live/**`,
   `packages/api/test/**`: `streamCombatEvents` types `load` per viewer, so a
   `DmCombat` cannot reach a player stream. A `@ts-expect-error` test proves it.
3. `undo window` (`test(api): undo window`), `packages/api/test/**`: a
   `log.test.ts` case reaches the third page (for example A1..A10, ten undos,
   B1, B2, undo B2, undo B1), and `ROW_BOUND` matches the code's worst case.
4. `hooks` (`fix(ui): hooks`), `packages/ui/src/hooks/**`,
   `packages/ui/test/**`: `createDispatcher` checks the session `generation`
   as `mutations.ts:51` does. A dispatch that fails after a session change
   shows no Retry.
5. `UiProvider` (`fix(ui): UiProvider`), `packages/ui/src/provider.tsx`,
   `packages/ui/test/**`: `<html lang>` follows the interface language
   (orchestrator decision; screen readers and the ja font fallback).
6. `Toast` (`fix(ui): Toast`), `packages/ui/src/molecules/Toast/**`: a toast
   action runs once, also on a second tap during the exit animation.
7. `Account` (`fix(ui): Account`): a failed sign-out shows the error toast
   instead of silence.
8. `Library` (`fix(ui): Library`): `failedTags` drops a tag once `useTags`
   lists it.
9. `PlayerView` (`fix(ui): PlayerView`), plus `packages/ui/src/screens/CombatDeleted/**`
   if needed: a 404 on the first load shows CombatDeleted without a title, not
   UnexpectedError.
10. `CombatScreen` (`fix(ui): CombatScreen`): Undo on the «<name> removed»
    toast undoes the removal or nothing.
    - Send the undo at the removal's result version, so the server answers
      409 when anything newer has landed. On 409, show «The combat changed.
      Try again.» and leave the document as it is.
    - Play: Next turn after a removal, then the toast's Undo. The removal
      stays, Next turn stays, and the toast never says «Undid: … removed».
11. `auth` (`test(e2e): auth`), `e2e/auth.spec.ts`: remove the `test.fail()`
    and the defect suffix from the sign-out test. The wrong-password test
    signs out through the UI.

## Allowed paths

Per unit as above; for a UI unit, its folder, its six i18n files and its
baselines. Not allowed: `apps/**` (`fix-4-web` runs there at the same time),
`packages/ui/src/index.ts`, `vite.config.ts`, scripts, and every `e2e/` file
except `e2e/auth.spec.ts`.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`; for units 1 and 11 also
`pnpm build && pnpm e2e`.

## Acceptance criteria

1. These exit 0, with no `test.fail()` left in `e2e/`:
   - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
   - `pnpm test`;
   - `pnpm build`;
   - `pnpm storybook:build`;
   - `pnpm exec vp test --project visual` without `--update`;
   - `pnpm e2e`.
2. Every item is closed with file and line, and each has a test that fails on
   the old code.
3. Sign-out ends the session in the built app (e2e). A removal toast's Undo
   never undoes another action.
4. No listener on 3000 or 5173 after the hand-back.
5. Eleven commits with the subjects above, each inside its paths; no comments;
   trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`. If `REPORT.md` cannot be written, return
its full text as the final message. Otherwise the hand-back message is the
path only.
