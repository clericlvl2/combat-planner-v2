# Plan: Build Combat Planner v2

Собрать приложение целиком по `docs/vision.md` и `docs/design/handoff/` за один прогон
агентов, без владельца между фазами. Владелец получает одно сообщение в конце.
Правила для агентов, жизненный цикл документов, ветки, коммиты, проверки и
интеграция: корневой `CLAUDE.md`. Этот план их не повторяет.

## Источники

- `docs/vision.md` — закон для поведения, данных, стека, архитектуры.
- `docs/design/handoff/` — закон для визуала, раскладки, дерева компонентов,
  состояний. Только чтение. `docs/design/handoff-errata.md` перечисляет строки
  бандла, которые не действуют.
- `docs/design/renders/` — PNG каждой страницы и каждого флоу хэндоффа, снятые в
  браузере в фазе −1.
- Не источник: `docs/archive/`.
- Вопрос, на который источники не отвечают, не останавливает прогон: агент строит
  по vision.md, затем по хэндоффу, вопрос пишет в `REPORT.md`. Оркестратор
  собирает вопросы в итоговое сообщение.

## Решения владельца

2026-10-16:

- Эскалация растёт на 1 при переходе на новый раунд, максимум 6.
- Set Temp заменяет temp HP. Heal не поднимает HP выше Max. Set Max обрезает HP.
- Duplicate юнита: копия под оригиналом, `<name> 2`, HP полные, инициатива скопирована.
- Копия боя: `<title> (copy)`, Setup, полные HP, без захватов, ссылки, лога.
- Тег до 24 символов, без учёта регистра. Удаление пресета не трогает юнитов.
- Save as preset копирует имя, тип, Max HP, AC, PD, MD, бонус инициативы.
- Игрок: несколько героев, экран Heroes с чекбоксами, Join/Done; инициатива и в
  Active; Edit своей карточки с заблокированным типом; имена игроков видны всем.
- Удаление юнита с подтверждением и тостом с Undo. Тост Undo без Redo. Тост
  ошибки с Retry. 409 — тихий перезапрос и тост. SSE — тост «Reconnecting…».
- Защиты 0–99 везде. Бонус инициативы в форме пресета. Create тега только при
  отсутствии совпадений. Копия пресета наверх. Один пресет за добавление.
- Подпись сортировки «Last played». About с описанием, privacy note, донатами,
  credits. Тексты пишут агенты на английском и переводят; владелец правит после.
- Не делать: тёмную тему, десктоп, redo, сброс пароля, офлайн, индикаторы загрузки.
- Из стека убраны dnd-kit и `@storybook/addon-themes`; `vp pack` не используется,
  пакеты импортируются из исходников.
- Ревью между пачками: только `guard-bee`. Запуск процессов, браузера и Docker
  разрешён на весь прогон. Одновременно не больше двух агентов-исполнителей.
- Модели: Fable 5.1 на domain, сервер и guard-bee; Opus 5.5 на всё остальное.
- Автокомпакт оркестратора 50 %.

## Исполнение

- Оркестратор не пишет код. Он пишет брифы, создаёт worktree, запускает агентов,
  интегрирует ветки, гоняет гейт, ведёт прогресс-файл, пишет `handoff-errata.md`.
- Пачка — единица запуска агента. Бриф пачки `.claude/artifacts/briefs/<batch>.md`:
  путь worktree, список единиц работы (имена = темы коммитов), файлы хэндоффа и
  рендеры для чтения, разрешённые пути, критерии приёмки, команды pre-commit.
- Исполнитель `worker-bee`. Модель и усилие по таблице фазы.
- Размер пачки: атомы 3–4, молекулы 3, организмы 2, UnitRow / UnitForm /
  NumpadSheet / CombatScreen по одному. Экраны по одному на агента.
