# Report: fix-14-open-defects (hand-back message, saved by the orchestrator)

## Commits
- 2a45dd3 fix(ui): HP history rows show the max HP at the time of the entry
- 6c48c30 fix(api): a combat copy starts at version 1 and an empty PATCH keeps the version
- 46e1ba5 test(api): undo over a long log reads only the entries undo can reach
- 3151ab7 fix(api): a malformed live event is dropped and the combat is refetched
- d476aa3 feat(api): players get the DM's language with every live combat update
- 9e068cf test(web): a DM route entered from a player route never shows the browser language
- 5515fe9 fix(api): link reissue answers the new generation and /combats checks the session once
- ef343b2 test: cover the swipe guard and route locale wiring, project() failure on a live combat, and the display name surrogate clamp
- cd2cca8 chore: one source for the e2e data-dir marker; story-only labels leave i18n
- 2625187 test(ui): HpHistory edge-case stories are named by language

## Checks run
pnpm check, pnpm test (2192), screenshots:update (no change), visual (1372), storybook:build, build, E2E_PORT=3100 pnpm e2e (24): green.

## Routed findings
- 5-e2e → fix-5: sign-out body and error toast — already fixed, hono-client.ts:497, Account.tsx:65; `<html lang>` — already fixed, provider.tsx:60.
- fix-4 → fix-5: undo pinned to removal — already fixed, CombatScreen.tsx:339-351; dispatcher generation — hooks/combat.ts:167-172; failedTags pruned — Library.tsx:200-205; third-page log test — log.test.ts:178; toast double tap — Toast.tsx:108-111; load typed per viewer — live/sse.ts:14-21; PlayerView 404 → CombatDeleted — PlayerView.tsx:92-93.
- 4-web → fix-4-web: swipe over scrim — swipeGuard.ts:1; data-system-screen — MessageScreen.tsx:32; errorElement test — router.test.ts:197-198; browser language restored — routeLocale.ts:26-37; teardown own dir — e2e/teardown.ts:7-13. All already fixed.
- fix-4-overlays → 5-e2e: sort sheet scenario — already fixed, e2e/combat-lifecycle.spec.ts:139.
- fix-2.4 → fix-4: queue blocked — hooks/combat.ts:189-196; re-claim rename — authorize.ts:36; stale link error — CombatScreen.tsx:158; rejected tag create — Library.tsx:183-188; dmDocument whole log — combats/log.ts:51-61; pre-removal summary — CombatScreen.tsx:346-349; Account blurred — Account.tsx:49-52; Duplicate at 99 — CombatScreen.tsx:256,468; toast store vs clear — hooks/mutations.ts:25-27. All already fixed.
- fix-2.4-core → fix-4: SSE tests, probe timeout, notFound branch, toast store — already fixed, hono-client.test.ts:542-620, PlayerView.tsx:92, mutations.ts:27.
- 2.4-Library → fix-2.4: repeat Create, duplicate at limit, CantReachServer — Library.tsx:139,156,209,255,301; "new" label — TagSheet.tsx:49-66. Already fixed. LBF43 skipped (docs).
- fix-2.3 → fix-2.4: Sheet focus — Sheet.tsx:60-65; same.txt groups, NumpadSheet.close, presetCount play, readOnly story, PageDown, NoteField — TagSheet.stories.tsx:106, UnitRow.stories.tsx:133, HpHistory.stories.tsx:529-537, NoteField.stories.tsx:257. Already fixed.
- 2.4-PlayerView → fix-2.4: Heroes after release, ownReleases, flash, Join/Done — PlayerView.tsx:56-75, TurnOrder.tsx:91-96, Heroes.tsx:127-143. Already fixed.
- 2.4-AppPages → fix-2.4: Settings language, Account save, social sign-in, accountDeleted — Settings.tsx:36, Account.tsx:33-52, SocialButtons.tsx:30-46, SignIn.stories.tsx:201. Already fixed. About.version allow-same — not reproducible (correct de/fr word), allow-same.txt:28.
- 2.4-CombatList → fix-2.4: limit toast, duplicateDisabled, pending Create, withApi, form state — hooks/toasts.ts:60, CombatList.tsx:124,153,234,288, storybook/withApi.tsx:12-15. Already fixed.
- 2.4-api-hooks → fix-2.4: stream refusal, clearCache, visibleEntry, Retry result, endOf, shared connection, settings invalidates session, first-connect test — hooks/account.ts:32-56, mutations.ts:38-75, useConnection.ts:21-33, settings.ts:34, useConnection.test.ts:42. Already fixed.
- 2.3-NumpadSheet → fix-2.3: NumpadSheet.tsx:63,242 and stories ExtraSetTempZero, ExtraDoubleTapAppliesOnce, ExtraSpaceOnAction, ExtraTapDoesNotPinPreview, ExtraEveryDigitAppends. Already fixed.
- 2.3-UnitForm → fix-2.3: UnitForm.tsx:113-185, UnitForm.module.css:25. Already fixed.
- 2.3-UnitRow → fix-2.3: UnitRow.module.css:23, UnitRow.tsx:209, InitiativePopover.tsx:68. Already fixed.
- fix-2.3-organisms-i: project check order — project.ts:35. Already fixed.
- 2.3-organisms-f → fix-2.3: RoleBlock min-height, keyboard scroll — HpHistory.stories.tsx:529 (already fixed); EdgeCases*2 names — fixed in 2625187, HpHistory.stories.tsx:345-376.
- 2.3-organisms-e → fix-2.3: CombatHeader.tsx:63-65,131-138,377, CombatHeader.module.css:92. Already fixed.
- fix-2.3-organisms-b → fix-2.3: Dialog.tsx:67, Drawer.tsx:91, Menu.tsx:200. Already fixed.
- 2.3-organisms-h → fix-2.3: reissue confirmation — CombatScreen.tsx:369-376. Already fixed.
- 2.3-organisms-c → fix-2.3: PlayerHeader.tsx:52, apps/web/src/root.css:2. Already fixed.
- fix-2.3-organisms-a → fix-2.3: fr/Dialog.json:7, Dialog.tsx:67. Already fixed.
- 2.3-organisms-g → fix-2.3: ConditionPicker.module.css:15-20, TagSheet.stories.tsx:269, TagSheet.tsx:54,62. Already fixed.
- 2.3-organisms-d → fix-2.3: TurnBar.tsx:15-31, BottomBar.tsx:13, layout.ts:11. Already fixed.
- 3-server-rest → fix-3: auth/index.ts:58-78,94-95,152. Already fixed.
- fix-2.2 → fix-2.3: Stepper.tsx:121, HpBox.stories.tsx:350-354, Stepper.stories.tsx:279. Already fixed.
- 3-server-live → fix-3: live/sse.ts, events.test.ts:156-160. Already fixed.
- 2.2-molecules-e → fix-2.2: Toast.stories.tsx:171-177, Toast.tsx:78. Already fixed.
- 2.2-molecules-c → fix-2.2: HistoryRow.tsx meta variant and resolvedLanguage. Already fixed.
- 2.2-molecules-d → fix-2.2: InitiativePopover.tsx:91-96, NoteField.tsx:73. Already fixed.
- 2.2-molecules-a → fix-2.2: Segmented.tsx:48-51. Already fixed.
- fix-2.1 → fix-2.2: SearchField.tsx:49. Already fixed.
- 2.1-atoms-a/b/c/d, 0.5-reference → fix-2.1: NumberField.tsx:104, SearchField.tsx:39, Chip.stories.tsx:307-328, RoleBlock.tsx:12, RoleBlock.stories.tsx:113, Button.module.css:58, index.ts:29, PhoneFrame.module.css:37. Already fixed.
- 1-domain-core, 1-domain-rest → fix-1-domain-core: reduce.test.ts Set Max floor and keep-disabled, project.ts:53-62, undo.test.ts:358. Already fixed.
- 1-api-contract → fix-1-api-contract: link.get, connection state — already fixed; P3 items and 3-server-schema covered by items 4, 5, 7.

## Questions
1. About.version stays in allow-same.txt.
2. DM language reaches players with the next combat update (at latest on DM open); a settings change alone does not push to open streams. Orchestrator: accepted.

## Left undone
- e2e mutation check for app-wiring.spec.ts (command denied).
- Stale group `DisabledHintRu ExtraLocaleRu` in BottomBar.same.txt (PNGs differ) — out of scope.

## Processes left running
none
