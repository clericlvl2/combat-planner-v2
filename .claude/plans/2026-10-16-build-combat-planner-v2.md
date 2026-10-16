# Plan: Build Combat Planner v2

Собрать приложение целиком по `docs/vision.md` и `docs/design/handoff/` за один прогон
агентов, без владельца между фазами. Владелец получает одно сообщение в конце.

## Источники

- `docs/vision.md` — закон для поведения, данных, стека, архитектуры.
- `docs/design/handoff/` — закон для визуала, раскладки, дерева компонентов, состояний.
  Вход `Styleguide.dc.html`, правила `README.md`, токены `Tokens.dc.html`, размеры
  `Baselines.dc.html`. Файлы хэндоффа только читаются, не правятся.
- Не источник: `docs/archive/` (прежний vision, брейншторм, рабочие заметки дизайна).
- Расхождение хэндоффа с vision.md, где оба описывают одно и то же по-разному, агент
  не решает: записывает в прогресс-файл под «Вопросы владельцу» и останавливает фазу.
  Оркестратор задаёт вопрос владельцу и ждёт.

## Решения владельца, зафиксированные 2026-10-16

- Эскалация растёт на 1 при переходе на новый раунд, максимум 6.
- Set Temp заменяет temp HP. Heal не поднимает HP выше Max.
- Duplicate юнита ставит копию сразу под оригиналом с именем `<name> 2`, `<name> 3`.
- Копия боя: `<title> (copy)`, Setup, полные HP, без temp HP, состояний, инициативы,
  захватов, ссылки, лога и даты last played.
- Тег до 24 символов, совпадение без учёта регистра, написание существующего тега
  переиспользуется.
- Удаление пресета не меняет юнитов в боях.
- Save as preset копирует имя, тип, Max HP, AC, PD, MD, бонус инициативы.
- Если героя заняли, пока игрок выбирал, — тост и неактивный Join.
- События DM приходят игроку тостами; отозванная ссылка и удалённый бой — экраном.
- Подпись сортировки по дате открытия: «Last played».
- Тексты тостов, диалогов, пустых состояний и About пишут агенты на английском и
  переводят на de, es, fr, ja, ru. Владелец правит после.
- Коммит после каждой зелёной фазы.
- Ревью между фазами: только `guard-bee` по критериям этого плана.
- Запуск сборок, тестов, Storybook, dev-серверов и Docker разрешён на весь прогон.
- Не делать: тёмную тему, десктопную раскладку, redo, сброс пароля, офлайн, дизайн
  состояний загрузки (загрузка — пустой экран, без индикатора).
- Из стека убраны dnd-kit (ручного порядка боёв нет, других перетаскиваний нет) и
  `@storybook/addon-themes` (одна тема).
- Расхождения хэндоффа и vision.md разобраны до старта, решения внесены в
  `docs/vision.md`; таблица в
  `.claude/artifacts/2026-10-16-report-handoff-vs-vision-discrepancies.md`.
  Где хэндофф и vision.md теперь расходятся (игрок правит инициативу и в Active,
  несколько героев у игрока с чекбоксами на экране Heroes, Edit у своей строки
  игрока, бонус инициативы в форме пресета, About с дополнительными строками,
  тост Undo без Redo), агенты строят по vision.md, беря ближайший компонент
  хэндоффа.

## Модель исполнения

Правила веток, коммитов и общих файлов для агентов: корневой `CLAUDE.md`.

- Оркестратор (главная сессия) не пишет код. Он создаёт worktree и ветку на
  агента, запускает агентов, гоняет гейт, вливает ветки в `master`, ставит теги,
  ведёт прогресс-файл.
- Исполнитель: `worker-bee`. Бриф агенту: путь worktree, раздел этого плана,
  список его единиц работы (компоненты, модули), список файлов хэндоффа для
  чтения, список путей, которые можно трогать, команды проверки перед коммитом.
- Единица работы агента — пачка из 5–7 компонентов или 2–4 модулей. Внутри уровня
  пачки идут параллельно, каждая в своём worktree.