- Между уровнями UI пачка `fix-<уровень>`: один агент правит ошибки нижнего уровня,
  найденные при сборке верхнего, и перегенерирует зависимые скриншоты. Агенты
  верхнего уровня баги нижнего не правят, а пишут их в `REPORT.md`.
- После автокомпакта: прочитать план и прогресс-файл, выполнить `scripts/status.sh`,
  сверить каждую строку прогресса не в `todo`, продолжить с первой незавершённой.
  Агент с mtime в worktree моложе 15 минут жив, его не перезапускают.
- Агент без отчёта и без свежих файлов перезапускается с тем же брифом в том же
  worktree; незакоммиченное отбрасывается `git checkout -- .`.

## Гейт и версии

Три уровня проверок и скрипты `scripts/check-*.mjs`: `CLAUDE.md`, раздел Checks.
Точные команды закрепляет фаза 0 в разделе Commands.

Node 24 (`.nvmrc`), pnpm 10, React 19, Vite+ `vp` ^1.1, TypeScript 5, Mantine 9,
Storybook 10, Vitest через `vp test`, Playwright с образом
`mcr.microsoft.com/playwright:v<X>-noble`, Hono 4, Zod, Drizzle ORM,
better-sqlite3, Better Auth. Версии ставятся последними стабильными в фазе 0 и
записываются в `CLAUDE.md`.

## Фаза −1 — рендеры хэндоффа и errata

Оркестратор и `chrome-rider` (Sonnet 5.5, lower). `npx serve docs/design/handoff`,
браузер снимает каждую страницу `*.dc.html?embed=1` в
`docs/design/renders/<Name>.png` и каждый флоу экранных страниц
`?embed=1&flow=<CODE>` в `docs/design/renders/<Screen>-<CODE>.png`, полная высота,
ширина окна 1280. Оркестратор пишет `docs/design/handoff-errata.md`: строки README
о выборе стека и об открытых вопросах не действуют; `PROTOTYPE-RULES.md` описывает
прототип, не приложение; пометка `status="Draft"` на страницах не означает
незавершённость; `VISION-UPDATES.md` и `TODO.md` в архиве.

Приёмка: PNG на каждую из 57 страниц и на каждый из 30 кодов флоу, 87 файлов;
errata закоммичена. Коммит `docs(design): handoff renders and errata`.

## Фаза 0 — тулчейн, спайк

Пачка `0-toolchain`, Opus 5.5, high. Лимит: 150 вызовов инструментов, после него
агент отчитывается, что получилось и что нет.

Дерево решений, каждый пункт фиксируется в `CLAUDE.md` Commands и Versions:

- `vp` ^1.1 как единый бинарь. Если `vp test` не поднимает Vitest-проекты с
  браузерным провайдером после двух попыток — Vitest вызывается напрямую через
  `vitest --project`, остальное остаётся на `vp`.
- Storybook 10 + `@storybook/addon-vitest` + `@vitest/browser-playwright`. Если
  CSF factories не работают с addon-vitest — обычный CSF3 с
  `setProjectAnnotations` в `setupFiles`; выбор записывается, эталонный Button
  следует ему.
- Проект `visual`: скриншоты composed stories через `toMatchScreenshot`, baselines в
  `packages/ui/__screenshots__/<Name>/`, генерация только скриптом
  `screenshots:update`, который запускает проект внутри образа Playwright и пишет
  маркер `.docker-<tag>`. Если браузерный Vitest не снимает скриншоты — Playwright
  test runner по `index.json` Storybook, тот же каталог baselines.
- `storybook-addon-remix-react-router` и `@storybook/addon-mcp`: если не ставятся с
  React Router 7 или Storybook 10 — не ставятся, записывается в Versions.
- Mantine 9: `styles.layer.css`, postcss-preset-mantine.

