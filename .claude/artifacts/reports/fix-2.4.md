# REPORT fix-2.4

## Commits

| Hash | Subject |
|------|---------|
| 4a31fff | feat(api): undo |
| ea78a72 | fix(ui): MessageScreen |
| 44fd284 | fix(ui): Stepper |
| dc9045e | fix(ui): Sheet |
| 5833d7c | fix(ui): NoteField |
| a9ed28d | fix(ui): TagSheet |
| d1572a0 | fix(ui): CombatCard |
| aa7e4de | fix(ui): PresetCard |
| cb16a2d | fix(ui): PlayerRow |
| ed4bf2e | fix(ui): UnitRow |
| c35b92f | fix(ui): UnitForm |
| 05c691d | fix(ui): HpHistory |
| 6adbf52 | fix(ui): NumpadSheet |
| 1a91d22 | fix(ui): Toast |
| 1e532cc | fix(ui): SignUp |
| 2ff2590 | fix(ui): shared |
| 647346a | fix(ui): CombatFormSheet |
| c0d13c9 | fix(ui): CombatList |
| 9ca67c5 | fix(ui): PresetFormSheet |
| dcf0ed2 | fix(ui): Library |
| 5093b95 | fix(ui): NotFound |
| 3953705 | fix(ui): CombatNotFound |
| 283d478 | fix(ui): UnexpectedError |
| 0f62864 | fix(ui): CantReachServer |
| ece82b4 | fix(ui): SignIn |
| 4adbc8c | fix(ui): Settings |
| f9035ae | fix(ui): Account |
| c01273f | fix(ui): About |
| c3f8811 | fix(ui): AppPages |
| cc6e576 | fix(ui): Heroes |
| 57e18d1 | fix(ui): TurnOrder |
| ebccc58 | fix(ui): PlayerView |
| 39bb824 | fix(ui): CombatScreen |
| dfdefba | feat(ui): exports |

Closed items, fix and the play/test that fails on the old code:

