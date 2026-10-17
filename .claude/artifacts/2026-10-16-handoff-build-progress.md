# Build progress: Combat Planner v2

План: `.claude/plans/2026-10-16-build-combat-planner-v2.md`. Правила: `CLAUDE.md`.
Пишет только оркестратор. После автокомпакта: прочитать план и этот файл,
выполнить `pnpm status` (`scripts/status.sh`), сверить каждую строку не в `todo`,
продолжить с первой незавершённой.

Статусы пачек: `todo` → `running <agent-id> <started>` → `reported <report>` →
`rebased` → `gate ok|fail <log>` → `merged <hash>` → `guarded <path>`;
`gate fail` или guard P0–P1 → `rework <n>`; молчание → `restarted <n>`.
Статус единицы: `todo` | `done <hash>`, по `git log master`.

## Фазы

| Фаза | Что | Пачки | Тег |
|------|-----|-------|-----|
| −1 | рендеры хэндоффа, errata | оркестратор + chrome-rider | phase--1 |
| 0 | тулчейн, спайк, скрипты, CLAUDE.md Commands | 0-toolchain | phase-0 |
| 0.5 | тема, PhoneFrame, ThemeAudit, эталонный Button, check-скрипты | 0.5-reference | phase-0.5 |
| 1 | domain, контракт ApiClient | 1-domain-core, 1-domain-rest, 1-api-contract, fix-1-domain-core, fix-1-api-contract | phase-1 |
| 2.1 | атомы | 2.1-atoms-a…d, fix-2.1 | |
| 2.2 | молекулы | 2.2-molecules-a…e, fix-2.2 | |
| 2.3 | организмы | 2.3-organisms-a…i, 2.3-UnitRow, 2.3-UnitForm, 2.3-NumpadSheet, fix-2.3 | |
| 2.4 | хуки, экраны | 2.4-api-hooks, 2.4-CombatScreen, 2.4-CombatList, 2.4-PlayerView, 2.4-Library, 2.4-AppPages, 2.4-SystemScreens, fix-2.4-core, fix-2.4 | phase-2 |
| 3 | сервер | 3-server-schema, 3-server-actions, 3-server-live, 3-server-rest, fix-3 | phase-3 |
| 4 | web | 4-web, fix-4 | |
| 5 | e2e | 5-e2e, fix-5 | |
| 6 | docker | 6-docker | |

## Текущий шаг

Фаза 2 закрыта тегом `phase-2` (гейт `fix-2.4` на дереве master, отличие только в `.claude/artifacts/**`, служит фазовым гейтом). Идут `4-web` и `fix-4` параллельно (пути не пересекаются).
Фазы 0, 0.5 и 1 закрыты тегами `phase-0`, `phase-0.5`, `phase-1`. Фаза 2.1 слита и проверена целиком (`fix-2.1` ab729f2). Фазы 2.1 и 2.2 закрыты (`fix-2.2` проверен). Идёт фаза 2.3 (организмы, брифы
готовы) параллельно с фазой 3 (`3-server-rest`, затем `fix-3`). С 2026-10-17
вместо Fable 5.1 — Opus 5.5 (план, «Решения владельца»). Гейт на этой машине идёт с `COMBAT_PLANNER_NO_DOCKER=1`.
Интеграция: `.claude/run/gate.sh <batch> <worktree> <range>` в фоне, затем
`.claude/run/merge.sh <batch>` (rebase на master, где с момента гейта менялись
только `.claude/**`, ff-merge, удаление worktree и ветки).

## Пачки

