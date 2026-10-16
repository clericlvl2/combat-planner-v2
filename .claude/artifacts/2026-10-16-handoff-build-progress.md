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
| 2.4 | хуки, экраны | 2.4-api-hooks, 2.4-CombatScreen, 2.4-CombatList, 2.4-PlayerView, 2.4-Library, 2.4-AppPages, 2.4-SystemScreens, fix-2.4 | |
| 3 | сервер | 3-server-schema, 3-server-actions, 3-server-live, 3-server-rest | |
| 4 | web | 4-web | |
| 5 | e2e | 5-e2e | |
| 6 | docker | 6-docker | |

## Текущий шаг

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
| 2.3-organisms-a | rework 1 → `fix-2.3-organisms-a`, guard `.claude/artifacts/guard/2.3-organisms-a.md` (P1 Sheet focus escapes on Shift+Tab) |
| fix-2.3-organisms-a | rebased, report `.claude/artifacts/reports/fix-2.3-organisms-a.md`, gate running | Sheet, Dialog |
| 2.3-organisms-b | rework 1 → `fix-2.3-organisms-b`, guard `.claude/artifacts/guard/2.3-organisms-b.md` (P1 Drawer Shift+Tab, P1 Menu focus with motion on) |
| fix-2.3-organisms-b | todo, brief ready, next builder slot (before e/f, which compose Menu) | Menu, Drawer |
| 2.3-organisms-c | running worker-bee 2026-10-17T03:10+03:00 | PageHeader, PlayerHeader |
| 2.3-organisms-d | guarded `.claude/artifacts/guard/2.3-organisms-d.md` | BottomBar, TurnBar |
| 2.3-organisms-e | todo | CombatHeader, CombatCard |
| 2.3-organisms-f | todo | PresetCard, HpHistory |
| 2.3-organisms-g | guarded `.claude/artifacts/guard/2.3-organisms-g.md` (CRIT 2 fail at P2, story baseline → `fix-2.3`) | ConditionPicker, TagSheet |
| 2.3-organisms-h | todo | SortSheet, ShareSheet |
| 2.3-organisms-i | todo | MessageScreen, PlayerRow |
| 2.3-UnitRow | todo | UnitRow |
| 2.3-UnitForm | todo | UnitForm |
| 2.3-NumpadSheet | todo | NumpadSheet |
| fix-2.3 | todo | |
| 2.4-api-hooks | todo | ApiProvider, FakeApiClient, useCombatList, useCombat, usePresets, useTags, useSettings, useAccount, useToasts, useConnection |
| 2.4-CombatScreen | todo | CombatScreen |
| 2.4-CombatList | todo | CombatList |
| 2.4-PlayerView | todo | Heroes, TurnOrder |
| 2.4-Library | todo | Library |
| 2.4-AppPages | todo | SignIn, SignUp, Settings, Account, About |
| 2.4-SystemScreens | todo | NotFound, UnexpectedError, CombatNotFound, LinkExpired, CombatDeleted, CantReachServer |
| fix-2.4 | todo | |
| 3-server-schema | guarded `.claude/artifacts/guard/3-server-schema.md` | schema, migrations, client-hono, server main |
| 3-server-actions | guarded `.claude/artifacts/guard/3-server-actions.md` | combats routes, actions route, link |
| 3-server-live | guarded `.claude/artifacts/guard/3-server-live.md` (P2 ×2 → `fix-3`, 2.4-api-hooks; P2 outside scope → owner) | events route, play routes |
| fix-3 | running worker-bee Opus 5.5 xhigh 2026-10-17T02:55+03:00 | live, auth |
| 3-server-rest | guarded `.claude/artifacts/guard/3-server-rest.md` (P2 ×2 → `fix-3`) | auth, presets, tags, settings, account |
| 4-web | todo | router, providers, player identity, drawer, smoke e2e |
| 5-e2e | todo | auth, combat lifecycle, player, library, account |
| 6-docker | todo | Dockerfile, compose, README |

## Вопросы владельцу

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