- Интеграция пачки: агент делает `git rebase master` и отчитывается; оркестратор
  гоняет полный гейт на ветке, затем `guard-bee` сверяет коммиты ветки с
  критериями фазы; P0–P1 возвращаются агенту тем же брифом; после зелёного гейта
  `git merge --ff-only` в `master`, ветка и worktree удаляются.
- Гейт, все четыре команды зелёные: `pnpm check`, `pnpm test`,
  `pnpm storybook:build`, `pnpm build`. Точные команды закрепляет фаза 0 в
  корневом `CLAUDE.md`; остальные фазы используют их без изменений.
- После последней пачки фазы: полный гейт на `master`, тег `phase-<N>`.
- Прогресс-файл `.claude/artifacts/2026-10-16-handoff-build-progress.md`: таблица
  фаз и чеклисты единиц работы. Статус единицы выводится из `git log master` и
  диска (папка компонента с кодом, историями и скриншотами), не со слов агента.
  Оркестратор обновляет файл после каждого отчёта и каждого слияния. После
  автокомпакта оркестратор читает план и прогресс-файл и продолжает с первой
  незавершённой единицы.
- Агент, чей отчёт не пришёл, перезапускается с тем же брифом в том же worktree:
  коммиты сохранены, незакоммиченное отбрасывается `git checkout -- .`.

## Версии

Node 24 (`.nvmrc`), pnpm 10, React 19, Vite+ `vp` ^1.1, TypeScript 5, Mantine 9,
Storybook 10, Vitest через `vp test`, Playwright (версия, под которую есть образ
`mcr.microsoft.com/playwright:v<X>-noble`), Hono 4, Zod, Drizzle ORM, better-sqlite3,
Better Auth. Точные версии ставятся как последние стабильные на момент фазы 0 и
записываются в корневой `CLAUDE.md`. Если `vp` не умеет какую-то операцию, она
делается инструментом, который `vp` оборачивает (vitest, oxlint, tsc), через
конфигурацию `vp`; второй параллельный тулчейн не заводится.

## Фаза 0 — монорепо и тулчейн

Один агент.

Создать:

- `pnpm-workspace.yaml`, корневой `package.json` со скриптами `check`, `test`,
  `storybook`, `storybook:build`, `build`, `dev`, `screenshots:update`, `e2e`.
- `.nvmrc` = `24`, `.npmrc` (`shamefully-hoist=false`), `.editorconfig`.
- `tsconfig.base.json`, по `tsconfig.json` в каждом пакете, project references.
- `vite.config.ts` в корне или по пакетам (как требует `vp`) с Vitest-проектами:
  `unit` (domain, api, server), `storybook` (addon-vitest, browser provider
  `playwright()` из `@vitest/browser-playwright`, `setProjectAnnotations` в
  `setupFiles`), `visual` (скриншоты по composed stories, baselines в
  `packages/ui/__screenshots__/`, обновление через скрипт `screenshots:update`,
  который гоняет проект `visual` внутри закреплённого Docker-образа Playwright).
- `packages/domain`, `packages/api`, `packages/ui`, `apps/web`, `apps/server` —
  скелеты с `package.json`, `src/index.ts`, одним тестом или одной историей.
- `packages/ui`: Mantine 9 с `styles.layer.css`, `postcss.config.cjs`
  (`postcss-preset-mantine`, `postcss-simple-vars`), Storybook 10
  (`@storybook/react-vite`, `addon-docs`, `addon-vitest`, `addon-mcp`,
  `storybook-addon-remix-react-router`), CSF factories, `preview.tsx` с
  `MantineProvider` и i18n-декоратором с переключателем локали в тулбаре, одна
  история `Hello` со скриншотом.
- `apps/web`: Vite dev с proxy `/api` → `http://localhost:3000`.
- `apps/server`: Hono «hello», порт 3000, отдаёт `apps/web/dist` при наличии.
- Корневой `CLAUDE.md`: точные команды гейта, структура пакетов, версии, правила
  для агентов (где лежат истории, как называются, как обновлять скриншоты, что
  хэндофф и vision — закон).