1. undo: `undoSummary` packages/domain/src/undo.ts:85 (tests packages/domain/test/undo.test.ts, describe `undoSummary`); `dmCombatSchema` packages/api/src/client.ts:90; `dmDocument` packages/api/src/combats/log.ts:78, carried by get/open/patch/reissue/events/SSE; test packages/api/test/actions.test.ts:294. `DispatchResult` packages/ui/src/hooks/combat.ts:22, resolved at :160, Retry resolves the original call; test packages/ui/test/hooks/useCombat.test.ts:177. `FakeApiClient.deferBroadcasts` packages/ui/src/api/FakeApiClient.ts:184. `useCombatLink` moved to packages/ui/src/hooks/useCombatLink.ts:16.
2. MessageScreen `actionVariant` packages/ui/src/organisms/MessageScreen/MessageScreen.tsx:14; story ExtraPrimaryAction MessageScreen.stories.tsx:196.
3. Stepper labelled −/+ packages/ui/src/molecules/Stepper/Stepper.tsx:109 (keys `decreaseField`/`increaseField`); Stepper.stories.tsx:76.
4. Sheet: motion off has no transition Sheet.tsx:64; `initialFocus` Sheet.tsx:19; stories ExtraMotionOnNoCloseFocus Sheet.stories.tsx:526 (records every `focusin`), ExtraInitialFocus :543, ExtraMotionOffNoTransition :559.
5. NoteField: no save on host removal; story ExtraHostRemovalDoesNotSave packages/ui/src/molecules/NoteField/NoteField.stories.tsx:257.
6. TagSheet: «new» badge only when `onCreate` did not return `false` TagSheet.tsx:22; story ExtraReusedTagNotNew TagSheet.stories.tsx:187; the «Show 7» play proves `presetCount`.
7. CombatCard `duplicateDisabled` CombatCard.tsx:30, «N weeks ago» from 14 days CombatCard.tsx:82; stories ExtraWeeksAgo CombatCard.stories.tsx:350, ExtraDuplicateDisabled :366.
8. PresetCard `duplicateDisabled` PresetCard.tsx:26; story PresetCard.stories.tsx:347.
9. PlayerRow `flash` PlayerRow.tsx:29; story ExtraFlash PlayerRow.stories.tsx:683.
10. UnitRow: ExtraReadOnlyEveryTapWithoutCallbacks UnitRow.stories.tsx:709 (test-only: it also passes on b59bc66, the callbacks were already optional).
11. UnitForm `lockMaxHp` UnitForm.tsx:35; story ExtraLockMaxHp UnitForm.stories.tsx:446.
12. HpHistory PageDown keeps one row of overlap HpHistory.tsx:44; story ExtraSheetEscapeMotionOn HpHistory.stories.tsx:512 asserts the exact scrollTop.
13. NumpadSheet: dead `close` key removed from six NumpadSheet.json; `.same.txt` groups checked, none stale.
13a. Toast: story uses `presetAdded` Toast.stories.tsx:57; `presetSaved` removed from six Toast.json; baselines Preset and LongUnitName regenerated.
13b. SignUp: fake answers `emailTaken` packages/ui/src/api/FakeApiClient.ts:86; SignUp maps it SignUp.tsx:45, other `invalid` shows `failed`; story ExtraInvalidIsNotTaken SignUp.stories.tsx:99.
14. shared: AuthScreen, SocialButtons, ScreenToast, submitOnEnter, hasCode, PageScreen, PageSection in packages/ui/src/screens/shared/.
15. Screens:
   - CombatFormSheet `pending` CombatFormSheet.tsx:34.
   - CombatList: kind icons through packages/ui/src/screens/shared/toastLook.ts:12 (CombatList.tsx:31); CantReachServer via `refetch` CombatList.tsx:196; unauthorized → `/auth/sign-in` :129; one form id per opening, exit transition `formOpen` :122; `round` meta :229; `duplicateDisabled` :234. Stories ExtraFirstLoadFails CombatList.stories.tsx:506, ExtraSignedOut :523, ExtraCreateRetry :536, ExtraDuplicateAtLimit :556, ExtraKindIcons :571.
   - PresetFormSheet `pending` PresetFormSheet.tsx:57; stories ExtraReusedTagNotNew PresetFormSheet.stories.tsx:216, ExtraPending :236.
   - Library: tag creates awaited before save Library.tsx:140, error toast `tagFailed` :185, CantReachServer via `refetchQueries` :236, unauthorized :144, `duplicateDisabled` :281. Stories ExtraFirstLoadFails Library.stories.tsx:670, ExtraSignedOut :685, ExtraCreateRetry :698, ExtraTagCreateAwaited :730, ExtraTagRetryThenSave :743, ExtraDuplicateAtLimit :759. LBF43: the form header stays visible.
   - NotFound NotFound.tsx:17, CombatNotFound CombatNotFound.tsx:17, UnexpectedError UnexpectedError.tsx:17: `actionVariant="primary"`. Default stories no longer click; the click is in ExtraTapAction (NotFound.stories.tsx:63, CombatNotFound.stories.tsx:61, UnexpectedError.stories.tsx:65, CantReachServer.stories.tsx:55).
   - SignIn: the deleted-account toast comes from the toast store, not `history.state` (Account no longer passes state, Account.tsx:52); stories AccountDeleted SignIn.stories.tsx:177, ExtraStaleDeletedState :200. «No social» waits for the providers query, SignIn.stories.tsx:81 and AppPages.stories.tsx:206. Social error visible SocialButtons.tsx:70, double tap blocked :36, `callbackUrl` = `${origin}/combats` :16; stories Social SignIn.stories.tsx:149, ExtraSocialFails :214. ScreenToast icons from `kind` ScreenToast.tsx:3.
   - Settings: the checked radio comes from `useSettings().settings` Settings.tsx:36; story ExtraCheckedFromSettings Settings.stories.tsx:107.
   - Account: «Signed in with …» from `Session.method` Account.tsx:71 (keys `method_email|google|github`); name saved once, in-flight guard :36; empty-name error only after blur :26. Stories ExtraSignedInWithGitHub Account.stories.tsx:154, ExtraEnterThenBlurSavesOnce :174, ExtraEmptyNameWhileTyping :199, AccountDeleted :95.
   - About: `About.version` translated (de/About.json:3 «Versionsnummer», fr/About.json:3 «Numéro de version»), removed from allow-same.txt; check-i18n fails on the old files; German story asserts it About.stories.tsx:55.
   - AppPages: APF17 waits for the providers query AppPages.stories.tsx:206; APF16 and APF35 baselines regenerated.
   - Heroes: Join claims in sequence on the returned version and moves on only after every claim applies Heroes.tsx:107, :153; returning player's rename sent on Done as release + claim of an own hero :127; toast anchored 12 px above the BottomBar whatever its height :28. Stories ExtraJoinFails Heroes.stories.tsx:151, ExtraJoinClaimsOnReturnedVersion :169, ExtraReturningRename :195, TakenWhileOpen :104 (asserts the 12 px gap).
   - TurnOrder: `send` typed `Action` TurnOrder.tsx:80; row flash only on an applied result :94 through PlayerRow `flash` :149; popover shows the real `initiativeBonus` :175; Edit with `lockMaxHp` :244. Stories ExtraFailedDamageNoFlash TurnOrder.stories.tsx:182, ExtraInitiativeBonus :202, EditOwnHero :150.
   - PlayerView: Heroes opens after the player's own release of the last hero PlayerView.tsx:55; a failed `releaseUnit` is dropped from `ownReleases` :73; CantReachServer retry via `refetch` :80; player toasts icons from `kind` PlayerToast.tsx:47. Stories ExtraOwnRelease PlayerView.stories.tsx:374, ExtraFailedReleaseThenDmRelease :393, ExtraDmRemoved :360 (icon), ExtraCantReachServer :453 (baseline shows the error screen), ExtraCantReachServerRetry :463.
   - CombatScreen: Undo from `combat.undo` CombatScreen.tsx:420 and :200, session stack removed; flash, «removed» and «Undid» only on `applied` (`sendNow` :164, flash :272); actions queued :174 and built on the newest known version :167; Save as preset failure toast :297 (`limit` through the mutation toast); Share with a failed `link.get` closes and shows `linkFailed` :148, :156; Copy closes Share :340; Disable collapses the row :479; unauthorized → sign-in :151; kind icons :515; CantReachServer via `refetch` :214. Scenarios: Orc 6 entries CombatScreen.scenarios.ts:77, Vashti 3 entries :94, CS-F8.1 active unit before Brother Tomas :336. Stories CSF35 :416, CSF36 :428, CSF38 :450 focus the step's action; CSF67 :683; CSF74 :741; CSF81 :818; ExtraHpRules :895 (asserts calls, damage never below −max, lower HP stays on Set Max); ExtraUndoFromDocument :1049; ExtraDocumentAfterPost :1075 (uses `deferBroadcasts`); ExtraRapidTaps :1097; ExtraSavePresetFails :1118; ExtraSavePresetLimit :1130; ExtraShareLinkFails :1140; ExtraSignedOut :1153. All in CombatScreen.stories.tsx.
