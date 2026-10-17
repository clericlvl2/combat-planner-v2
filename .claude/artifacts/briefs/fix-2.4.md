# Brief: fix-2.4

Batch `fix-2.4`, phase 2.4 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
the UI half of the 2.4 fixes, on top of `fix-2.4-core` (domain, API contract,
`FakeApiClient`, hooks; read its report `.claude/artifacts/reports/fix-2.4-core.md`
first). Common rules: `.claude/artifacts/briefs/_phase-2-common.md` and
`.claude/artifacts/briefs/_phase-2.4-screens-common.md`. Inputs: guard files
`.claude/artifacts/guard/2.4-*.md` and `fix-2.3.md`; the progress file
`.claude/artifacts/2026-10-16-handoff-build-progress.md` sections «Вопросы
владельцу» and «Замечания guard-bee P2–P3, отложены» (entries routed to
`fix-2.4`). They carry the line anchors and failure scenarios; this brief is
the list to build.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-2.4`, branch
  `agent/fix-2.4`. Work only inside that path.
- Tool-call limit: 450. At the limit, write `REPORT.md`, stop every process,
  hand back with what is committed; list the units not done under Left undone.

## Units, in this order, one commit each

Subject `fix(ui): <Unit>` unless stated. Every behaviour fix comes with a
`play` or test that fails on the old code (named in the report with the
file:line of the fix). A changed visual gets its baseline regenerated (delete
the PNG, `--update -t <Name>`, a second run without `--update`). A unit
touches its component folder, its six i18n files, its baselines and the
extra paths it names.

1. `undo` (`feat(api): undo`), `packages/api/src/**`, `packages/api/test/**`,
   `packages/domain/src/**` and `packages/domain/test/**` if the log helper
   lives there, `packages/ui/src/api/**`, `packages/ui/src/hooks/**`,
   `packages/ui/test/**`: the DM document (or `combats.open`/`get` and the SSE
   document) carries `undo: { action: Action['type'], unitName: string | null }
   | null`, the newest undoable log entry including player actions (claim,
   release and REST writes are not undoable; depth 10). `FakeApiClient`
   mirrors it. `useCombat().dispatch` resolves `{ applied: boolean }`:
   `false` after 409 or a network failure, and the original call resolves
   `true` when its toast Retry succeeds. `useCombatLink` (from
   `screens/CombatScreen/useCombatLink.ts`) moves to `hooks/useCombatLink.ts`.
2. `MessageScreen`: `actionVariant?: 'primary' | 'secondary'`.
3. `Stepper`: − / + accessible names include the field label.
4. `Sheet`: with `motion: 'off'` no 200 ms transition; `initialFocus` prop
   (an element ref) wins over the section; with motion on, focus never rests
   on × during the enter transition (a story records every `focusin`).
5. `NoteField`: save on collapse only, not when the host removes the row.
6. `TagSheet`: the «new» badge only on a tag created in this sheet session,
   not on a reused one; the «Show N» play proves `presetCount`.
7. `CombatCard`: `duplicateDisabled`; «N weeks ago» from 14 days (CL-F1.4).
8. `PresetCard`: `duplicateDisabled`.
9. `PlayerRow`: `flash` prop (as UnitRow).
10. `UnitRow`: a play proving every callback is optional with `readOnly`.
11. `UnitForm`: `lockMaxHp` (player Edit; orchestrator decision 3a).
12. `HpHistory`: PageDown keeps one row of overlap (or native scrolling).
13. `NumpadSheet`: remove the dead `close` key; `.same.txt` and stale groups.
13a. `Toast` (molecule): the preset story uses `presetAdded`; `presetSaved`
    removed from the six `Toast.json` files; baseline regenerated.
13b. `SignUp` and the fake together: `FakeApiClient.auth.signUp` answers a
    taken e-mail with `emailTaken` (`packages/ui/src/api/FakeApiClient.ts`,
    allowed in this unit) and SignUp maps `emailTaken` to «This email already
    has an account», other `invalid` to a generic error; AP-F1.5 and
    «Sign Up Errors» stay green. Commit `fix(ui): SignUp`; the SignUp item in
    unit 15 is then done.
14. `shared` (`fix(ui): shared`): move
    `AuthScreen`, `SocialButtons`, `ScreenToast`, `submitOnEnter`, `hasCode`,
    `PageScreen`, `PageSection` into `packages/ui/src/screens/shared/`;
    imports updated in SignIn, SignUp, Settings, Account, About. Baselines
    unchanged.
15. One unit per screen, `fix(ui): <Screen>`, applying the guard items routed
    to it, the new `kind` toasts (icons from `kind`, no text matching), the
    `refetch`-based `CantReachServer` on a failed first load, an
    `ended.type === 'unauthorized'` → navigate to `/auth/sign-in`, Create and Save
    buttons disabled while in flight with one client id per opened form, and
    `duplicateDisabled` at the limit:
    - `CombatList`: CombatFormSheet with exit transition (`opened`), Retry
      navigates after create; meta «Round N · M units».
    - `Library`: tag create awaited before save, error shown; LBF43
      difference recorded or the form header kept visible.
    - `SystemScreens` is not a folder: the units `NotFound`, `CombatNotFound`,
      `UnexpectedError` get `actionVariant="primary"`; every system screen's
      `Default` story stops clicking (click moves to an Extra story).
    - `SignIn`: deleted-account toast once, not from a stale `history.state`;
      «no social» checks wait for the providers response; social sign-in
      error visible, double tap blocked; `callbackUrl` = `${origin}/combats`.
    - `SignUp`: `emailTaken` maps to «This email already has an account»;
      other `invalid` shows a generic error.
    - `Settings`: the checked language comes from `useSettings().settings`.
    - `Account`: «Signed in with …» from `Session.method`; name saved once
      (no Enter + blur double), empty-name error on blur.
    - `About`: `About.version` translated (removed from `allow-same.txt`)
      unless de/fr keep «Version» with a line naming the owner question.
    - `PlayerView`, `Heroes`, `TurnOrder`: Heroes opens after the player's
      own release of the last hero; row flash on the returned document via
      `PlayerRow` `flash`; failed `releaseUnit` not kept in `ownReleases`;
      Join moves on only after the claims succeed, claims sequential on the
      returned version; a returning player's rename sent on Done; toast offset
      from the measured BottomBar height; `send` typed `Action`; player Edit
      with `lockMaxHp`; popover shows the real `initiativeBonus`; the
      CantReachServer baseline shows the error screen.
    - `CombatScreen`: Undo from the document's `undo` (session stack removed);
      flash, the «<name> removed» toast and the «Undid: …» toast only on
      `applied`, with a story where the document arrives after the POST
      (FakeApiClient option to delay the broadcast); rapid stepper and
      condition taps build each action on the newest known version (the
      version from the previous action's response) so a double tap does not
      409; Save as preset failure shows a toast (`limit` and others); Share
      with a failed `link.get` shows the error toast; `ExtraHpRules` asserts
      `calls` and covers «damage never below −max» and «a lower HP stays on
      Set Max»; `useCombatLink` from `hooks/`. Render check
      (`.claude/artifacts/guard/2.4-CombatScreen.md`, «Render check»): steps
      CS-F3.5, F3.6, F3.8 focus the step's action so After previews it; Copy
      closes the Share sheet and the «Link copied» toast is visible (CS-F7.4);
      scenarios seed the Orc's 6-entry and Vashti's 3-entry HP history; the
      Orc row collapses after Disable (CS-F6.7); CS-F8.1 has an active unit
      so the next is Brother Tomas; every other DIFF of that list is added to
      the report's Differences (hint line, dice icons, popover push, CS-F6.2
      Orc, centred dialogs, rows behind dialogs, no menu scrim, flash border
      from the setup, Restart clears initiative, scrollbar, sample URL).
16. `exports` (`feat(ui): exports`): `packages/ui/src/index.ts` exports every
    atom, molecule, organism, screen, `UiProvider`, `ApiProvider`, `useApi`,
    `FakeApiClient`, `scenarios`, every hook, `theme` tokens and
    `combatColors`; a unit test imports each name from `index.ts`.

## Allowed paths

Per unit as above; `packages/ui/src/i18n/<lng>/*.json` of the namespaces a
unit touches; `packages/ui/src/i18n/allow-same.txt` (append or remove a line
the unit names); `packages/ui/__screenshots__/<Name>/**` with a source change
in the same commit. No `vite.config.ts`, no scripts, no `apps/**`.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build`,
   `pnpm storybook:build` exit 0; `pnpm exec vp test --project visual` passes
   without `--update`.
2. Every item above is closed with file and line in `REPORT.md`; each
   behaviour item has a play or test that fails on the old code.
3. Undo on the combat screen survives a reload and reflects a player's action;
   a 409 never flashes a row or enables Undo.
4. Six i18n files per touched namespace with identical keys; `check-i18n`
   passes.
5. One commit per unit with the subjects above, inside its paths; no
   comments; trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
