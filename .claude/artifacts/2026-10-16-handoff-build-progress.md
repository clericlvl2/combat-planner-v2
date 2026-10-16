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

Фазы 0, 0.5 и 1 закрыты тегами `phase-0`, `phase-0.5`, `phase-1`. Идёт фаза 2.1:
`2.1-atoms-a`, `2.1-atoms-b` слиты и проверены, `2.1-atoms-c` на гейте,
`2.1-atoms-d` строится. Далее `fix-2.1` (один агент), затем молекулы 2.2 по две
параллельно. Гейт на этой машине идёт с `COMBAT_PLANNER_NO_DOCKER=1`.
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
| fix-2.1 | running worker-bee 2026-10-16T18:52:07+03:00 | |
| 2.2-molecules-a | todo | Stepper, Segmented, RadioList |
| 2.2-molecules-b | todo | CheckList, SwatchRow, CardActions |
| 2.2-molecules-c | todo | HpBox, HistoryRow, DefenseLine |
| 2.2-molecules-d | todo | NoteField, InitiativePopover |
| 2.2-molecules-e | todo | Toast, EmptyState |
| fix-2.2 | todo | |
| 2.3-organisms-a | todo | Sheet, Dialog |
| 2.3-organisms-b | todo | Menu, Drawer |
| 2.3-organisms-c | todo | PageHeader, PlayerHeader |
| 2.3-organisms-d | todo | BottomBar, TurnBar |
| 2.3-organisms-e | todo | CombatHeader, CombatCard |
| 2.3-organisms-f | todo | PresetCard, HpHistory |
| 2.3-organisms-g | todo | ConditionPicker, TagSheet |
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
| 3-server-schema | rebased, report `.claude/artifacts/reports/3-server-schema.md`, gate running | schema, migrations, client-hono, server main |
| 3-server-actions | todo | combats routes, actions route, link |
| 3-server-live | todo | events route, play routes |
| 3-server-rest | todo | auth, presets, tags, settings, account |
| 4-web | todo | router, providers, player identity, drawer, smoke e2e |
| 5-e2e | todo | auth, combat lifecycle, player, library, account |
| 6-docker | todo | Dockerfile, compose, README |

## Вопросы владельцу

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

## Падения гейта

- 2.1-atoms-d, шаг `visual`: 1 из 359 — `Hello > Default`, известный stale
  baseline (390×57 против 390×88), уходит с удалением `Hello` в `fix-2.1`.
  Остальные 358, включая все EscalationDie и RoleBlock, прошли; гейт принят.

- 1-domain-core, `pnpm test`: три stories-файла упали на импорте «Vitest failed
  to find the current suite» после rebase (кэш оптимизации Vite в
  `node_modules/.cache/storybook` перестроился посреди прогона). Повтор прошёл:
  15 файлов, 224 теста (`.claude/run/1-domain-core/test-rerun.log`). `gate.sh`
  теперь повторяет `pnpm test` один раз при падении.