- `.gitignore` дополнить тем, что требует тулчейн.

Критерии приёмки: четыре команды гейта зелёные; `pnpm dev` поднимает web и server;
`pnpm storybook` показывает историю `Hello`; скриншот `Hello` закоммичен и
воспроизводится командой `screenshots:update`.

## Фаза 1 — packages/domain

Две пачки: `1-domain-core` (types, schemas, actions, health, sort, names, reduce,
authorize) и затем `1-domain-rest` (project, undo, index, тесты по таблицам).
Коммит на модуль. Тесты — спецификация поведения; при расхождении с vision.md агент
записывает вопрос, тесты пишет по vision.md.

`packages/domain/src`:

- `types.ts`: `Combat` (`id`, `title`, `description`, `color` 0–7, `status`
  `setup|active`, `round`, `escalation`, `activeUnitId`, `lastPlayedAt`,
  `linkGeneration`, `version`, `units[]`, `players: Record<playerId, displayName>`),
  `Unit` (поля из vision.md «Unit → Fields» плюс `id`, `claimedBy`, `hpHistory[]`),
  `HpHistoryEntry` (`kind` `damage|heal|temp|max`, `amount`, `result`, `round|null`,
  `at`), `Preset`, `Tag`, `Condition` (12), `HealthStatus`, `Viewer`
  (`'dm' | { playerId }`).
- `schemas.ts`: Zod-схемы всех типов и действий, лимиты из vision.md «Limits» и
  «Unit → Fields» как константы `LIMITS`.
- `actions.ts`: дискриминированный union. Бой: `start`, `nextTurn`, `editRound`,
  `setEscalation`, `restart`, `clear`, `undo`. Юнит: `addUnit`, `editUnit`,
  `duplicateUnit`, `removeUnit`, `setDisabled`, `setInitiative`, `rollInitiative`
  (бросок в payload, сервер проверяет диапазон 1–20), `damage`, `heal`, `setTempHp`,
  `setMaxHp`, `setDefenses`, `toggleCondition`, `editNote`, `claimUnit`,
  `releaseUnit`. У каждого действия `id` (ULID), `version`. `rollInitiative` при
  `start` — массив бросков для юнитов без инициативы.
- `reduce.ts`: `apply(combat, action, author, now) → { combat, patch } | DomainError`.
  Чистая функция. Правила: порядок юнитов, пропуск disabled и dead, лимит 99,
  правила HP, Set Max обрезает HP, Set Temp заменяет, восстановление при Restart,
  Clear и удаление последнего юнита переводят в setup, переходы из таблицы
  «Transitions», причина блокировки Next turn (`nextTurnBlockReason(combat)`).
- `authorize.ts`: `authorize(combat, action, author)` — таблица «Unit → Actions»
  и правила claims.
- `project.ts`: `project(combat, viewer)` по таблице «Visibility for players»;
  disabled-юниты игрокам не отдаются; у DM видны `claimedBy` с именем игрока.
- `undo.ts`: patch = снимок изменённых полей до действия; `applyPatch`.
  Глубина 10, `claimUnit`/`releaseUnit` без patch, undo останавливается на них.
- `health.ts`: `healthStatus(hp, max)`, `hpSegments(hp, max)` 0–4.
- `sort.ts`: порядок юнитов; сортировки списков боёв и пресетов.
- `names.ts`: `duplicateName(existing, name)`, `copyTitle(title)`.
- `index.ts` — публичный API.

Тесты `packages/domain/test/*.test.ts`: один файл на раздел vision.md
(`transitions`, `hp`, `turn-order`, `undo`, `authorize`, `project`, `limits`,
`library`). Покрытие веток `reduce.ts` 100 %.

Критерии приёмки: все действия из списка реализованы и протестированы; каждая
строка таблиц «Transitions», «Unit → Actions», «Visibility for players» и каждый
пункт «Unit → Rules» имеет тест с тем же названием; `project` никогда не кладёт
скрытое поле в документ игрока (тест обходит все поля).

## Фаза 2 — packages/ui

Четыре агента, последовательно по уровням дерева, внутри уровня параллельно.