Создать: `pnpm-workspace.yaml`; корневой `package.json` со скриптами `check`,
`test`, `storybook`, `storybook:build`, `build`, `dev`, `screenshots:update`,
`e2e`, `status`; `.nvmrc` = 24; `tsconfig.base.json` и project references;
`vite.config.ts` с проектами `unit`, `storybook`, `visual`; скелеты
`packages/domain`, `packages/api`, `packages/ui`, `apps/web`, `apps/server` с
одним тестом или историей; `apps/web` с proxy `/api`; `apps/server` Hono с
маршрутами `/api/health` и `/api/events` (SSE, тик раз в секунду), статика из
`apps/web/dist`; все зависимости из раздела Stack vision.md плюс тестовые;
`scripts/check-comments.mjs`, `scripts/check-commit.sh`, `scripts/status.sh`,
`scripts/kill-leftovers.sh` и хуки `SubagentStop` и `Stop` в `.claude/settings.json`;
`.gitignore`.

Единицы (коммиты): `workspace`, `vitest projects`, `storybook`, `skeletons`,
`scripts`, `CLAUDE.md commands`.

Приёмка: с чистого клона `pnpm install --frozen-lockfile` и четыре команды гейта
зелёные; `pnpm dev` поднимает web и server, SSE `/api/events` читается через proxy
в браузере; история `Hello` со скриншотом, воспроизводимым `screenshots:update`;
`docker run` закреплённого образа Playwright проходит; `CLAUDE.md` Commands,
Versions, Dependencies заполнены. Тег `phase-0`.

## Фаза 0.5 — тема и эталонный Button

Пачка `0.5-reference`, Opus 5.5, high.

- `packages/ui/src/theme.ts`: палитра из `Tokens.dc.html` (base, roles, health, HP
  actions, 12 conditions), шрифты Unbounded / Rubik / Noto Sans JP через
  `@fontsource`, размеры 11/12/14/16/18/22/28/44, межстрочные 1/1.25/1.45, spacing
  4/8/12/16/24/32, radius 2/12/16/24/full, `defaultProps` и `classNames` под
  хэндофф, выключенные transitions и focus ring Mantine в пользу стилей хэндоффа.
- `packages/ui/src/layout.ts`: константы `Baselines.dc.html`.
- `packages/ui/src/provider.tsx`: `UiProvider` с `motion: 'on' | 'off'`.
- `PhoneFrame` декоратор, i18n-декоратор с переключателем локали.
- История `ThemeAudit`: все токены на одном экране, скриншот сверяется с
  `renders/Tokens.png`.
- Атом `Button` целиком по `Button.dc.html`: все ячейки Variants × states, Sizes,
  Edge cases как истории с именами ячеек, `play` на поведение, шесть файлов i18n,
  скриншоты из Docker, селекторы `&:active, &[data-pressed]`.
- `scripts/check-stories.mjs`, `check-i18n.mjs`, `check-screenshots.mjs`,
  проверенные на Button; строка в `CLAUDE.md` Commands, включающая их в `check`.

Единицы: `theme`, `PhoneFrame`, `ThemeAudit`, `Button`, `check scripts`.

Приёмка: guard-bee сверяет `Button` со всеми ячейками страницы и с
`renders/Button.png`; скрипты падают на подложенном нарушении каждого правила
(тест-фикстуры в `scripts/test/`). Тег `phase-0.5`.

## Фаза 1 — packages/domain и контракт API

Fable 5.1, high. Три пачки подряд.

`1-domain-core`, единицы `types`, `schemas`, `actions`, `health`, `sort`, `names`,
`reduce`, `authorize`:

- `types.ts`: `Combat` (`id`, `title`, `description`, `color` 0–7, `status`,
  `round`, `escalation`, `activeUnitId | null`, `lastPlayedAt | null`,
  `linkGeneration`, `version`, `units[]`, `players: Record<playerId, displayName>`),
  `Unit` (поля vision.md «Unit → Fields» плюс `id`, `claimedBy | null`,
  `hpHistory[]`), `HpHistoryEntry` (`kind` `damage|heal|temp|max`, `amount`,
  `result`, `round | null`, `at`), `Preset`, `Tag`, `Condition`, `HealthStatus`,
  `Viewer`.
