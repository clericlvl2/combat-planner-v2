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
All routed findings already fixed except HpHistory numbered `EdgeCases*2` exports (fixed in 2625187); `About.version` allow-same kept (correct de/fr word); LBF43 skipped (docs). Full per-item list with file:line in the hand-back message.

## Questions
1. About.version stays in allow-same.txt.
2. DM language reaches players with the next combat update (at latest on DM open); a settings change alone does not push to open streams. Orchestrator: accepted.

## Left undone
- e2e mutation check for app-wiring.spec.ts (command denied).
- Stale group `DisabledHintRu ExtraLocaleRu` in BottomBar.same.txt (PNGs differ) — out of scope.

## Processes left running
none