Общее для всех:

- Один компонент — одна папка `packages/ui/src/<level>/<Name>/` с `<Name>.tsx`,
  `<Name>.module.css`, `<Name>.stories.tsx`. Уровни `atoms`, `molecules`,
  `organisms`, `screens`.
- Для каждого компонента история на каждую ячейку «Variants × states», каждый
  размер S/M/L и каждый edge case со страницы `<Name>.dc.html`. Название истории
  совпадает с подписью ячейки в хэндоффе.
- Интерактивным компонентам — `play`-функция на поведение из раздела Flow.
- Строки через `useTranslation`; ключи в `packages/ui/src/i18n/<lng>/<namespace>.json`,
  шесть локалей. Edge-case-истории с длинными строками используют de и ru.
- Иконки `@tabler/icons-react`, имена из хэндоффа.
- Шрифты через `@fontsource/unbounded`, `@fontsource/rubik`,
  `@fontsource/noto-sans-jp`.
- Mantine-компонент берётся, когда у него тот же смысл (Button, TextInput,
  Checkbox, Radio, Modal/Drawer, Menu, Popover, Notifications); размеры, радиусы,
  бордюры и цвета переопределяются через тему и CSS Modules до значений хэндоффа.
  Когда Mantine-компонента нет, пишется свой.

2.0 Тема (входит в бриф первого агента). `packages/ui/src/theme.ts`: палитра из
`Tokens.dc.html` (base, roles, health, hp actions, 12 conditions как именованные
цвета), шрифты, размеры шрифтов 11/12/14/16/18/22/28/44, межстрочные 1/1.25/1.45,
spacing 4/8/12/16/24/32, radius 2/12/16/24/full, `defaultProps` и `classNames`
для Mantine-компонентов под хэндофф. `packages/ui/src/layout.ts`: константы из
`Baselines.dc.html` (390×844, шапки 126/168, панель 98, кнопка 58/29, отступы
12/28, лист 12/2/14, диалог 24/16, тост 12/12/24, drawer 300).
`PhoneFrame`-декоратор для Storybook: 390 шириной, фон `#FAF6EE`.

2.1 Атомы, две пачки параллельно, после 2.0.
Пачка `2.1-atoms-a`: Button, IconButton, ToolButton, TextField, TextArea,
SearchField, NumberField.
Пачка `2.1-atoms-b`: Checkbox, Radio, Swatch, Chip, StatSquare, EscalationDie,
RoleBlock.

2.2 Молекулы, две пачки параллельно, после 2.1.
Пачка `2.2-molecules-a`: Stepper, Segmented, RadioList, CheckList, SwatchRow,
CardActions, EmptyState.
Пачка `2.2-molecules-b`: HpBox, HistoryRow, DefenseLine, NoteField,
InitiativePopover, Toast.

2.3 Организмы, три пачки параллельно, после 2.2.
Пачка `2.3-organisms-a`: Sheet, Dialog, Menu, Drawer, PageHeader, PlayerHeader,
BottomBar.
Пачка `2.3-organisms-b`: CombatHeader, TurnBar, UnitRow, PlayerRow, CombatCard,
PresetCard, HpHistory.
Пачка `2.3-organisms-c`: ConditionPicker, TagSheet, SortSheet, NumpadSheet,
UnitForm, ShareSheet, MessageScreen.

2.4 Экраны и хуки, после 2.3. Сначала одна пачка `2.4-api-hooks` (интерфейс
`ApiClient`, `FakeApiClient`, хуки), затем три пачки параллельно:
`2.4-screens-combat` (CombatScreen, CombatList), `2.4-screens-player`
(PlayerView: Heroes, Turn order, LinkExpired, CombatDeleted), `2.4-screens-app`
(Library, SignIn, SignUp, Settings, Account, About, NotFound, UnexpectedError,
CombatNotFound, CantReachServer).

