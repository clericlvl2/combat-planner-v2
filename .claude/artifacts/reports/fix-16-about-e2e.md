# Report: fix-16-about-e2e (hand-back message, saved by the orchestrator)

## Commits
- c661cf9 feat(ui): show the 13th Age Community Use Policy notice in About and drop the donate row
- cc5f6c9 fix(web): link the About source to github.com/clericlvl2/combat-planner-v2
- 59b2ac5 chore: set version 0.1.0
- 1d06ccc test(e2e): take the server port from E2E_PORT and fail when no tests run

## Checks run
install, check, test, storybook:build, build, check-* scripts, visual update + verify (1372), `E2E_PORT=3100 pnpm e2e` (22 passed): green. check-commit red on scope/subject — not part of the gate any more.

## Questions
1. About.same.txt lists Default/KeyboardLinks (byte-identical after the donate row went).
2. VITE_DONATE_URL removed from Dockerfile, docker-compose.yml, .env.example, README.
3. Source URL updated in .env.example and About/AppPages stories.
4. smoke.spec.ts escapes baseURL into its link regex.
5. About stories assert legal text present, Donate absent; KeyboardLinks asserts focus leaves the only link.

## Left undone
none

## Processes left running
none
