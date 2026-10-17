# REPORT fix-5

(The tool refused `REPORT.md`; the agent returned the text. The orchestrator saved it here, condensed, with every anchor kept.)

## Commits

Anchors are at HEAD 67605cc. Each test fails on the parent commit.

- 5ada874 fix(api): sign-out
  - `hono-client.ts:168-171` (`EMPTY_JSON_BODY`) and `:475`: posts `{}` with `Content-Type: application/json`.
  - The other Better Auth calls were checked and already send JSON.
  - Test `packages/api/test/auth.test.ts:406`, through a body-stream transport; fails on the old code with 415.
- 4057822 fix(api): event stream
  - `live/sse.ts:11-16`: `StreamRequest` is a union keyed by viewer.
  - Test `events.test.ts:251` with `@ts-expect-error` at `:277`; TS2578 on the old code.
- 0ecfa2e test(api): undo window — `log.test.ts:27-29` sets `ROW_BOUND` = 33 (worst case 31 entries, 3 pages). The case at `:177` reads exactly 33 rows; it fails with the old bound of 22.
- 850d091 fix(ui): hooks
  - `combat.ts:167` checks the generation; `useCombat.ts:85` passes it.
  - After a session change, a failed send resolves not applied, with no toast.
  - Test `useCombat.test.ts:321`.
- c55982b fix(ui): UiProvider
  - `provider.tsx:53-68` (`followLanguage`), wired at `:128`: `<html lang>` follows i18n and is restored on unmount.
  - Test `provider.test.ts:5`.
- 8ff1eb7 fix(ui): Toast
  - `Toast.tsx:109`: no action while the toast is hiding.
  - Play `ExtraActionOnceDuringExit` at `Toast.stories.tsx:207`. Its baseline joins a `Toast.same.txt` line.
- b9e12d5 fix(ui): Account
  - `Account.tsx:16`, `:62-66`: a failed sign-out shows `signOutFailed`, unless the error code has its own toast (`toastedCodes`). The key is in six locales.
  - Play `ExtraSignOutFailed` at `:226`.
- e7b70a3 fix(ui): Library
  - `Library.tsx:201-206`: `failedTagOf` drops tags listed in the `queryKeys.tags` cache.
  - Play `ExtraFailedTagListedLater` at `:779`.
- ac3abaa fix(ui): PlayerView
  - `PlayerView.tsx:92-94`: any `notFound` without a document shows CombatDeleted; `:87` passes `null`.
  - `CombatDeleted.tsx:6`, `:14-18`: `combatTitle: string | null`. Without a title it shows «This combat was deleted».
  - Play `ExtraDeletedOnFirstLoad` at `:515`.
- 84fe13f fix(ui): CombatScreen
  - `CombatScreen.tsx:174-187`: `sendNow` takes a pinned version. `:221-228`: `undo({ summary, version })`. `:343-350`: the removal toast pins the undo to the removal's result version, so a newer action answers 409 and shows «The combat changed».
  - Play `ExtraRemoveUndoAfterNextTurn` at `:1028`.
- 67605cc test(e2e): auth
  - `auth.spec.ts:18`: `test.fail()` removed.
  - A local `signOut` through Account (`:5-10`) is used at `:21` and `:45`.

## Checks run

- These are green:
  - `pnpm check`;
  - `pnpm test` (2139);
  - `pnpm build`;
  - `pnpm storybook:build`;
  - visual without `--update` (1371);
  - check scripts and `scripts/test/run.mjs`.
- `pnpm e2e`:
  - after unit 1: 20 passed, 1 «expected to fail, but passed», which proves the fix;
  - after unit 11: 21 passed.
- `check-commit.sh`: red on ac3abaa (2 component folders).

## Questions

1. ac3abaa touches `screens/PlayerView/` and `screens/CombatDeleted/`. The brief allowed this, but `check-commit` refuses two folders. Recommendation: accept.
2. The copy for `Account:signOutFailed` needs owner review:
   - en «Couldn’t sign out. Try again.»
   - de «Abmelden fehlgeschlagen. Versuche es erneut.»
   - es «No se pudo cerrar la sesión. Inténtalo de nuevo.»
   - fr «Impossible de se déconnecter. Réessayez.»
   - ja «ログアウトできませんでした。もう一度お試しください。»
   - ru «Не удалось выйти. Попробуйте ещё раз.»
3. An SSE `deleted` event with an empty title, before any title was seen, now shows «This combat was deleted». It used to show « was deleted».
4. Hypothesis: `<html lang>` is not verified in a browser. The provider wiring at `:128` is untested.

## Differences from the renders

none

## Dependencies needed

none

## Left undone

none

## Processes left running

none