- `packages/api/src/client.ts`: интерфейс `ApiClient` (методы REST из фазы 3,
  `dispatch(combatId, action)`, `subscribe(combatId, onDocument, onEnd)`), тип
  `ApiEvent` (`document | deleted | linkRevoked`). Фаза 3 реализует этот интерфейс
  на сервере и в `hono/client`; фаза 2.4 определяет его и пишет `FakeApiClient`.
- `packages/ui/src/api/`: `ApiProvider`, `useApi`, `FakeApiClient` — in-memory,
  применяет редьюсер из `packages/domain`, проецирует документ по viewer,
  эмулирует SSE через подписчиков, задержка 0.
- `packages/ui/src/hooks/`: `useCombatList`, `useCombat(id, viewer)` (документ,
  `dispatch`, статус подписки), `usePresets`, `useTags`, `useSettings`,
  `useAccount`, `useToasts`. Компоненты и экраны не вызывают клиент напрямую.
- Экраны `packages/ui/src/screens/`: `CombatScreen`, `PlayerView`, `CombatList`,
  `Library`, `SignIn`, `SignUp`, `Settings`, `Account`, `About`, `NotFound`,
  `UnexpectedError`, `CombatNotFound`, `LinkExpired`, `CombatDeleted`,
  `PlayerClaim`. Каждый экран принимает только идентификаторы и колбэки
  навигации; данные берёт через хуки.
- Истории экранов: каждое «Key state» и каждый шаг каждого флоу CS-F1…F8,
  PV-F1…F5, CL-F1…F6, LB-F1…F6, AP-F1…F5 со страниц `CombatScreen.dc.html`,
  `PlayerView.dc.html`, `CombatList.dc.html`, `Library.dc.html`, `AppPages.dc.html`.
  Название истории = код шага. `play`-функция проходит флоу от первого шага до
  текущего.
- Сравнение с `screenshots/01…13`: истории с теми же кодами визуально совпадают с
  PNG; агент прикладывает в отчёт список отличий.

Критерии приёмки фазы 2: каждый `*.dc.html` из дерева компонентов имеет папку и
истории на все ячейки; скриншоты всех историй закоммичены; `play`-функции зелёные
в проекте `storybook`; в локалях нет ключа без перевода во всех шести файлах
(проверка скриптом `pnpm i18n:check`, добавляется в `check`).

## Фаза 3 — сервер

Пачка `3-server-schema` (Drizzle-схема, миграции, `ApiClient` через `hono/client`,
`apps/server`), затем параллельно `3-server-combats` (combats, actions, SSE, link,
play) и `3-server-rest` (auth, presets, tags, settings, account). Коммит на
sub-app.

`packages/api`:

- Drizzle-схема: таблицы Better Auth; `combats` (`id`, `dmId`, `title`,
  `description`, `color`, `status`, `lastPlayedAt`, `linkGeneration`, `document`
  JSON, `version`, `createdAt`, `updatedAt`); `action_log` (`id`, `combatId`, `seq`,
  `action` JSON, `author`, `patch` JSON nullable, `undoneBy` nullable, `createdAt`);
  `players` (`combatId`, `playerId`, `displayName`); `presets`, `tags`,
  `preset_tags`; `settings` (`dmId`, `language`). SQLite WAL. Миграции в
  `packages/api/drizzle/`.
- Hono sub-apps: `/api/auth/*` (Better Auth, email+password, Google и GitHub при
  наличии env), `/api/combats` (list с сортировкой на клиенте, create, patch
  метаданных, delete, duplicate, `POST :id/open` ставит `lastPlayedAt`),
  `POST /api/combats/:id/actions` (идемпотентность по `action.id`, проверка
  `version` → 409, `authorize`, `apply`, запись в лог, broadcast; ответ
  `{ version }`), `GET /api/combats/:id/events` (SSE, `id` = version, heartbeat
  15 с, `Last-Event-ID`), `POST /api/combats/:id/link/reissue`,
  `GET /api/play/:id?t=` и те же actions/events для игрока с заголовком
  `X-Player-Id`, `/api/presets`, `/api/tags`, `/api/settings`,
  `DELETE /api/account`. Экспорт `AppType`.