- `schemas.ts`: Zod-схемы и `LIMITS`.
- `actions.ts`: `start` (с массивом бросков), `nextTurn`, `editRound`,
  `setEscalation`, `restart`, `clear`, `undo`, `addUnit`, `editUnit`,
  `duplicateUnit`, `removeUnit`, `setDisabled`, `setInitiative`, `rollInitiative`
  (бросок в payload), `damage`, `heal`, `setTempHp`, `setMaxHp`, `toggleCondition`,
  `editNote`, `claimUnit`, `releaseUnit`. У каждого `id`, `version`.
- `reduce.ts`: `apply(combat, action, author, now) → { combat, patch } | DomainError`,
  `nextTurnBlockReason(combat)`.
- `authorize.ts`: таблица «Unit → Actions» и правила claims.

`1-domain-rest`, единицы `project`, `undo`, `index`, `tests`:

- `project.ts` по таблице видимости; disabled-юниты игрокам не отдаются.
- `undo.ts`: patch — снимок изменённых полей; глубина 10; `claimUnit` и
  `releaseUnit` без patch.
- Тесты `packages/domain/test/<раздел>.test.ts`: импорт только из
  `src/index.ts`; имя теста = строка таблицы или пункт правил vision.md
  (скрипт `check-domain-tests.mjs` сверяет); ветки `reduce.ts` покрыты.

`1-api-contract`, единица `ApiClient`: `packages/api/src/client.ts` — интерфейс с
явными сигнатурами: `combats.list/create/update/remove/duplicate/open`,
`combats.dispatch(id, action) → { version }`,
`combats.subscribe(id, viewer, onDocument, onEnd) → unsubscribe`,
`link.reissue`, `play.get(id, token)`, `presets.*`, `tags.*`, `settings.*`,
`account.remove`, `auth.*`; `ApiEvent = document | deleted(title) | linkRevoked`;
`ApiError` с `status`. Фазы 2.4 и 3 реализуют его без изменений.

Приёмка: каждая строка таблиц «Transitions», «Unit → Actions», «Visibility for
players» и каждый пункт «Unit → Rules» имеет тест с тем же названием;
`project` не кладёт скрытое поле в документ игрока (тест обходит все поля). Тег
`phase-1`.

## Фаза 2 — packages/ui

Opus 5.5, medium. Одна папка на компонент
`packages/ui/src/<level>/<Name>/` с `<Name>.tsx`, `<Name>.module.css`,
`<Name>.stories.tsx`, по образцу `atoms/Button`. Истории на каждую ячейку
страницы хэндоффа, имя истории = подпись ячейки; `play` на поведение из Flow;
i18n `packages/ui/src/i18n/<lng>/<Name>.json`; иконки `@tabler/icons-react`;
Mantine-компонент берётся при совпадении смысла, размеры и цвета
переопределяются до хэндоффа. Бриф пачки называет рендеры для сверки.

2.1 Атомы, пачки по две параллельно:
`2.1-atoms-a`: IconButton, ToolButton, TextField, TextArea.
`2.1-atoms-b`: SearchField, NumberField, Checkbox, Radio.
`2.1-atoms-c`: Swatch, Chip, StatSquare.
`2.1-atoms-d`: EscalationDie, RoleBlock.
Затем `fix-2.1`.

2.2 Молекулы:
`2.2-molecules-a`: Stepper, Segmented, RadioList.
`2.2-molecules-b`: CheckList, SwatchRow, CardActions.
`2.2-molecules-c`: HpBox, HistoryRow, DefenseLine.
`2.2-molecules-d`: NoteField, InitiativePopover.
`2.2-molecules-e`: Toast, EmptyState.
Затем `fix-2.2`.

