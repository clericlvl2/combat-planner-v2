# REPORT: fix-1-domain-core

## Commits

- 916df8d fix(domain): setMaxHp floor
- 007de85 fix(domain): copy keeps disabled
- 28d0a4e fix(domain): player document

## Checks run

- `pnpm install --frozen-lockfile` — ok
- `COMBAT_PLANNER_NO_DOCKER=1 pnpm check` — pass, before each commit (format, lint, tsc -b, check-stories, check-i18n, check-screenshots, check-comments, check-domain-tests: 84 names pass)
- `pnpm test` — pass, before each commit; final run 25 files, 487 tests, first attempt
- `pnpm build` — pass, on the final tree
- `bash scripts/check-commit.sh master..agent/fix-1-domain-core` — 3 commits pass

## Questions

- `duplicateUnit` in `reduce.ts` still resets `disabled` to false; the brief names only `copyCombat`, and vision Unit → Actions Duplicate does not list `disabled` among what the copy keeps or resets. Left as is.
- Unit 3 also changed `packages/domain/test/types.test.ts`: its `PlayerCombat` fixture spread the whole `Combat` and so carried `linkGeneration`; it now spreads the combat without `linkGeneration` and `units`. Not named in the brief, inside the allowed paths.

## Differences from the renders

none

## Dependencies needed

none

## Left undone

none

## Processes left running

none