- Токен ссылки: HMAC-SHA256 от `combatId:generation` секретом `LINK_SECRET`.
- Удаление боя и reissue шлют финальное событие и закрывают поток.
- Реализация `ApiClient` через `hono/client` в `packages/api/src/client-hono.ts`
  и `EventSource` для подписки.

`apps/server`: `src/main.ts` — миграции при старте, статика из `apps/web/dist`,
переменные `PORT`, `DATABASE_PATH`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`LINK_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`;
`.env.example`.

Тесты `packages/api/test`: Vitest с временной SQLite: каждый маршрут, 409 на
старой версии, идемпотентность, проекция в SSE для DM и игрока, финальные события,
отказ игроку в чужом действии, истёкший токен.

Критерии приёмки: все маршруты из списка покрыты тестами; документ игрока в SSE не
содержит скрытых полей (тест); сервер стартует на пустой базе.

## Фаза 4 — apps/web

Один агент.

- React Router data mode, маршруты из таблицы «Pages» vision.md; `/` → `/combats`.
- Guard: без сессии — `/auth/sign-in`; после sign-up — пустой `/combats`.
- Провайдеры: `MantineProvider` с темой из `packages/ui`, `ApiProvider` с реальным
  клиентом, `QueryClientProvider`, i18n (язык DM из `/api/settings`; в player view
  — из документа боя), `Notifications`.
- Открытие `/combats/:id` вызывает `POST :id/open`.
- `playerId` ULID в `localStorage`; заголовок `X-Player-Id` во всех запросах игрока
  и в SSE.
- При `linkRevoked` / `deleted` переход на `LinkExpired` / `CombatDeleted`.
- Drawer открывается свайпом вправо и кнопкой в шапке.
- Vite proxy `/api`; `pnpm dev` поднимает оба процесса.

Критерии приёмки: каждый путь из «Pages» рендерит нужный экран (роутер-тест на
`createMemoryRouter`); ручной сценарий из фазы 5 проходит в dev.

## Фаза 5 — e2e

Один агент. Playwright в `e2e/`, запуск `pnpm e2e` против собранного сервера с
временной базой.

Сценарии: sign-up и sign-in; создание боя, добавление трёх юнитов (Hero, Enemy,
Ally), дубликат, сохранение в пресет, добавление из библиотеки; share — второй
контекст открывает ссылку, вводит имя, занимает героя; DM запускает бой — у игрока
появился порядок; игрок наносит урон своему герою — DM видит через SSE; DM Next turn
до оборота раунда — эскалация 1; undo; reissue — у игрока освобождён захват;
удаление боя — у игрока экран Combat deleted; библиотека: теги, фильтр,
сортировки; смена языка; удаление аккаунта.

Критерии приёмки: `pnpm e2e` зелёный локально.

## Фаза 6 — Docker

Один агент.

- `Dockerfile` multi-stage на `node:24-slim`: pnpm, установка, `pnpm build`,
  prod-слой только с `apps/server` и его зависимостями; `better-sqlite3`
  собирается или берётся prebuilt под образ.
- `docker-compose.yml`: сервис `app`, порт `3000`, volume `data:/data`,
  `env_file: .env`.
- `README.md` в корне: запуск dev, Storybook, тесты, скриншоты, `docker compose up`.
- Проверка: `docker build`, `docker run` с volume, `curl /api/health` и `/`.
  Плагин `docker compose` на машине владельца отсутствует; если его нет и в момент
  фазы, `docker compose up` остаётся непроверенным и это пишется в отчёт.

## Итоговое сообщение владельцу

Одно сообщение: команды запуска dev, Storybook, e2e, Docker; что смотреть в
Storybook (экраны по кодам флоу) и в браузере (сценарий фазы 5); список вопросов
из прогресс-файла; список отличий от скриншотов хэндоффа; замечания guard-bee
P2–P3, не исправленные.

## Вне scope

- Файлы в `docs/design/` — не правятся.
- `docs/vision.md` — правится только по ответу владельца на вопрос.
- Тёмная тема, десктопная раскладка, redo, сброс пароля, офлайн, индикаторы
  загрузки, пункты «Roadmap» vision.md.