2.3 Организмы:
`2.3-organisms-a`: Sheet, Dialog. `2.3-organisms-b`: Menu, Drawer.
`2.3-organisms-c`: PageHeader, PlayerHeader. `2.3-organisms-d`: BottomBar, TurnBar.
`2.3-organisms-e`: CombatHeader, CombatCard. `2.3-organisms-f`: PresetCard, HpHistory.
`2.3-organisms-g`: ConditionPicker, TagSheet. `2.3-organisms-h`: SortSheet, ShareSheet.
`2.3-organisms-i`: MessageScreen, PlayerRow.
`2.3-UnitRow`, `2.3-UnitForm`, `2.3-NumpadSheet` — по одному.
Затем `fix-2.3`.

2.4 Хуки и экраны. Сначала `2.4-api-hooks`: `packages/ui/src/api/` —
`ApiProvider`, `useApi`, `FakeApiClient` (in-memory, применяет редьюсер domain,
проецирует по viewer, эмулирует SSE подписчиками, принимает `scenario` с готовым
состоянием и `delay: 0`); `packages/ui/src/hooks/` — `useCombatList`,
`useCombat(id, viewer)`, `usePresets`, `useTags`, `useSettings`, `useAccount`,
`useToasts`, `useConnection`. Затем экраны, по одному на агента, две параллели:
`2.4-CombatScreen`, `2.4-CombatList`, `2.4-PlayerView` (Heroes, TurnOrder),
`2.4-Library`, `2.4-AppPages` (SignIn, SignUp, Settings, Account, About),
`2.4-SystemScreens` (NotFound, UnexpectedError, CombatNotFound, LinkExpired,
CombatDeleted, CantReachServer). Истории экранов: каждое Key state и каждый шаг
флоу как отдельная история с именем = код шага, состояние шага задаётся
`scenario`, `play` делает только действие шага и `expect`. Затем `fix-2.4`.

Экраны и состояния, которых нет в хэндоффе, строятся так:

- Heroes: экран PV-F1 с `CheckList` вместо `RadioList`; свои герои с `RoleBlock`
  «You», чужие заблокированы подписью «<Name> is playing»; кнопка Join / Done.
- Edit своей карточки игроком: `UnitForm` без вкладок, `Segmented` типа
  disabled на Hero.
- About: строки Version, Rules, Source как в AP-F4, ниже абзац описания, строки
  Privacy, Donate, Credits тем же стилем строк, дисклеймер внизу.
- Тост после Undo: `Toast` без кнопки.
- Can't reach the server: `MessageScreen` с кнопкой Try again.
- Тосты «Reconnecting…», «The combat changed. Try again.», «<hero> was just
  taken», «The DM removed <hero>. Pick a hero.»: `Toast` без кнопки.

Приёмка пачки: `check-stories`, `check-i18n`, `check-screenshots` зелёные; guard-bee
сверяет каждую историю с ячейкой страницы и с рендером. После `fix-2.4` тег
`phase-2`.

## Фаза 3 — сервер

Fable 5.1, high.