16. exports: packages/ui/src/index.ts (components from :26, `FakeApiClient` :96); test packages/ui/test/index.test.ts:1 imports each name.

Proofs that pass on the old code (test-only): UnitRow item 10; ExtraHpRules; ExtraSavePresetLimit; ExtraCantReachServerRetry; APF17; TurnOrder `send` typing (type-level).

## Checks run

- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`: green.
- `pnpm test`: green, 2049 tests.
- `pnpm build`: green.
- `pnpm storybook:build`: green.
- `pnpm exec vp test --project visual` without `--update`: green, 1357 tests.
- `node scripts/test/run.mjs`: green.
- `bash scripts/check-commit.sh master..HEAD`: red, 15 problems, every one a cross-folder change:
  - 44fd284 Stepper: also UnitForm.stories.tsx (UnitForm queries the new labelled names).
  - dc9045e Sheet: baselines in CombatList, CombatScreen, ConditionPicker, HpHistory, NumpadSheet, PresetFormSheet, ShareSheet and TagSheet. The Sheet change shifted these.
  - 5833d7c NoteField: PlayerRow story and the ExtraHostCollapseSavesNote baseline. PlayerRow source did not change, so they stay with NoteField.
  - 2ff2590 shared: 5 folders. The brief asked for this move.
  - 283d478 UnexpectedError: AppPages APF51–53 baselines.
  - ece82b4 SignIn: SignUp/Social baseline. This is the shared SocialButtons disabled state.
  - f9035ae Account: AppPages APF31/33/34 baselines (the «Signed in with email» line).
  - ebccc58 PlayerView: Heroes/TakenWhileOpen baseline. PlayerToast icons now come from `kind`.

## Questions

1. The domain has no rename action, and `claimUnit` of an own hero is forbidden (packages/domain/src/authorize.ts:35). So a returning player's rename is sent as `releaseUnit` + `claimUnit` of one own hero. An owner decision could allow re-claiming an own hero as a rename.
2. `UndoSummary.action` carries the full `Action`, not `Action['type']` as the brief said. The «Undid: 12 damage to …» labels need the amounts.
3. Heroes toast placement uses CSS anchoring to the BottomBar top, not a JS measurement. The result is the same for any bar height.
4. The per-screen «Create/Save disabled in flight» and «duplicateDisabled at the limit» items have no equivalent in CombatScreen. The unit form closes on submit, and the dispatcher reuses the action id on Retry. Duplicate at the 99-unit cap shows the cap toast. UnitForm and UnitRow were not given new props.
5. Toast «Preset added to Library» (vision) vs «saved to Library» (handoff): vision wins.

## Differences from the renders

- Toast icons come from `kind` (success check, neutral info, warning triangle, error wifi-off). The renders use copy, trash, bookmark, user-x, refresh, lock and user-off.
- After a tap, the social buttons render disabled (APF16, SignIn/SignUp Social).
- Focus rings visible in APF13, APF23, APF51–53. APF13 and APF15 type before the step's action.
- PlayerView: PV-F4.2 header shows Round 3 with the die (render: Setup).
- CombatScreen: hint line under initiative and the Note cut off (CSF12); dice icon in role blocks without initiative (CSF14, CSF15, CSF77); the popover covers the rows instead of pushing them (CSF15); CS-F6.2 edits the Orc; confirm dialogs centred, not at top 240 (CSF64, CSF75, CSF76, CSF78); expanded row or open Share sheet behind dialogs (CSF64, CSF75); no scrim behind the combat menu (CSF71); Orc flash border from the setup damage (CSF71, CSF72); Restart clears Tomas's initiative (CSF77); no scrollbar in headless Chromium (CSF81); the sample link URL differs (CSF73–75).

## Dependencies needed

none

## Left undone

- Baselines come from the local Playwright Chromium, not the Docker image. The Docker socket is not accessible on this machine, so there is no `.docker-*` marker and `COMBAT_PLANNER_NO_DOCKER=1` is needed for `pnpm check`.

## Processes left running

none