| Пачка | Статус | Единицы |
|-------|--------|---------|
| -1-renders | guarded — | renders, errata |
| 0-toolchain | guarded `.claude/artifacts/guard/0-toolchain.md` | workspace, vitest projects, storybook, skeletons, scripts, CLAUDE.md commands |
| 0.5-reference | guarded `.claude/artifacts/guard/0.5-reference.md` | theme, PhoneFrame, ThemeAudit, Button, check scripts |
| 1-domain-core | guarded `.claude/artifacts/guard/1-domain-core.md` , P2 closed by fix-1-domain-core | types, schemas, actions, health, sort, names, reduce, authorize |
| 1-domain-rest | guarded `.claude/artifacts/guard/1-domain-rest.md` | project, undo, index, tests |
| 1-api-contract | guarded `.claude/artifacts/guard/1-api-contract.md`, P1 ×2 closed by fix-1-api-contract | ApiClient |
| fix-1-api-contract | guarded `.claude/artifacts/guard/fix-1-api-contract.md` | ApiClient |
| fix-1-domain-core | guarded `.claude/artifacts/guard/fix-1-domain-core.md` | setMaxHp floor, copy keeps disabled |
| 2.1-atoms-a | rework 1 → fix-2.1, guard `.claude/artifacts/guard/2.1-atoms-a.md` (P1 TextField wrapped height) | IconButton, ToolButton, TextField, TextArea |
| 2.1-atoms-b | guarded `.claude/artifacts/guard/2.1-atoms-b.md` | SearchField, NumberField, Checkbox, Radio |
| 2.1-atoms-c | guarded `.claude/artifacts/guard/2.1-atoms-c.md` | Swatch, Chip, StatSquare |
| 2.1-atoms-d | guarded `.claude/artifacts/guard/2.1-atoms-d.md` (P2 → fix-2.1) | EscalationDie, RoleBlock |
| fix-2.1 | guarded `.claude/artifacts/guard/fix-2.1.md` (CRIT 2 documentary P2, no P0–P1) | |
| 2.2-molecules-a | guarded `.claude/artifacts/guard/2.2-molecules-a.md` | Stepper, Segmented, RadioList |
| 2.2-molecules-b | guarded `.claude/artifacts/guard/2.2-molecules-b.md` | CheckList, SwatchRow, CardActions |
| 2.2-molecules-c | guarded `.claude/artifacts/guard/2.2-molecules-c.md` | HpBox, HistoryRow, DefenseLine |
| 2.2-molecules-d | guarded `.claude/artifacts/guard/2.2-molecules-d.md` | NoteField, InitiativePopover |
| 2.2-molecules-e | guarded `.claude/artifacts/guard/2.2-molecules-e.md` (P2 hollow keyboard story → fix-2.2) | Toast, EmptyState |
| fix-2.2 | guarded `.claude/artifacts/guard/fix-2.2.md` | |
| 2.3-organisms-a | guarded via `fix-2.3-organisms-a`, guard `.claude/artifacts/guard/2.3-organisms-a.md` |
| fix-2.3-organisms-a | guarded `.claude/artifacts/guard/fix-2.3-organisms-a.md` (P1 closed) | Sheet, Dialog |
| 2.3-organisms-b | guarded via `fix-2.3-organisms-b`, guard `.claude/artifacts/guard/2.3-organisms-b.md` |
| fix-2.3-organisms-b | guarded `.claude/artifacts/guard/fix-2.3-organisms-b.md` (P1 ×2 closed) | Menu, Drawer |
| 2.3-organisms-c | guarded `.claude/artifacts/guard/2.3-organisms-c.md` | PageHeader, PlayerHeader |
| 2.3-organisms-d | guarded `.claude/artifacts/guard/2.3-organisms-d.md` | BottomBar, TurnBar |
| 2.3-organisms-e | guarded `.claude/artifacts/guard/2.3-organisms-e.md` (no P0–P1; P2 ×2, P3 ×5 → `fix-2.3`, Add unit → owner) | CombatHeader, CombatCard |
| 2.3-organisms-f | guarded `.claude/artifacts/guard/2.3-organisms-f.md` (P3 ×4 → `fix-2.3`) | PresetCard, HpHistory |
| 2.3-organisms-g | guarded `.claude/artifacts/guard/2.3-organisms-g.md` (CRIT 2 fail at P2, story baseline → `fix-2.3`) | ConditionPicker, TagSheet |
| 2.3-organisms-h | guarded `.claude/artifacts/guard/2.3-organisms-h.md` | SortSheet, ShareSheet |
| 2.3-organisms-i | guarded after rework 1 (`fix-2.3-organisms-i` guarded), guard `.claude/artifacts/guard/2.3-organisms-i.md` |
| fix-2.3-organisms-i | guarded `.claude/artifacts/guard/fix-2.3-organisms-i.md` (P3 ×1 report hashes, no action) | MessageScreen, PlayerRow |
| 2.3-UnitRow | guarded `.claude/artifacts/guard/2.3-UnitRow.md` (P3 ×6 → `fix-2.3`) | UnitRow |
| 2.3-UnitForm | guarded `.claude/artifacts/guard/2.3-UnitForm.md` (P3 ×6 → `fix-2.3`) | UnitForm |
| 2.3-NumpadSheet | guarded `.claude/artifacts/guard/2.3-NumpadSheet.md` (P3 ×7 → `fix-2.3`) | NumpadSheet |
| fix-2.3 | guarded `.claude/artifacts/guard/fix-2.3.md` (no P0–P1; documentary P2 closed by the guard's per-unit file:line list; P3 ×7 → `fix-2.4`) | |
| 2.4-api-hooks | guarded `.claude/artifacts/guard/2.4-api-hooks.md` (P2 ×2, P3 ×8 → `fix-2.4`) | ApiProvider, FakeApiClient, useCombatList, useCombat, usePresets, useTags, useSettings, useAccount, useToasts, useConnection |
| 2.4-CombatScreen | guarded `.claude/artifacts/guard/2.4-CombatScreen.md` (no P0–P1; code P2 ×1, P3 ×5; render check P2 ×4, P3 ×15 → `fix-2.4`) | CombatScreen |
| 2.4-CombatList | guarded `.claude/artifacts/guard/2.4-CombatList.md` (P2 ×2, P3 ×5 → `fix-2.4`) | CombatList |
| 2.4-PlayerView | guarded `.claude/artifacts/guard/2.4-PlayerView.md` (P2 ×1, P3 ×8 → `fix-2.4`) | Heroes, TurnOrder |
| 2.4-Library | guarded `.claude/artifacts/guard/2.4-Library.md` (P2 ×2, P3 ×5 → `fix-2.4`) | Library |
| 2.4-AppPages | guarded `.claude/artifacts/guard/2.4-AppPages.md` (P3 ×9 → `fix-2.4`) | SignIn, SignUp, Settings, Account, About |
| 2.4-SystemScreens | guarded `.claude/artifacts/guard/2.4-SystemScreens.md` (no findings) | NotFound, UnexpectedError, CombatNotFound, LinkExpired, CombatDeleted, CantReachServer |
| fix-2.4-core | guarded `.claude/artifacts/guard/fix-2.4-core.md` (P3 ×7 → `fix-4`) | project, api contract, FakeApiClient, hooks |
| fix-2.4 | guarded `.claude/artifacts/guard/fix-2.4.md` (CRIT 5 scope accepted; P2 ×2, P3 ×9 → `fix-4`) | |
| 3-server-schema | guarded `.claude/artifacts/guard/3-server-schema.md` | schema, migrations, client-hono, server main |
| 3-server-actions | guarded `.claude/artifacts/guard/3-server-actions.md` | combats routes, actions route, link |
| 3-server-live | guarded `.claude/artifacts/guard/3-server-live.md` (P2 ×2 → `fix-3`, 2.4-api-hooks; P2 outside scope → owner) | events route, play routes |
| fix-3 | guarded `.claude/artifacts/guard/fix-3.md` | live, auth |
| 3-server-rest | guarded `.claude/artifacts/guard/3-server-rest.md` (P2 ×2 → `fix-3`) | auth, presets, tags, settings, account |
| 4-web | guarded `.claude/artifacts/guard/4-web.md` (no P0–P1; CRIT 6 FAIL P3 system-screen swipe; P2 ×1, P3 ×4 → `fix-4-web`) | router, providers, player identity, drawer, smoke e2e |
| 5-e2e | handed back 5/5 (report `.claude/artifacts/reports/5-e2e.md`; 21 e2e, 1 `test.fail()` sign-out 415), rebased on fix-4, gate + e2e running | auth, combat lifecycle, player, library, account |
| fix-4-overlays | guarded `.claude/artifacts/guard/fix-4-overlays.md` (P2 ×1 → `5-e2e`) |  Sheet, Menu, Dialog, Drawer, CombatHeader |
| fix-4-web | handed back 5/5 (report `.claude/artifacts/reports/fix-4-web.md`), rebased, gate running; e2e after `5-e2e` frees port 3000 | swipe, router test, locale, teardown |
| fix-4 | guarded `.claude/artifacts/guard/fix-4.md` (P2 ×1, P3 ×6 → `fix-5`; P3 ×2 accepted) | |
| fix-5 | todo (after `5-e2e`: guard-bee entries → `fix-5` and the e2e defects) | |
| 6-docker | todo | Dockerfile, compose, README |

## Вопросы владельцу

- 4-web guard: `package.json` `e2e` keeps `--pass-with-no-tests`
  (CLAUDE.md Commands), so a zero-test run passes the phase gate. Proposal:
  drop the flag now that specs exist.
- 4-web: the root `package.json` has no `version`, so About shows `0.0.0`.
  Routed to `6-docker`, which sets `"version": "1.0.0"`. The `VITE_SOURCE_URL`
  and `VITE_DONATE_URL` defaults are placeholders
  (`github.com/combat-planner/combat-planner`, `ko-fi.com/combatplanner`).
  Owner: the real URLs?
- 4-web: the edge swipe opens an app-level Drawer, not the screen's own. A
  system screen inside a DM route still accepts the swipe.
- fix-2.4: `check-commit` red with 15 cross-folder problems, accepted as with
  fix-2.3 39671d9. A `Sheet` change shifts the baselines of 8 sheet consumers.
  `SignIn`/`Account`/`UnexpectedError`/`PlayerView` shift the `SignUp`,
  `AppPages` and `Heroes` baselines. The `Stepper` labels change the `UnitForm`
  queries. `NoteField` changes the `PlayerRow` story. `shared` moves 5 folders.
  Proposal: `check-commit.sh` accepts a baseline-only change of a consumer
  folder when the commit's unit is a shared component changed in the same
  commit.
- fix-2.4: a returning player's rename is sent as `releaseUnit` + `claimUnit`
  of the own hero, because the domain has no rename and forbids re-claiming an
  own hero (`authorize.ts:35`). Owner: allow re-claim as rename? The guard
  (fix-2.4 P2) shows the pair nulls the DM's Undo and races; orchestrator
  decision: a re-claim of an own hero renames (vision Claims, fa60bcf), `fix-4`.
- fix-2.4: `UndoSummary.action` carries the full `Action`, not just the type,
  so «Undid: 12 damage to …» can show the amount. Accepted.
- fix-2.4: toast icons come from `kind` (success, neutral, warning, error) in
  place of the per-message icons the renders draw.
- fix-2.4-core, решения оркестратора 2026-10-17: экспорт `applyHp` из
  `packages/domain/src/index.ts` — принято; `method` по последнему
  `account.updatedAt` (точнее — колонка в `session` и миграция) — принято;
  мутация с Retry ждёт Retry или закрытия тоста (при motion off — до ×) —
  принято; кэш скрывается только при `unauthorized`/`forbidden`/`notFound` —
  принято; трейлер Fable 5.1 по CLAUDE.md — принято. Владельцу: перевод
  `Toast.limitReached`. → `fix-2.4`: `Toast.presetSaved` убирается вместе с
  историей Toast (`presetAdded`); фейк отвечает `emailTaken` одновременно с
  SignUp; экраны используют `unauthorized`, `kind`, `refetch`, `method`,
  `round`/`createdAt`.

- 2.4-CombatScreen, решения оркестратора 2026-10-17: пропсы `random` и
  `origin` — приняты; полное имя юнита во второй строке TurnBar — принято;
  CS-F2.4 с ходом Brother Tomas (блок на 99 только при переходе раунда) —
  принято. Владельцу: fr «tour» и для раунда, и для хода (CombatHeader fr) —
  двусмысленно, предложение «manche» для раунда. → `fix-2.4` (с правкой
  `packages/api` и hooks): Undo по серверу — документ DM несёт
  `undo: { action, unitName } | null` (новейшая отменяемая запись лога, с
  действиями игроков; claim/release и REST не отменяются), `undoDisabled` и
  «Undid: …» берутся из него, сессионный стек в CombatScreen удаляется;
  `useCombat().dispatch` разрешается `{ applied: boolean }` (409 и сеть —
  `false`, успешный Retry — `true` у исходного вызова), вспышка ряда только
  при `applied`; `useCombatLink` из `screens/CombatScreen` в `hooks/`.

- 2.4-Library, решения оркестратора 2026-10-17: новый ключ
  `Toast.presetAdded` по vision — принято, `fix-2.4-core` убирает
  `presetSaved`; `opened` у PresetFormSheet — принято; порядок строк листа
  тегов по числу пресетов, скрытие тегов без пресетов в обоих листах (кроме
  отмеченных и только что созданных) — принято; копия наверх, бонус
  инициативы, защиты 0–99, Create только без совпадений — решения владельца.
  → `fix-2.4`: доступные имена − / + Stepper включают подпись поля
  (Stepper.tsx:109, :137).

- 2.4-PlayerView guard, вне scope: vision Unit → Actions запрещает игроку Set
  max HP, но разрешает Edit, а поля формы включают max HP — игрок меняет max
  HP через Edit (`authorize.ts:46`). Рекомендация 3a: в Edit игрока поле Max
  HP заблокировано (UnitForm `lockMaxHp`), `authorize` отклоняет `editUnit`
  игрока с изменённым `maxHp` — в `fix-2.4`, правка vision между фазами.
  3b: оставить как есть (Edit — доверенное действие). Строю по 3a, пока нет
  ответа.

- Оркестратор 2026-10-17, правило baselines: CLAUDE.md запрещает менять
  `__screenshots__/<Name>/` без изменения в `src/**/<Name>/` того же коммита.
  Общий организм (BottomBar `layout.ts`, PlayerRow, Sheet из `fix-2.3`)
  сдвигает baselines экранов, у которых своего изменения нет. Решение:
  обновление baselines экранов — один коммит `fix(ui): BottomBar` в `fix-2.3`
  только со скриншотами; `check-commit.sh` на нём красный по правилу, исключение
  принято оркестратором и записано здесь. Владельцу: разрешить в
  `check-commit.sh` коммит только из baselines, если его единица называет
  общий компонент, изменённый в той же пачке.

- 2.4-PlayerView, решения оркестратора 2026-10-17: Heroes на `Checkbox`
  (CheckList не умеет блокировать опцию), claim по Join, далее сразу —
  принято; один `useCombat` в PlayerView, Heroes/TurnOrder на пропсах —
  принято; язык DM через `changeLanguage` — принято; вывод событий DM из
  документов — принято с ограничениями (disable своего героя читается как
  удаление, удаление последнего юнита — как Clear). → `fix-2.4` (P1, до тега
  `phase-2`): потеря данных — Edit своей карточки игроком перезаписывает
  `initiativeBonus` нулём, а поповер инициативы показывает +0. Решение:
  `project` отдаёт своему герою `initiativeBonus` (domain `PlayerUnit`,
  тест видимости обходит поле), правка таблицы «Visibility for players» в
  vision между фазами (строка «Initiative bonus»: Own Hero ✓). Также в
  `fix-2.4`: `useCombat` отдаёт `refetch`; `PlayerRow` получает проп `flash`;
  claims при Join — последовательно, каждая на версии из ответа предыдущей.

- 2.4-AppPages, решения оркестратора 2026-10-17: тост «Your account was
  deleted» из стора без дубля — принято; About по списку плана (две
  карточки) — принято; AP-F3.2/F3.5 реальным флоу — принято; поле Display
  name в Sign up и Account — принято. → `fix-2.4`: общие части экранов
  (`AuthScreen`, `SocialButtons`, `ScreenToast`, `submitOnEnter`, `hasCode`,
  `PageScreen`, `PageSection`) переезжают в `packages/ui/src/screens/shared/`;
  `Session` получает `method: 'email' | SocialProvider` (сервер по таблице
  `account` Better Auth, `hono-client`, `FakeApiClient`), Account показывает
  «Signed in with …»; ошибка sign-up для занятого e-mail — отдельный код
  `emailTaken` (сервер, клиент, фейк), SignUp не отображает любой `invalid`
  как «занят»; `callbackUrl` social sign-in — страница после входа
  (`${origin}/combats`), не путь OAuth-колбэка сервера (Better Auth
  `callbackURL` — цель после входа). Бриф `4-web`: маршрут
  `/auth/callback/:provider` обслуживает сервер (`/api/auth/callback/*`).

- 2.4-CombatList, решения оркестратора 2026-10-17: `CombatFormSheet` в
  `screens/CombatList/CombatFormSheet/` (check-commit требует папку по имени)
  — принято; Create неактивна до валидного названия (vision), ошибка «Enter a
  title» по уходу фокуса с пустого поля, рендер рисует кнопку активной —
  принято, vision выше хэндоффа; `apiLoader` + `fakeApiOf(loaded)` рядом с
  `withApi`, `LocationProbe` для проверки навигации — приняты; описания
  сценария под поиск «ferry» — принято; иконки тостов по ожидаемому
  сообщению — принято до `fix-2.4`. → `fix-2.4`: `CombatSummary` получает
  `round` (мета «Round N · M units» в Active) и `createdAt` (порядок Newest
  first не зависит от сервера) — сервер, `hono-client`, `FakeApiClient`,
  CombatList; `CombatCard` «N weeks ago» от 14 дней по рендеру CL-F1.4;
  элементы `useToasts` несут `kind` (success, neutral, warning, error) для
  иконки; `useCombatList` отдаёт `refetch`, первый неудачный load —
  CantReachServer с Try again; `Sheet` при `motion: 'off'` без 200 мс
  перехода и с `initialFocus` (фокус в поле названия при открытии).

- 2.4-SystemScreens, решения оркестратора 2026-10-17: ru «Бой «{{title}}»
  удалён», es/fr/ja переводы заголовка и fr «Aller aux affrontements» —
  приняты (владельцу на проверку вместе с прочими переводами). → `fix-2.4`:
  `MessageScreen` получает `actionVariant` (`primary` | `secondary`), экраны
  AP-F5 (NotFound, CombatNotFound, UnexpectedError) — `primary` по рендеру
  `AppPages-AP-F5.png`; истории `Default` не кликают (кольцо фокуса в
  baseline), клик — в Extra-историях.

- 2.4-api-hooks, решения оркестратора 2026-10-17: подпуть
  `@combat-planner/api/client` (корневой `index.ts` тянет сервер с
  `node:crypto`) и правка заглушки в `client.test.ts` — приняты; бриф `4-web`
  добавляет браузерный экспорт `./hono-client`; `useCombat` с перегрузками
  (DM без токена, игрок с `playerId` и токеном), результат `{ combat,
  language, status, error, ended, dispatch }` — принято; `Scenario.players`,
  `Scenario.accounts`, `emptyScenario` с входом `dm@example.com` — приняты;
  стек тостов в сторе по `QueryClient`, Toast на экране с `duration` и
  `onHide` — принято; мутации показывают тост и отклоняются с `ApiError`,
  `useCombat.dispatch` не отклоняется — принято. → `fix-2.4`:
  `useConnection` не ждёт ещё 10 с — реальный клиент уже сообщает
  `reconnecting` через 10 с (`RECONNECTING_AFTER_MS`), тост показывается сразу
  на `reconnecting` (итог 10 с по vision), `FakeApiClient.setConnection`
  моделирует состояние клиента; текст `Toast.presetSaved` по vision —
  «<name> added to Library»; экспорт хуков, `ApiProvider`, `FakeApiClient`,
  `scenarios` из `packages/ui/src/index.ts`.

- 2.3-NumpadSheet, решения оркестратора 2026-10-17: After считается через
  `apply` домена на синтетическом бою из одного юнита — принято до `fix-2.4`
  (домен экспортирует чистую функцию HP, если `fix-2.4` касается domain);
  превью After по умолчанию Damage, далее действие под указателем или в
  фокусе — принято; историю разворачивает экран 2.4 (как для HpHistory) —
  принято; `onApply` + `onClose`, `useHpFlash()`/`hpFlashDuration` для
  вспышки ряда на экране — принято; прокрутка тела листа при раскрытии
  истории — принято. → `fix-2.3`: `check-stories.mjs` читает раскладку
  `rows` (NumpadSheet.dc.html) и коды флоу вида `NP-1` (сейчас все истории
  `Extra*`), NumpadSheet переименовывает экспорты и baselines; `Sheet`
  получает слот заголовка `header?: ReactNode`, NumpadSheet строится на Sheet
  вместо своей копии Modal.

- 2.3-UnitForm, решения оркестратора 2026-10-17: пустое имя в режиме Add →
  `<Type> N` (vision и страница), имя из пробелов или пустое в Edit блокирует
  отправку с ошибкой «Enter a name» — принято; шесть `Stepper` вместо
  `NumberField` по SPEC страницы — принято; пропсы `opened`, `combatTitle`,
  `roleCounts`, `tags: TagSheetTag[]` (счётчики по всей Library), `presets` —
  domain `Preset`, `UnitDraft` = domain `UnitForm` — приняты; TagSheet поверх
  формы полноэкранно — принято. → `fix-2.3`: `check-stories.mjs` читает
  `items` страницы UnitForm (сейчас ячеек нет, все истории `Extra*`),
  UnitForm переименовывает экспорты и baselines; подсказка про бросок
  инициативы (vision Unit → Form: в Setup — на Start, в Active — при
  добавлении; страница считает `hint`, ячейки её не рисуют) — vision выше
  хэндоффа, UnitForm получает проп `mode`-зависимой подсказки; Stepper
  `format` показывает `+0` при `signed` (Stepper.tsx:32); TextField `over` при
  `value.length >= maxLength` красит счётчик (TextField.tsx:55, страница
  UnitForm `nameCountColor`).

- 2.3-UnitRow, решения оркестратора 2026-10-17: вариант для NumpadSheet —
  пропсы `readOnly` и `flash` (таймер 2 с у экрана) — принято; UnitRow сам
  компонует InitiativePopover (inline) и Menu через CardActions, отдельные
  колбэки действий, ConditionPicker и HP history у экрана — принято; языковые
  истории переключают всю локаль — принято. → `fix-2.3`: пункт Release claim
  в ⋯ виден всегда (ячейка страницы), но `disabled` при `claimedBy === null`
  (vision: DM снимает захват, у незахваченного юнита снимать нечего);
  `--cp-state-tap-marker` совпадает с заливкой активного ряда
  `--cp-color-accent` — маркер нажатия выбирает цвет, видимый на активном ряду.

- 2.3-organisms-f, решения оркестратора 2026-10-17: строка тегов PresetCard —
  две строки с многоточием (страница и рендер переносят, бриф просил
  многоточие) — принято; PresetCard владеет меню ⋯ через CardActions, пропсы
  `preset`, `tags` (имена), `menuOpened`, `onMenuClose`, `onDuplicate`,
  `onDelete` — приняты; HpHistory — union по `variant` (inline `expanded`/
  `onToggle`, sheet `opened`/`unitName`), хост передаёт историю в обратном
  порядке — принято; доступное имя заголовка со счётчиком — принято.
  Владельцу: vision называет лист HP History «заголовок — имя юнита», страница
  и рендер — «HP History» с подзаголовком «<имя> · <N изм.>»; построено по
  странице. → `fix-2.3`: `check-stories.mjs` даёт уникальное имя экспорта
  каждой ячейке (ячейки «日本語, inline» и «Русский, inline» HpHistory
  сходятся в `EdgeCasesInline`).

- 2.3-organisms-e, решения оркестратора 2026-10-17: меню CombatHeader по
  странице с Add unit (в Active другого входа нет, vision разрешает добавлять
  юнитов в Active) — принято, правка vision между фазами; API CombatHeader
  (хост владеет `open`, `onClose`, `onRoundChange`, `onEscalationChange`,
  `onMenuSelect`) и поповеры принят; → `fix-2.3`: `undoDisabled` у CombatHeader
  (vision: undo до 10 шагов, при пустой истории пункт неактивен); API
  CombatCard и статус чипом + мета-строкой по странице и vision приняты; fr
  «Menu» в allow-same — по решению для PlayerHeader.

- 2.3-organisms-i, решения оркестратора 2026-10-17: фон своего героя белый по
  скрипту и рендеру (vision и SPEC говорят «light blue») — принято, правка
  vision между фазами; CardActions (Edit, ⋯ с Release claim) под заметкой
  своего ряда по vision — принято; дополнительные пропсы PlayerRow приняты;
  истории MessageScreen по странице, системные экраны 2.4 по vision (Link
  expired без действия, Combat deleted с названием) — принято. → `fix-2.3`:
  PlayerRow держит один экземпляр NoteField при сворачивании (или NoteField
  сохраняет черновик при размонтировании); RoleBlock получает высоту ряда без
  обхода `min-height` в PlayerRow.

- 2.3-organisms-h, решения оркестратора 2026-10-17: выбор в SortSheet
  применяется и закрывает лист (бриф и флоу экранов CL-F1.3→F1.4,
  LB-F2.1→F2.2; страница SortSheet держит лист открытым), стрелки применяют
  без закрытия — принято, ячейка «A–Z selected» без истории — принято;
  пропсы ShareSheet (`opened`, `combatTitle`, `url`, `onCopy`, `onReissue`,
  `onClose`), буфер обмена и тост на хосте — приняты; сокращённые подписи
  Reissue в de/es/fr/ru — приняты. Владельцу: ru/de подписи сортировки в
  SortSheet взяты из литералов страницы («Сортировка сражений», «Сначала
  последние сыгранные», «По алфавиту»), RadioList говорит «Сортировка боёв»,
  «Последняя игра», «А–Я» — одна лексика на выбор владельца. `fix-2.3`
  добавляет `react-qr-code` (и прочие зависимости, на которых гейт ловил
  переоптимизацию: `@mantine/hooks`, setup-файл addon-vitest) в
  `optimizeDeps.include`.

- fix-2.3-organisms-b, решения оркестратора 2026-10-17: при обёртке-`target`
  (CardActions) `data-open` ложится на корень обёртки, кольцо ⋯ рисует
  собственный `open` CardActions — принято, CombatCard/PresetCard передают
  CardActions `open`; Menu сам возвращает фокус на источник после выбора,
  Escape и Tab (Mantine `returnFocus` выключен), тап снаружи закрывает без
  переноса фокуса — принято.

- fix-3, решения оркестратора 2026-10-17: пустое имя из social-профиля →
  локальная часть email, обрезанная по лимиту — принято; `originCheck?` в
  `CreateAuthOptions` только для теста — принято; `/reset-password/:token` и
  `/error` остаются (инертны / нужны OAuth) — принято; трейлер Opus 5.5 —
  верно. Бриф ошибочно просил `apps/server/.env.example`: скрипты `dev`/`start`
  читают корневой `.env`. Бриф `4-web` переносит строку
  `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173` в корневой
  `.env.example` и удаляет `apps/server/.env.example`.

- 2.3-organisms-c, решения оркестратора 2026-10-17: пропсы PageHeader
  (`onBack?` для Nested, `action?`, `search?`/`onSearch`, `tools?`/`onTool`,
  `filters?`/`onRemoveFilter`/`onClearFilters`) приняты, `nav: 'close'` и `sub`
  не строятся (ни ячейки, ни экрана); пункт меню игрока «Heroes» по vision
  вместо «Change hero» страницы — принято; пропсы PlayerHeader и хост,
  владеющий открытием меню, приняты; fr «Plus» вместо «Menu» не принято —
  `fix-2.3` ставит «Menu» с записью в `allow-same.txt` (верный перевод важнее
  обхода проверки).

- fix-2.3-organisms-a, решение оркестратора 2026-10-17: ключи `_few`/`_many`
  в en/de/es/fr/ja повторяют `_other`, потому что `check-i18n` требует
  одинаковых ключей во всех локалях — принято.

- 2.3-organisms-g, решения оркестратора 2026-10-17: `fix-2.3` меняет CheckList
  по решению владельца — Create только когда ни одна опция не содержит запрос
  (без учёта регистра), TagSheet снимает обходной путь; `fix-2.3` добавляет
  `badge?` в `CheckListOption` для метки `new` и возвращает подсветку новой
  строки; `fix-2.3` прокидывает `maxLength` в `<input>` SearchField, TagSheet
  снимает обрезку в `onChange`; пропсы TagSheet (`opened`, `onDone`,
  `onClose`, `presetName`, `presetCount`) и ConditionPicker (`opened`,
  `unitName`, `onClose`) приняты; «не срабатывает» у ConditionPicker через
  Done/× без `onChange` принято.

- 2.3-organisms-b, решения оркестратора 2026-10-17: `hint?` и `divider?` у
  пунктов Menu приняты; API Menu — источник через `target` (React-элемент),
  `data-open` клонируется на источник, `aria-haspopup`/`aria-expanded` ставит
  источник, без `target` панель рендерится inline — принят и обязателен для
  CombatHeader, PlayerHeader, CombatCard, PresetCard; `PopoverFrame`
  экспортирован из Menu, `fix-2.3` переводит InitiativePopover на него; Drawer
  на собственной разметке с `FocusTrap` принят; вес текущего пункта 700 по
  скрипту и рендеру принят; дефолтные `drawerSections` приняты; свайп
  открытия — на экране-хосте (4-web).

- 2.3-organisms-d, решения оркестратора 2026-10-17: высота баров 98 с верхним
  отступом 10 (SPEC 12 даёт 100, а разметка страницы, бриф и
  `layout.toast.bottom` 110 считают 98) — принято; `hint?` у BottomBar
  принят; пропсы TurnBar и причины блокировки в неймспейсе `TurnBar` приняты
  (экран передаёт `reason`); эллипсис доказан ru- и Extra-историями —
  принято.

- 2.3-organisms-a, решения оркестратора 2026-10-17: `fix-2.3` делает `actions`
  у Sheet опциональным (страница знает случай без кнопок); фокус на Cancel при
  открытии Dialog (кольцо в baseline) принят; скрим ink 50 % вместо стадии
  `#8C8578` принят; Dialog на собственной разметке с `FocusTrap` из-за
  `role="alertdialog"` принят, `fix-2.3` добавляет блокировку прокрутки.
  Падение `check-domain-tests` на пункте плана 2026-10-17 исправлено
  оркестратором (пункт начинается с «Модели»).

- 3-server-rest, решения оркестратора 2026-10-17: все 8 вопросов приняты как
  контракт. Q1 → бриф `2.4-api-hooks`: `errorOf` в `hono-client.ts`
  предпочитает известный `code` из тела ответа статусу (дубликат тега 409
  `invalid` не должен стать `version`). Q2: неиспользуемые теги сервер хранит,
  UI (Library, TagSheet в режиме filter) показывает только теги с пресетами.
  Субагенты не могут писать `REPORT.md` (харнесс блокирует запись отчётных
  файлов): отчёт приходит текстом, оркестратор сохраняет его сам.

- 3-server-live guard, P2 вне scope, безопасность, владельцу: проекция игрока
  отдаёт сырые `playerId` (`claimedBy`, ключи `players`;
  packages/domain/src/project.ts:27,60), а `playerId` — единственный секрет
  игрока на play-маршрутах. Любой владелец ссылки может открыть поток другого
  игрока (его Note и HP history) и действовать за его героя через
  `X-Player-Id`. Так устроена модель идентичности в vision (Roles → Player
  identity). Варианты: отдавать игрокам непрозрачный публичный id вместо
  `playerId` (правка domain `project` + сервер) или принять риск для доверенного
  стола. До ответа сборка идёт по vision.

- fix-2.2, решения оркестратора 2026-10-17: шаг Stepper от `null` с базы 0
  (+ → 1, − → −1) принят; чип HistoryRow на `variant="meta"` с
  `--chip-fill`/`--chip-text` из стилей HistoryRow принят; read-only HpBox без
  `onClick`, без `readOnly`-пропа — принят.

- 3-server-live, решения оркестратора 2026-10-16 по 12 вопросам отчёта: все
  приняты и становятся контрактом: 410 `{ code: 'linkRevoked' }` для любого
  не-текущего поколения при валидной подписи, 404 для битого токена / чужого
  боя; `players` апсертится из документа на `GET /play/:id` и после
  `dispatch`; SSE `event: <type>`, `id` = version только у `document`,
  heartbeat-комментарий каждые 15 с; подписка на registry до загрузки
  начального документа; `Last-Event-ID` впереди версии → текущий документ;
  `X-Player-Id` через `c.req.header` + `ulidSchema`; тест-ридер SSE в
  `packages/api/test/sse.ts`. Бриф `2.4-api-hooks` добавляет в
  `hono-client.ts` `ERROR_CODES` маппинг 410 → `linkRevoked` (и код в
  `client.ts` `ApiError`, если его нет) — единственная правка `packages/api`
  в той пачке.

- 2.2-molecules-e, решения оркестратора 2026-10-16: текст Toast 16/400 по
  разметке и рендеру (SPEC говорит 14/500) — принято; `fix-2.2`: при
  `motion: 'off'` таймер автоскрытия Toast не запускается (CLAUDE.md: `motion:
  'off'` отключает таймеры), тост живёт до dismiss; позиционирование
  `aboveBottomBar` и стек тостов в `useToasts` (2.4) приняты; `duration: null`
  для «Reconnecting…» принят; action → `onAction` + `onHide` принято.

- 2.2-molecules-c, решения оркестратора 2026-10-16: у страницы HpBox нет Flow
  (бриф ошибался) — play в cell-историях принят; «999/999» как
  `ExtraThreeDigitsFull999` принято; `disabled` только вид, клик работает,
  read-only без `onClick` — `div` — принято; HistoryRow без `now`, раунд по
  vision — принято; цвета чипа HistoryRow из палитры conditions по странице —
  принято; `fix-2.2`: Chip-`span` пробрасывает `...rest` (HistoryRow убирает
  обёртку); `fix-2.2`: три тинта игрока HpBox `#E3F1E6`, `#F8ECD2`, `#FBE3D8`
  переезжают в `theme.ts`.

- 2.2-molecules-d, решения оркестратора 2026-10-16: `fix-2.2` даёт Stepper
  `signed?: boolean` (по умолчанию `min < 0`) и `value: number | null` с пустым
  `—`; InitiativePopover передаёт `signed={false}` и `null` вместо `0` с
  оверлеем, baselines перегенерируются; шаг от пустой инициативы с 0 принят;
  `onRoll(initiative, roll)` с сырым d20 и `rolledInitiative` принят; `onSet`
  на каждое изменение Stepper (Set-кнопки нет) принят; NoteField на TextArea с
  переопределением рамки/отступов принят; сохранение на blur/Enter/collapse
  принято; флоу-шаги молекул через `Extra`-истории с play приняты
  (check-stories требует коды флоу только у экранов); «Note: <text>» как
  доступное имя принято; de «Initiativewert», fr «Valeur d’initiative» —
  владельцу.

- 2.2-molecules-b, решения оркестратора 2026-10-16: CheckList красит не
  отмеченные строки, а строку `hl` по скрипту страницы (Create сверху при
  отсутствии совпадений, иначе первая подходящая) — принято, SPEC «Selected row
  tinted» уступает рендеру; `query?` и фильтрация внутри CheckList, Create
  только без совпадений, `onCreate` получает обрезанный запрос, `emptyLabel?` —
  приняты, лимит `LIMITS.tagName` в TagSheet; Enter/Space на строке приняты;
  `data-tap` проброс у SwatchRow/CardActions и `open?`/`aria-haspopup="menu"` у
  CardActions приняты; трейлер коммитов по CLAUDE.md (Fable 5.1) — верно.
  Baselines CardActions с открытым ⋯ без панели Menu — перегенерация в
  `fix-2.2` не требуется, композиция с Menu живёт в историях организмов.

- 2.2-molecules-a, решения оркестратора 2026-10-16: тон роли Segmented по
  значению (`hero/enemy/ally`), не по английской подписи — принято, строки
  `Role · de/ru/fr` зелёные (страница красит ink из-за скрипта); знак `+`/U+2212
  в Stepper при `min < 0` без пропа — принято как в NumberField; `disabled?` и
  `sub` у опций RadioList приняты.

- 3-server-actions, решения оркестратора 2026-10-16 по 11 вопросам отчёта: все
  приняты и становятся контрактом для `3-server-live/rest`: `ulid` добавлен в
  зависимости `packages/api` (CLAUDE.md Dependencies не обновлён — раздел
  заморожен, владельцу дописать); reissue — `releaseUnit` на каждый захват от
  DM, версия `before + claims + 1`; replay отвечает `{ version: action.version + 1 }`
  без записи и broadcast; `verifyLink(token, secret, current?)`;
  `dispatch(db, { combatId, ownerId?, viewer, action, now })`; registry
  `subscribe/broadcast/broadcastDocument/subscriberCount` с audience `dm|player`;
  `requireUser` через контекстный `userId` или `c.get('auth')`; `POST /combats`
  с чужим id → 422 `invalid`, лимит 100 → 422 `limit`; `DELETE` → 204.
- fix-2.1, решения оркестратора 2026-10-16: удаление `Hello` из
  `apps/web/src/App.tsx` принято (вне allowed paths, но без этого не собирается);
  коммит `PhoneFrame` с baseline `Button/ExtraPhoneFrame` падал на
  `check-commit` — бриф сам задал такую раскладку, агенту разрешено один раз
  переписать неинтегрированную ветку; «Combat colours» шестой группой
  ThemeAudit принято; дефолты `LIMITS` без `kind`-пропа приняты; ключи
  `TextField.email/password` в шести локалях — владельцу на проверку;
  `combatColors` экспортирует `fix-2.4`.
- 3-server-schema, решения оркестратора 2026-10-16 по 13 вопросам отчёта: все
  приняты и становятся контрактом для `3-server-actions/live/rest`: `seq` —
  `max(seq)+1` в транзакции; auth через собственные пути Better Auth
  (`/api/auth/*`); SSE игрока с `?playerId=` в query; токен ссылки
  `<combatId>.<generation>.<hmac>`; SSE JSON с полем `type`; секреты
  обязательны только при `NODE_ENV=production`; `createApiApp({ db, env })`
  кладёт их в контекст Hono (`ApiAppEnv`).
- 2.1-atoms-d, решения оркестратора 2026-10-16: у страницы RoleBlock нет
  Flow (бриф ошибался) — play в cell-историях принят; `radius` и `size` не
  добавлены; «You» как отдельный белый чип по странице (vision говорит «You»
  в блоке) — принято, `mine` проп; dead/disabled одна заливка, кнопка активна;
  `top: null` — иконка кубика; de «Alliierter» вместо «Verbündeter» (не
  влезает в 62 px) — владельцу на подтверждение; активная засечка на левом
  крае блока, не страницы.
- 2.1-atoms-c, решения оркестратора 2026-10-16: цвет боя 8 = `#8C8578` (так на
  девяти страницах против одной), `fix-2.1` меняет `combatColors[7]` и переносит
  восемь цветов в `theme.ts`; имена цветов Swatch и `disabled` у Swatch/Chip
  приняты; серые condition-чипы в edge-ячейках приняты как в рендере; статус
  Chip через `selected` принят; семантика Chip с `onRemove`/`onClick` принята;
  StatSquare — сокращения защит (de RK/KV/MV, es CA/DF/DM, fr CA/DP/DM,
  ja 防御/物防/精防, ru КБ/ФЗ/МЗ) ждут правки владельца.
- 1-api-contract, решения оркестратора 2026-10-16 по 7 вопросам отчёта: все
  приняты: `play.*` несут `playerId` рядом с токеном; `play.dispatch` есть;
  `Locale` определён в `packages/api` (`LOCALES`, `localeSchema`), фаза 2.4
  переводит `ui` на него; `retryable` = `code === 'network'`; счётчики тегов
  считает клиент.
- 2.1-atoms-b, решения оркестратора 2026-10-16: NumberField без `size`
  (страница без Sizes); знак только при `min < 0`; `LIMITS` подключает
  `fix-2.1`; клампинг на blur для положительных ниже `min` принят; Checkbox и
  Radio с опциональным `label`, типографика строк — в CheckList/RadioList;
  `condition` проп у Checkbox принят; поведение × в SearchField принято.
- 1-domain-rest, решения оркестратора 2026-10-16 по 12 вопросам отчёта: все
  приняты. Язык игрока (вопрос 4): документ боя языка не несёт; `play.get`
  в `1-api-contract` возвращает `language` настроек DM, сервер (фаза 3) читает
  его из settings. Новый пункт «Решения владельца» требует теста или записи в
  skip-листе `scripts/check-domain-tests.mjs` (вопрос 9).
- 2.1-atoms-a, решения оркестратора 2026-10-16: `LIMITS` живёт в
  `packages/domain`; `fix-2.1` добавляет `@combat-planner/domain` в зависимости
  `packages/ui` и заменяет литералы 80/40/500/250 на `LIMITS`; ToolButton иконка
  16/20/24 по рендеру; доступное имя ToolButton из контента; TextField на
  авто-растущем `<textarea>` принят, `fix-2.1` добавляет `type?: 'email' |
  'password'` с `<input>` для SignIn/SignUp; поля на plain-элементах приняты;
  переводы, отличные от английского слова, приняты, владелец правит после.
- 1-domain-core, решения оркестратора 2026-10-16 по 21 вопросу отчёта: все
  приняты как описано. Отдельно: undo получает лог пятым параметром `apply`
  (`log: LogEntry[]`), глубина 10 и остановка на claim/release — в
  `1-domain-rest`; проекция игрока отдаёт юнитов в порядке хода с
  `healthSegments` и `position`.
- 0.5-reference, решения оркестратора 2026-10-16 по вопросам отчёта:
  `theme.module.css` рядом с `theme.ts` остаётся; stale baseline `Hello`
  уходит в `fix-2.1` (удалить `Hello` целиком); статус-бар оверлеем в
  `PhoneFrame`, заголовки резервируют 44 сами; лимит 844 px в
  `visual.test.tsx` — экранные истории выше 844 снимаются с полной высотой
  канваса, правка `visual.test.tsx` в `2.4-api-hooks`; правило имён ячеек с
  `caption` принято и идёт в брифы фазы 2; правило non-ASCII per-cell принято;
  гейт экспортирует `COMBAT_PLANNER_NO_DOCKER=1` целиком.
- 2026-10-16, оркестратор: `/var/run/docker.sock` принадлежит `root:docker`,
  пользователь не в группе `docker`, sudo без пароля нет. `screenshots:update` и
  `docker run` образа Playwright недоступны на этой машине; baselines фазы 0 и 0.5
  снимаются локальным браузером без маркера `.docker-<tag>`. Нужно
  `sudo usermod -aG docker $USER` и новая сессия.

## Отличия от рендеров

- fix-2.4, CS-F8.1: Goblin Archer 3 is drawn as the active row; the render
  shows no active row, which contradicts «next is Brother Tomas».
- fix-2.4: toast icons come from `kind`; the social buttons render disabled
  after a tap (APF16); focus rings in APF13, APF23, APF51–53; PV-F4.2 header
  shows Round 3; the CombatScreen list in the report's Differences.
- 2.4-CombatScreen: полное имя во второй строке TurnBar; CS-F2.4 ход Tomas;
  CS-F7.1/F7.2 урон 12 до меню (Undo до `fix-2.4` только по сессии); кольца
  фокуса после play; CS-F3.9 прокрутка тела NumpadSheet; CS-F6.6 ряд
  остаётся раскрытым; CS-F8.2 99 юнитов; тост «added to Library»; без Redo.

- 2.4-Library: копия пресета наверх; шаг бонуса инициативы и защиты 0–99;
  Create неактивна до имени; LB-F4.7 без строки Create; порядок и счётчики
  тегов реальные; тосты сразу после действия; кольца фокуса после play.

- 2.4-PlayerView: Join/Done по vision вместо «Join as …», чекбоксы; тост
  «… was just taken»; PV-F2.2 +0 вместо +2 (до `fix-2.4`); пункт «Heroes»;
  PV-F5.5 — экран CombatDeleted.

- 2.4-AppPages: Sign in / Create account тусклые до валидной формы; поле
  Display name в Sign up и Account; нет строки «Signed in with email» (до
  `fix-2.4`); About — две карточки по плану; маркеры нажатия как кольцо
  фокуса; AP-F2.1 — Drawer над Settings; отступ подписей секций 8 вместо 4.

- 2.4-CombatList: в Active карточки без «Round N» (до `fix-2.4`); маркеры
  нажатия как кольцо фокуса на следующей цели; CL-F1.4 «14 days ago» вместо
  «2 weeks ago»; Create тусклая до ввода названия, без каретки в поле;
  e-mail в Drawer из сценария.

- 2.3-NumpadSheet: шаги флоу, совпадающие с ячейками, без отдельных историй,
  `ExtraNp<N>` проигрывает флоу до шага 4; подписи BEFORE/AFTER — заметки
  страницы, не рендерятся; длинная история прокручивает тело листа на 844 px
  вместо роста карточки; отрицательное HP через U+2212.

- 2.3-UnitForm: TagSheet полноэкранный со своим скримом (рендер — внутри
  карточки формы); строки Stepper 48 без зазора (галерея 52 + 4); `0` вместо
  `+0` и счётчик 40/40 не красный (до `fix-2.3`); кольцо фокуса после кликов.

- 2.3-UnitRow: языковые истории переводят роль, DefenseLine и чипы (страница
  переводит только HP), ja-строка защит переносится; кольцо фокуса на
  Duplicate в «⋯ open» и на последнем элементе в части интерактивных историй.

- 2.3-organisms-f: кольцо фокуса на первом пункте Menu (PresetCard «⋯ open»)
  и на × Sheet (HpHistory «× closes»); строки «Start» в длинной истории
  показывают текущий максимум `/40` вместо `/45` (в `HpHistoryEntry` нет
  максимума на момент записи, известный P3 из 2.2-molecules-c); ячейки листа
  — нижний лист в PhoneFrame со скримом.

- 2.3-organisms-e: открытые меню и выбор грани с фокус-кольцом; ja-заголовок
  CombatCard в одну строку при 366.

- 2.3-organisms-i: ряд PlayerRow 342 в историях (в списке 366); CardActions под
  заметкой своего ряда; MessageScreen на весь экран с отступами скрипта.

- 2.3-organisms-h: настоящий QR вместо пунктирной заглушки; зазоры ShareSheet
  12 (Sheet) вместо 16; Reissue — Button secondary с цветом `--cp-role-enemy`;
  флоу-истории SortSheet заканчиваются закрытым листом.

- 2.3-organisms-c: «9:41» от PhoneFrame с отступом 32 (страница PlayerHeader
  24); «Menu tapped» с открытым меню и фокусом на первом пункте; ru-плейсхолдер
  без многоточия.

- 2.3-organisms-g: TagSheet «“mo” matches» без строки Create (решение
  владельца); список из 8 тегов вместо 6; «Created and checked» без метки
  `new` (уходит в `fix-2.3`); ConditionPicker с зазорами Sheet 12 вместо 8.

- 2.3-organisms-b: Drawer на полную высоту PhoneFrame (ячейка страницы 640),
  скрим ink 50 %; ячейки Menu в углу PhoneFrame с отступом 12; открытое у
  источника меню с фокусом на первом пункте.

- 2.3-organisms-d: верхний отступ баров 10 вместо 12 (итог 98); pressed/focus
  TurnBar без ячеек на странице.

- 2.3-organisms-a: Sheet и Dialog в PhoneFrame поверх скрима ink 50 %, не на
  стадии `#8C8578`; Dialog с фокус-кольцом на Cancel; Sheet-истории с кликом —
  с кольцом на кнопке.

- 2.2-molecules-e: Toast-истории внутри PhoneFrame, не на канвасе; `undone` без
  Redo (vision, errata); EmptyState на канвасе 358 с телом до 280.

- 2.2-molecules-c: ячейки на канвасе со сценой, копирующей сцену ячейки, без
  подписей; HpBox `ExtraClick`/`ExtraKeyboard`/`ExtraDisabledStillOpens` с
  фокус-кольцом после взаимодействия.

- 2.2-molecules-d: InitiativePopover со знаком `+15` (уходит в `fix-2.2`); de/fr
  заголовки отличаются от en; NoteField «Field, editing» без каретки.

- 2.2-molecules-b: CardActions `Open: *` и `* · unit menu` без панели Menu
  (организм 2.3); CheckList строка Create внизу в размере строки, страница
  хардкодит 48/16.

- 2.2-molecules-a: Segmented `Role · de/ru/fr` — выбранный Ally зелёный, не ink;
  `ExtraOptionDisabled` заканчивается с фокус-кольцом на Enemy.

- fix-2.1: ThemeAudit одной колонкой, свотчи 12 px по 4 в ряд (conditions по
  3), длинные имена токенов с многоточием; TextField `type="email"/"password"`
  — нет на странице, бокс M 48.
- 2.1-atoms-d: без карточки-подложки галереи; засечка RoleBlock на крае
  блока (в прототипе нет `position: relative`); focus-кольца RoleBlock
  (снаружи, offset 2) и EscalationDie не показаны в рендере.
- 2.1-atoms-c: подложка ячеек — фон канваса, не белая плитка страницы; Extra
  истории с кликом/табом показывают hover/focus; Swatch цвет 8 `#6E685F` по
  странице Swatch (меняется на `#8C8578` в `fix-2.1`).
- 2.1-atoms-b: focus-ячейки без каретки; NumberField показывает набранный 0
  чернилами (страница красит falsy значение muted, ячейки с 0 нет).
- 2.1-atoms-a: focus-ячейки без каретки (реальный фокус делает baselines
  нестабильными); счётчики показывают реальную длину значения, не моковые числа
  страницы; `Description · 500 · error` — реальные 512 символов, поле ~16
  строк вместо 2 обрезанных на странице.
- 0.5-reference, ThemeAudit: две колонки, свотчи 14 px, подписи 9–10 px, чтобы
  уместиться в 390×844; подпись строки = ключ палитры; заметки Typefaces
  сокращены; сноска Radii/Spacing опущена. HP actions содержит `#F7E4E2` из
  README. Размеры иконок 16/20/24/32 по README, страница Tokens говорит
  18/20/22/24.
- 0.5-reference, Button: full-width edge-ячейки заполняют канвас 358 px вместо
  240 px ячейки страницы.

## Замечания guard-bee P2–P3, отложены

- 5-e2e → `fix-5`:
  - P1 functional: sign-out never signs out. `hono-client.ts:442` posts
    `sign-out` without a body or `Content-Type`, so Better Auth answers 415.
    `Account.tsx` swallows the rejection with no toast. `fix-5` sends a JSON
    body and shows the error toast on failure; the `test.fail()` in
    `e2e/auth.spec.ts` is removed, and the wrong-password test signs out
    through the UI.
  - `<html lang>` follows the interface locale (orchestrator decision: needed
    for screen readers and the CJK font fallback; set by `UiProvider`, where
    the language switches).

- fix-4 → `fix-5`:
  - P2 CombatScreen.tsx:332, :207-214: Undo on the «X removed» toast labels
    the removal but undoes whatever is newest. It must undo the removal or
    answer 409 (pin it to the removal's result version).
  - P3: `createDispatcher` gets a `generation` guard, like `mutations.ts:51`.
  - P3: `failedTags` is pruned when the tag appears in `useTags`
    (Library.tsx:141).
  - P3: a `log.test.ts` case reaches the third page; the `ROW_BOUND` bound
    matches the code.
  - P3: a double tap during the toast's exit runs its action once
    (Toast.tsx:108-111).
  - P3: `streamCombatEvents` types `load` per viewer, so a `DmCombat` cannot
    reach a player (sse.ts:14).
  - P3: on a first-load 404, PlayerView shows CombatDeleted without a title,
    not UnexpectedError (PlayerView.tsx:89-99).

- 4-web → `fix-4-web` (`apps/web/**`, `e2e/teardown.ts`,
  `packages/ui/src/organisms/MessageScreen/**`):
  - P2: the swipe over a Sheet or Dialog scrim opens the Drawer above the
    modal (`pages.tsx:58-69`).
  - P3: system screens inside DM routes accept the swipe. Orchestrator
    decision: `MessageScreen` root carries `data-system-screen`, and the app
    refuses a swipe while one is mounted.
  - P3: the errorElement test only checks config (`router.test.ts:166-169`).
  - P3: the browser language is not restored after leaving DM or player routes
    (`pages.tsx:48-56`).
  - P3: teardown removes only a directory the config created itself
    (`e2e/teardown.ts:4-5`).

- fix-4-overlays → `5-e2e`: P2 — no test opens and closes a Sheet and then
  clicks beneath it (Sheet.stories.tsx:571-582 covers only a Sheet never
  opened). A `5-e2e` scenario opens and closes a sheet (Sort on `/combats`),
  then clicks New combat; Playwright's hit-test guards the exit wiring
  (Sheet.tsx:66).

- fix-2.4 → `fix-4`:
  - P2 CombatScreen.tsx:174-181 / hooks/combat.ts:162-185: a failed
    dispatch blocks the action queue until its Retry toast settles; later
    taps wait, then burst (double Next turn).
  - P2 Heroes.tsx:127-137: rename as release + claim nulls the DM's Undo and
    races another claimer. Orchestrator decision: `authorize` accepts a
    re-claim of an own hero as a rename, and Heroes sends one `claimUnit`.
  - P3: a stale `link.get` error closes Share on retry
    (CombatScreen.tsx:148-158).
  - P3: a rejected tag create blocks Save silently (Library.tsx:176-210).
  - P3: `dmDocument` loads the whole log on every request (log.ts:78-81).
  - P3: Undo from the «removed» toast uses the pre-removal summary
    (CombatScreen.tsx:200-207).
  - P3: Account `blurred` never resets (Account.tsx:21,46).
  - P3: unit Duplicate is disabled at 99 units (orchestrator decision: as on
    CombatCard and PresetCard).
  - P3: the toast store survives `queryClient.clear()` (toasts.ts:128-135,
    already routed from fix-2.4-core).

- fix-2.4-core → `fix-4` (пачка исправлений после `4-web`; `fix-2.4` уже
  запущен, его бриф заморожен): тесты SSE — отписка во время таймера
  переоткрытия и пробы, REST 200 при отказе потока; таймаут пробы; PlayerView
  ветка `notFound` → CombatDeleted; стор тостов очищается вместе с
  `queryClient.clear()` (старый Retry не уходит под новой сессией).

- 2.4-Library → `fix-2.4`: P2 повторный Create пресета (кнопка неактивна в
  полёте, `id` один на открытие формы — как для CombatFormSheet); P2
  `duplicateDisabled` у PresetCard на лимите 1000. P3: создание тега
  дожидается ответа до сохранения формы, ошибка видна; метка «new» только у
  действительно созданного тега (TagSheet); LBF43 — Differences или лист с
  видимой формой; первый неудачный load Library — CantReachServer с Try again
  (как CombatList).

- fix-2.3 → `fix-2.4` (P3): Sheet при motion on не задерживает фокус на ×
  (фокус сразу на секции или `initialFocus`), история пишет каждый focusin;
  устаревшие группы `PlayerRow.same.txt:3`, `TagSheet.same.txt:2`; мёртвый
  ключ `NumpadSheet.close`; плеи, доказывающие `presetCount` в «Show N» и
  UnitRow `readOnly` без колбэков; HpHistory PageDown с перекрытием строки
  (или нативная прокрутка); NoteField не сохраняет при удалении ряда хостом
  (только при сворачивании). Документальный P2 (file:line в отчёте) закрыт
  списком guard-файла.

- 2.4-PlayerView → `fix-2.4`: P2 после собственного Release claim последнего
  героя открывается Heroes (vision Heroes screen: «When the player holds no
  hero after a release or removal» — решение оркестратора: любой release,
  `ExtraOwnRelease` меняет ожидание). P3: вспышка ряда по вернувшемуся
  документу, не по отправке; неудачный `releaseUnit` не остаётся в
  `ownReleases`; Heroes переходит на Turn order после успешных claims, при
  ошибке остаётся с выбором; переименование возвращающегося игрока
  отправляется по Done; отступ тоста от фактической высоты BottomBar (не 110);
  `send` типизирован `Action`; baseline ExtraCantReachServer — экран ошибки до
  Try again; недостающие Differences.

- 2.4-AppPages → `fix-2.4` (P3): тост удалённого аккаунта один раз и без
  повторов из `history.state` (StrictMode, reload/Back); Settings отмечает
  язык из `useSettings().settings`; сохранение имени в Account без дубля на
  Enter+blur, ошибка пустого имени по уходу фокуса; проверки «нет social»
  ждут ответа providers; кольца фокуса APF13/APF23/APF51–53 и лишние шаги в
  APF13/APF15 — в Differences или истории без клика; social sign-in: ошибка
  видна, повторный тап заблокирован; `About.version` из `allow-same.txt`
  убрать (de/fr «Version» — владельцу, иначе перевести).
- Падение 2026-10-17: лимит сессии API остановил fix-2.3 (юнит 27) и
  2.4-PlayerView (Heroes); после сброса оба агента продолжены через
  SendMessage с места остановки.

- 2.4-CombatList → `fix-2.4`: P2 лимит 100 боёв: отказ `limit` получает тост
  (код `limit` в `API_ERROR_CODES` и маппинг в `errorToast`, FakeApiClient
  отвечает тем же кодом), Duplicate в меню CombatCard неактивен на лимите
  (проп `duplicateDisabled`); P2 повторный Create: кнопка формы неактивна, пока
  запрос в полёте, `id` нового боя создаётся один раз на открытие формы. P3:
  Retry после сетевой ошибки закрывает лист и ведёт на новый бой (вместе с
  пунктом Retry из 2.4-api-hooks); `withApi` заменяет сценарий истории
  целиком, а не сливает с meta; CombatFormSheet без постоянного `opened`
  (переход выхода).

- 2.4-api-hooks → `fix-2.4`: P2 поток SSE на не-200 закрывается браузером
  навсегда (hono-client.ts:312-320, :286-288): 401 на пробе — конец сессии,
  `onEnd`-событие или ошибка `unauthorized` ведёт на вход; прочие статусы —
  клиент сам переоткрывает EventSource с задержкой, `reconnecting` до успеха.
  P2 смена аккаунта: sign-out, sign-in и удаление аккаунта очищают
  `QueryClient` целиком (`queryClient.clear()`), `useCombat` не отдаёт
  документ после неудачного рефетча чужой сессии (account.ts:27-33,
  :51-54; useCombat.ts:72). P3: `combats.open` при каждом входе на экран боя
  (lastPlayedAt, combat.ts:89-90); Retry в тосте возвращает результат
  повторного вызова вызывающему (навигация после create и socialSignIn,
  mutations.ts:26-28); сброс `ended` при смене `id`/`viewer`/`token`; один
  наблюдатель соединения на `ApiProvider`; `settings.update` инвалидирует
  сессию; тест «first connect» offline → connected; `SocialProvider` из
  `@combat-planner/api/client`; экранная история выше 844 проверяет
  full-height снимок.

- 2.3-NumpadSheet → `fix-2.3` (единица NumpadSheet): Set Temp с суммой 0
  очищает temp HP (правило страницы NP-4; решение оркестратора: 0 — набранная
  сумма, Damage/Heal/Set Max при 0 неактивны); сброс суммы после применения
  (двойной тап во время выхода); `data-tap` не закрепляет превью; цвет
  нажатия Button у кнопок действий; проверка всех клавиш 0–9; Space на
  действии; истории шагов флоу, если их потребует новый `check-stories`.
  Перевод квадрата роли в языковых историях — как решение по UnitRow
  (переключается вся локаль), принято.

- 2.3-UnitForm → `fix-2.3` (finding 2 — первым, поведение): выбранный пресет
  сбрасывается при смене вкладки и фильтра, кнопка «Add <имя>» отправляет
  ровно то, что названо (UnitForm.tsx:135, :182-188, :105-117); 9 из 22
  baselines — пустой телефон (истории закрывают лист до снимка): истории
  ошибки имени, lockRole, клампа и конца флоу снимают открытый лист, отправка
  — отдельной Extra-историей; рамка пустого имени в Edit — #E2D8C6, не через
  `:placeholder-shown` (UnitForm.module.css:23); Stepper `.key:disabled` —
  фон `minBg #FAF6EE` по странице UnitForm (dc.html:169); мёртвый
  `data-long` (UnitForm.tsx:260).

- 2.3-UnitRow → `fix-2.3`: `[data-flash]` не красит рамку у мёртвых и
  disabled рядов (UnitRow.module.css:23, порядок страницы active > off >
  flash); `aria-label` «Roll initiative» на ролевом блоке
  (UnitRow.tsx:172-184); InitiativePopover исключает свой триггер из
  закрытия по внешнему pointerdown, как Menu (InitiativePopover.tsx:57-63);
  колбэки UnitRow опциональны при `readOnly` (UnitRow.tsx:52-68); пункт
  NoteField одного экземпляра (уже в `fix-2.3` для PlayerRow) покрывает и
  UnitRow (UnitRow.tsx:223-225, :285). P3 о гейте до финального rebase:
  `merge.sh` после rebase сравнивает код и отказывает с «CODE DIFF AFTER
  REBASE, re-gate», так что неотгейтованный код не сливается.

- fix-2.3-organisms-i, вне scope, гипотеза → бриф `fix-2.4` на решение
  оркестратора: `project.ts:35-38` отдаёт HP, защиты и заметку захватившему
  игроку до проверки `enemy`; в валидных состояниях утечки нет (захват только
  у героев, смена роли снимает захват), PlayerRow — второй рубеж. Порядок
  проверок в `project` поменять, если `fix-2.4` касается domain.
- Оркестратор: `merge.sh` удаляет ветку и worktree до guard-bee (CLAUDE.md
  Integration, шаг 6 — после чистого guard). fix-пачка после P0–P1 создаётся
  с нового worktree от `master`, так что удаление раньше ничего не теряет;
  порядок остаётся.

- 2.3-organisms-f → `fix-2.3`: P3 обход `min-height` RoleBlock есть и в
  PresetCard (PresetCard.module.css:23-27) — пункт RoleBlock в `fix-2.3`
  чистит PlayerRow, UnitRow и PresetCard; после уникальных имён экспорта в
  `check-stories.mjs` HpHistory переименовывает `EdgeCases*`/`ExtraRussian*`
  и убирает проверку отсутствия русского текста в ja-историях
  (HpHistory.stories.tsx:352,364); история «long list scrolls by keyboard»
  нажимает клавишу и проверяет `scrollTop` (HpHistory.stories.tsx:514-533).
  P3 трейлер Opus 5.5 против CLAUDE.md — уже в вопросах владельцу.

- 2.3-organisms-e → `fix-2.3`: P2 CombatHeader.tsx:139/155 — Enter в поле
  раунда (Stepper `blur()`) уводит фокус в `<body>`, поповер не закрывается,
  Escape не работает, фокус не возвращается на кнопку раунда (то же при − / +
  на границе); история с Enter. P3: Escape в поповере раунда коммитит
  набранное значение через blur (CombatHeader.tsx:142-143) — Escape не
  меняет раунд, как у кубика; `escalationValues` из `LIMITS.escalation`, не
  литерал `[0..6]`, `pipSlots` не копирует EscalationDie (CombatHeader.tsx:62-72);
  кольцо open через `data-tap` атома, не `[data-tile]`
  (CombatHeader.module.css:117-122); доступное имя кубика со значением
  (CombatHeader.tsx:359). P2 владельцу: пункт Add unit в меню боя (страница и
  рендер есть, vision.md:179, :201 нет) — уже в правках vision между фазами.

- fix-2.3-organisms-b, P3 → `fix-2.3`: Menu фокусирует первый пункт и при
  повторном открытии во время выходного перехода (`opened` false → true);
  Menu внутри Sheet — пункты с `data-mantine-stop-propagation`, Escape
  закрывает только меню; истории Drawer ждут фокус до Escape
  (ExtraScrollLock, ExtraFocusReturn); начальный фокус Drawer без захода на
  Combats; одна блокировка прокрутки для Dialog и Drawer через Mantine
  RemoveScroll (или общий счётчик); кольцо `[data-open]` у вариантов
  IconButton без рамки; story-only ключи `opener` в Sheet и Dialog удалить.

- 2.3-organisms-h: P3 → `fix-2.3`: `onCopy` ShareSheet возвращает
  `Promise<boolean> | void`, «Copied» только при успехе. P3 → бриф
  `2.4-CombatScreen`: `onReissue` открывает Dialog «Revoke the link?», перевыпуск
  только по подтверждению (тест). P3 владельцу: CLAUDE.md:59 требует трейлер
  `Claude Fable 5.1`, а с 2026-10-17 агенты работают на Opus 5.5 и подписывают
  коммиты `Claude Opus 5.5` (смешанные трейлеры в истории; `check-commit.sh`
  трейлер не проверяет). Раздел Commits CLAUDE.md заморожен — правка за
  владельцем.

- fix-3, P3 отложено: тест «`project()` throws» строит фикстуру из удалённого
  боя (events.test.ts:227); ветка суррогатов `clampDisplayName` без теста.
  Фаза 3 закрыта тегом `phase-3` на b6f2a91 (гейт `fix-3` прошёл ровно на этом
  дереве и служит фазовым гейтом).

- 2.3-organisms-c → `fix-2.3`: пункт меню игрока — иконка страницы
  `IconSwitchHorizontal` с подписью «Heroes» (решение оркестратора: иконка по
  странице, подпись по vision), история Menu «Player menu» переходит на ключ
  heroes; удалить мёртвый экспорт `PlayerHeaderMenuItem`. → `4-web`:
  `--cp-layout-status-bar` в приложении задаётся явно (`0px` или
  `env(safe-area-inset-top)`), чтобы заголовки и Sheet не расходились
  (заголовки по умолчанию резервируют 44, Sheet — 0).

- fix-2.3-organisms-a → `fix-2.3`: P2 при motion on начальный фокус Sheet
  уходит на первый tabbable, а не на секцию (Sheet.tsx:34-38; фокус из
  `onEnterTransitionEnd` или ref-callback Content, история motion on из
  закрытого состояния); P3 fr `_one` покрывает 0 («L'unique unité…» для
  пустого боя, Dialog.json:8,:20); P3 блокировка прокрутки Dialog через
  `body.style.overflow` вместо RemoveScroll.

- 2.3-organisms-g → `fix-2.3`: P2 двойное tap-кольцо в baseline
  ConditionPicker «Tap: adding weakened» (`data-tap` на `<label>` Checkbox
  включает и кольцо метки; ConditionPicker.stories.tsx:58,
  Checkbox.module.css:85) — подавить кольцо метки в строках пикера или другой
  атрибут, перегенерировать baseline; P2 история TagSheet «Close and Escape…»
  не жмёт Escape; P3 поиск TagSheet не сбрасывается при закрытии; P3 «Show
  all» при активном фильтре без `presetCount`. P3: ячейки «Variants: trigger»
  страницы ConditionPicker принадлежат UnitRow и PlayerRow (брифы
  `2.3-UnitRow`, `2.3-organisms-i` дополнены до запуска).

- 2.3-organisms-d, P3 → `fix-2.3`: ключ и история причины «Add a unit first»
  в `TurnBar`; `[data-disabled]` второй строки TurnBar; `onClick` обязателен
  у BottomBar; геометрия в историях через `layout.*`; `layout.ts`
  `bottomBar.padding.top` 12 → 10 (итог 98). Подсказка лимита пресетов —
  бриф `2.4-Library`. Vision (Active, «reason instead of its label») расходится
  со страницей TurnBar — сборка по странице; правка vision — между фазами.

- 3-server-rest → `fix-3`: P2 лимит display name только в `PATCH /account`
  (sign-up, `/update-user`, social не ограничены, клиент падает на
  `sessionSchema`); P2 (гипотеза) нет `trustedOrigins` — sign-in под `pnpm dev`
  с 5173 получает 403; P3 wildcard открывает `/change-password`; P3 типы
  `AuthRoutes` вручную. Вне scope → `2.4-api-hooks`: в `ApiClient` нет social
  sign-in и списка настроенных провайдеров (vision Account).

- fix-2.2, P3 → `fix-2.3`: `inputMode` Stepper по `min < 0`, не по `signed`
  (Stepper.tsx:121; InitiativePopover с min −9 стал `numeric`); `ExtraReadOnly`
  HpBox — шпион не доходит до компонента; `ExtraEmpty` Stepper без шага − от
  `null`.

- 3-server-live → пачка `fix-3` (после `3-server-rest`): P2 утечка подписки и
  интервала при раннем abort (sse.ts:53, `if (signal.aborted)`); P3 `ended` до
  записи финального события (sse.ts:44-46); P3 `finish` при исключении в
  `load()`/`project()` (sse.ts:54); P3 тест heartbeat без проверки «нет до
  15 с». P2 → бриф `2.4-api-hooks`: `EventSource` закрывается навсегда на
  410/404 стрима, клиент висит в «Reconnecting…» — при `error` клиент
  проверяет `play.get`/`combats.get` и маппит 410/404 в `onEnd`
  (`linkRevoked`/`deleted`), и для DM-стрима тоже.

- 2.2-molecules-e, P2 → `fix-2.2`: `ExtraKeyboard` Toast — Space на Dismiss
  ничего не проверяет (Toast.stories.tsx:166-169). P3 → `fix-2.2`: таймер
  автоскрытия при `motion: 'off'` (Toast.tsx:77-81). Решение оркестратора: ключ
  `Toast.show` и тексты тостов из vision остаются в неймспейсе `Toast`; хост
  2.4 (`useToasts`, экраны) берёт копию оттуда, не дублирует.

- 2.2-molecules-c, P3 → `fix-2.2`: HistoryRow Chip `variant="condition"` без
  `condition` даёт `data-condition="fear"` на каждом чипе (HistoryRow.tsx:72-76);
  `i18n.language` вместо `resolvedLanguage` (HistoryRow.tsx:66); `ExtraReadOnly`
  HpBox без `fn()`-шпиона. P3 владельцу: `/max` старых строк истории показывает
  текущий max (`HpHistoryEntry` без max); `HistoryRow.temp/.max/...` в
  allow-same для de.

- 2.2-molecules-d, P3 → `fix-2.2`: InitiativePopover `{...rest}` перед
  `onKeyDown` (InitiativePopover.tsx:80-85); `IconNote` с `aria-label` без
  `role="img"` (NoteField.tsx:69). P3 отложено: `label?` у NoteField сверх
  брифа; ключи `NoteField.collapseRow` и `InitiativePopover.anchor` нужны только
  историям.

- 2.2-molecules-a, P3 → `fix-2.2`: Segmented с `value` вне опций делает все
  сегменты `tabIndex=-1` (Segmented.tsx:47-51, нужен guard
  `selectedIndex >= 0`). Stepper коммитит на blur/Enter (закрыто в `fix-2.2`);
  `RadioList.alphabetical` `A–Z` в de/es/fr через allow-same — владельцу;
  RadioList-истории берут `localeNames` из `storybook/withLocale.tsx` — экран
  Settings (2.4) получает свой источник имён локалей.

- 3-server-actions, P3 отложено (все семь): копия боя хранится с `version 0`
  против `1` у создания (routes.ts:116, источник — `copyCombat`); `loadLog`
  читает весь лог на каждый undo; `ApiAppEnv.userId` не опционален; `PATCH {}`
  бампает версию; 403 игрока доказан на уровне `dispatch` — `3-server-live`
  добавляет тест маршрута `POST /play/:id/actions`; `hono-client.ts` импортирует
  `hono/hono-base` и `hono/utils/types`; `requireUser` навешен трижды под
  `/combats`.

- fix-2.1, P2 (документарно): в `.claude/artifacts/reports/fix-2.1.md` закрытия
  P2 NumberField и RoleBlock без file:line — закрытия подтверждены в guard-файле.
  P3 → `fix-2.2`: mousedown по иконке SearchField не фокусирует инпут
  (SearchField.tsx:47, нужен `event.target === inputRef.current` как в
  NumberField/TextField). P3 для брифов 2.2+: TextField по умолчанию
  `maxLength = LIMITS.unitName` (40) — поля заголовка передают `maxLength`
  явно.

- fix-1-api-contract, P3: имя типа `Link` в `@combat-planner/api` может
  столкнуться с `Link` роутера; `LinkReissueResult` `{ token, version }` против
  `Link` `{ token, generation }`; memory-клиент в тесте не эмитит переходы
  соединения (это делает `FakeApiClient` в 2.4).

- 0-toolchain, P3: `check-commit.sh` исключает `pnpm-lock.yaml` и
  `**/__screenshots__/**` из лимита 1500 строк; CLAUDE.md Checks об этом не
  говорит. Решение оркестратора 2026-10-16: исключение остаётся.
- 0-toolchain, P3: `check-commit.sh` принимает `CLAUDE.md` только в единице
  `CLAUDE.md commands`; бриф `0.5-reference` велит расширить на `check scripts`.
- 0-toolchain, P3: проверка имени единицы — `grep -qF` по плану и брифам,
  подстрока прозы проходит.
- 0-toolchain, P3, гипотеза: JsxText, начинающийся с `//`, будет сочтён
  комментарием `check-comments.mjs`.
- 0-toolchain, P3: гейт пачки шёл под Node 22 (скрипт оркестратора вызвал
  `nvm use` до входа в worktree); phase-gate перезапущен под Node 24.

- 0.5-reference, P3, в `fix-2.1`: селектор pressed у Button
  `&:active:not(:disabled)` вместо литерала CLAUDE.md; `PhoneFrame` не резервирует
  44 px под статус-бар для историй без заголовка (полноширинная кнопка
  закрывает «9:41»); лишний проп `type` у Button; `ThemeAudit` `columns: 2`
  меняет визуальный порядок групп; `.sampleUse` скрыт, но рендерится; stale
  baseline `Hello` — удалить `Hello` целиком; `Button` не экспортирован из
  `index.ts` (экспорты собирает `fix-2.4`).

- 1-domain-core, P2 → пачка `fix-1-domain-core` после `1-domain-rest`:
  `setMaxHpOf` оставляет HP ниже `−newMax` (reduce.ts:166, тот же путь через
  `editUnit`); P3: `copyCombat` сбрасывает `disabled` (vision не перечисляет
  его среди сбросов — копия сохраняет `disabled`); P3: тесты «Depth: 10 steps
  back…» проверяют только константу — `1-domain-rest` покрывает поведение.

- 2.1-atoms-a, P1 → `fix-2.1`: TextField многострочные ячейки `Name, ru` 94 px
  вместо ~74 (padding по вертикали 10.4 px; нужен wrapper min-height 48 +
  `align-items: center` вокруг textarea без padding). P3: `ActiveEn` в
  ToolButton с литералом вместо `labelKey`; `aria-multiline="false"` на
  `<textarea>` (гипотеза: запрещено ARIA in HTML).
- 1-domain-rest, P-уровень guard ещё не выставлен; вопрос 3 отчёта →
  `fix-1-domain-core`: `project` обнуляет `activeUnitId`, если активный юнит
  скрыт от игрока.

- 1-domain-rest, P3 → `fix-1-domain-core`: документ игрока не несёт
  `linkGeneration` (schemas.ts:166-169, project.ts:47); имя теста
  undo.test.ts:254 «with its claim» не соответствует телу. P3 отложено:
  `check-domain-tests.mjs` принимает `it('<name>')` с любым телом.

- 2.1-atoms-b → `fix-2.1`: P2 NumberField ширина инпута держится только на
  `field-sizing: content` (нужен `size` или ширина в ch); P3 SearchField
  `placeholder=""` даёт `aria-label=""`; P3 `cursor: text` на рамке
  SearchField/NumberField без проброса клика в инпут.

- 1-api-contract, P1 ×2 → `fix-1-api-contract`: нет метода чтения текущего
  токена ссылки (`link.get`); `subscribe` не даёт `ConnectionState`
  (`connection.state/subscribe`). P3 отложено: язык игрока только в `play.get`
  (смена языка DM доходит на refetch); `combats.subscribe` принимал viewer
  игрока без токена — параметр убран.
- fix-1-domain-core, вопрос отчёта: `duplicateUnit` по-прежнему сбрасывает
  `disabled` — принято (vision Unit → Actions молчит).

- 2.1-atoms-c, P2 (гейт): `gate.sh` не гонял проект `visual`; с 2026-10-16
  гейт запускает `vp test --project visual` (baselines локального Chromium).
  P3 → `fix-2.1`: Enter/Space на toggle-теге Chip не проверены;
  `&[data-pressed]` перекрывает заливки condition/status/meta.

- 2.1-atoms-d → `fix-2.1`: P2 play RoleBlock `ActiveTurn` без проверки текста,
  `DMEditable`/`Tap`/`Preset320HP`/`Preset999HP` без проверки заливки; P3 `Tap`
  сравнивает с `base.accent` вместо `interaction.tapMarker`; P3 проп `role`
  затеняет ARIA `role` → `unitRole`.

- 3-server-schema, P3 отложено: `JSON.parse(event.data)` в `hono-client.ts:330`
  вне `safeParse` — битый SSE-payload бросает в слушателе (в `3-server-live` или
  `fix-3`). Оркестратор после каждого merge запускает `pnpm install
  --frozen-lockfile` в основном checkout для guard-bee.

## Падения гейта

- 2.3-organisms-i: `pnpm test` (iframe не поднялся, «failed to find the
  runner») и `visual` («Failed to fetch dynamically imported module») упали на
  импорте; повторы прошли (1234 и 807 тестов). Падения импорта после rebase
  стали частыми — `fix-2.3` добавляет зависимости в `optimizeDeps.include`.

- 2.3-organisms-h: `pnpm test` (импорт stories) и `visual` («Failed to fetch
  dynamically imported module» visual.test.tsx — Vite оптимизировал
  `react-qr-code` посреди прогона) упали на импорте; оба повтора прошли (1204
  и 777 тестов). `gate.sh` теперь повторяет и `visual` один раз.

- 2.3-organisms-c, `pnpm test`: CardActions.stories.tsx не импортировался
  («Failed to fetch dynamically imported module» setup-file addon-vitest —
  переоптимизация Vite после новой зависимости). Повтор прошёл: 65 файлов,
  1152 теста.

- 3-server-actions, `pnpm test`: 12 stories-файлов упали на импорте «Vitest failed
  to find the current suite» после rebase (тот же кэш Vite, что у 1-domain-core).
  Повтор прошёл: 36 файлов, 683 теста.

- 2.1-atoms-d, шаг `visual`: 1 из 359 — `Hello > Default`, известный stale
  baseline (390×57 против 390×88), уходит с удалением `Hello` в `fix-2.1`.
  Остальные 358, включая все EscalationDie и RoleBlock, прошли; гейт принят.

- 1-domain-core, `pnpm test`: три stories-файла упали на импорте «Vitest failed
  to find the current suite» после rebase (кэш оптимизации Vite в
  `node_modules/.cache/storybook` перестроился посреди прогона). Повтор прошёл:
  15 файлов, 224 теста (`.claude/run/1-domain-core/test-rerun.log`). `gate.sh`
  теперь повторяет `pnpm test` один раз при падении.