`3-server-schema`, единицы `schema`, `migrations`, `client-hono`, `server main`:
Drizzle-схема (таблицы Better Auth; `combats` с `document` JSON и `version`;
`action_log` с `seq`, `action`, `author`, `patch | null`, `undoneBy | null`;
`players`; `presets`, `tags`, `preset_tags`; `settings`), SQLite WAL, миграции в
`packages/api/drizzle/`; `ApiClient` через `hono/client` и `EventSource`;
`apps/server/src/main.ts` с миграциями при старте, статикой, переменными `PORT`,
`DATABASE_PATH`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `LINK_SECRET`,
`GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `.env.example`.

Затем параллельно:

`3-server-actions`, единицы `combats routes`, `actions route`, `link`:
`/api/combats` list/create/patch/delete/duplicate/`:id/open`;
`POST /api/combats/:id/actions` — идемпотентность по `action.id`, `version` → 409,
`authorize`, `apply`, лог, broadcast, ответ `{ version }`;
`POST /api/combats/:id/link/reissue`; токен HMAC-SHA256 от `combatId:generation`
секретом `LINK_SECRET`.

`3-server-live`, единицы `events route`, `play routes`:
`GET /api/combats/:id/events` — SSE, `id` = version, heartbeat 15 с,
`Last-Event-ID`; `GET /api/play/:id?t=` и actions/events игрока с заголовком
`X-Player-Id`; финальные события `deleted` с названием и `linkRevoked`.

`3-server-rest`, единицы `auth`, `presets`, `tags`, `settings`, `account`:
Better Auth email+password, Google и GitHub по env; `/api/presets`, `/api/tags`,
`/api/settings`, `DELETE /api/account`. Экспорт `AppType`.

Тесты `packages/api/test` на временной SQLite: каждый маршрут, 409, идемпотентность,
проекция в SSE для DM и игрока, финальные события, отказ игроку в чужом действии,
истёкший токен. Приёмка: все маршруты покрыты; документ игрока в SSE без скрытых
полей (тест); сервер стартует на пустой базе. Тег `phase-3`.

## Фаза 4 — apps/web

Пачка `4-web`, Opus 5.5, medium. Единицы `router`, `providers`,
`player identity`, `drawer`, `smoke e2e`.

React Router data mode по таблице «Pages»; guard без сессии; провайдеры
`MantineProvider`, `UiProvider`, `ApiProvider` с реальным клиентом,
`QueryClientProvider`, i18n (язык DM из `/api/settings`, у игрока из документа),
`Notifications`; `POST :id/open` при открытии боя; `playerId` ULID в
`localStorage` и заголовок `X-Player-Id`; переходы на LinkExpired /
CombatDeleted по финальным событиям; drawer по свайпу и кнопке; `useConnection`
для тостов связи. Smoke e2e в `e2e/smoke.spec.ts`: sign-up, create, add unit,
start, next turn, игрок во втором контексте видит порядок.

Приёмка: роутер-тест на `createMemoryRouter` по каждому пути; `pnpm e2e` smoke
зелёный против собранного сервера. Тег `phase-4`.

## Фаза 5 — e2e

Пачка `5-e2e`, Opus 5.5, medium. Единицы по группам сценариев: `auth`, `combat
lifecycle`, `player`, `library`, `account`.

Сценарии: sign-up и sign-in; создание боя, три юнита (Hero, Enemy, Ally),
дубликат, Save as preset, добавление из библиотеки; share — второй контекст
открывает ссылку, вводит имя, берёт героя; Start — у игрока порядок; игрок наносит
урон себе — DM видит через SSE; Next turn до оборота раунда — эскалация 1; undo;
reissue — у игрока снят захват; удаление боя — экран Combat deleted; теги, фильтр,
сортировки; смена языка; удаление аккаунта.

Приёмка: `pnpm e2e` зелёный. Тег `phase-5`.

## Фаза 6 — Docker

Пачка `6-docker`, Opus 5.5, medium. Единицы `Dockerfile`, `compose`, `README`.

Multi-stage на `node:24-slim`, prod-слой с `apps/server`; `docker-compose.yml` с
volume `data:/data` и `env_file`; корневой `README.md`: dev, Storybook, тесты,
скриншоты, `docker compose up`. Приёмка: `docker compose up` отвечает на
`/api/health` и `/`. Тег `phase-6`.

## Итоговое сообщение владельцу

Команды запуска dev, Storybook, e2e, Docker; что смотреть в Storybook по кодам флоу
и в браузере по сценарию фазы 5; вопросы из отчётов; отличия от рендеров;
замечания guard-bee P2–P3; `REVIEWED.md` пуст, все переводы черновые.

## Вне scope

Файлы `docs/design/handoff/` и `docs/archive/` не правятся. Тёмная тема, десктоп,
redo, сброс пароля, офлайн, индикаторы загрузки, пункты Roadmap vision.md.
