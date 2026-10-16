# Build progress: Combat Planner v2

План: `.claude/plans/2026-10-16-build-combat-planner-v2.md`. Правила веток и
коммитов: `CLAUDE.md`. Оркестратор после автокомпакта читает план и этот файл и
продолжает с первой единицы работы, не отмеченной `done`.

Статус единицы выводится из `git log master` (коммит с её именем) и диска, не из
отчёта агента. Статусы пачек: `todo`, `running <ветка>`, `gate`, `guard`,
`merged`, `blocked`. Статусы единиц: `todo`, `done <hash>`.

## Фазы

| Фаза | Что | Статус | Тег |
|------|-----|--------|-----|
| 0 | монорепо, vp, Storybook, Mantine, скелеты пакетов, команды гейта в CLAUDE.md | todo | |
| 1 | packages/domain: типы, действия, редьюсер, проекция, undo, тесты-спецификация | todo | |
| 2.0 | тема Mantine из Tokens и Baselines, PhoneFrame-декоратор | todo | |
| 2.1 | атомы, 14 компонентов, 2 пачки | todo | |
| 2.2 | молекулы, 13 компонентов, 2 пачки | todo | |
| 2.3 | организмы, 21 компонент, 3 пачки | todo | |
| 2.4 | ApiClient, FakeApiClient, хуки, 15 экранов, 4 пачки | todo | |
| 3 | packages/api и apps/server: схема, маршруты, auth, SSE, 3 пачки | todo | |
| 4 | apps/web: роутер, провайдеры, реальный клиент | todo | |
| 5 | e2e Playwright | todo | |
| 6 | Dockerfile, compose, README | todo | |

## Текущий шаг

Ожидание «го» владельца на фазу 0.

## Чеклист

### 0 toolchain — todo
- [ ] workspace, root scripts, .nvmrc, tsconfig
- [ ] vite.config с проектами unit / storybook / visual
- [ ] packages/ui: Mantine, Storybook, Hello story, screenshot
- [ ] apps/web, apps/server скелеты, proxy
- [ ] CLAUDE.md: команды

### 1 domain
- `1-domain-core` — todo: types, schemas, actions, health, sort, names, reduce, authorize
- `1-domain-rest` — todo: project, undo, index, table tests

### 2.0 theme — todo
- [ ] theme.ts, layout.ts, PhoneFrame

### 2.1 atoms
- `2.1-atoms-a` — todo: Button, IconButton, ToolButton, TextField, TextArea, SearchField, NumberField
- `2.1-atoms-b` — todo: Checkbox, Radio, Swatch, Chip, StatSquare, EscalationDie, RoleBlock

### 2.2 molecules
- `2.2-molecules-a` — todo: Stepper, Segmented, RadioList, CheckList, SwatchRow, CardActions, EmptyState
- `2.2-molecules-b` — todo: HpBox, HistoryRow, DefenseLine, NoteField, InitiativePopover, Toast

### 2.3 organisms
- `2.3-organisms-a` — todo: Sheet, Dialog, Menu, Drawer, PageHeader, PlayerHeader, BottomBar
- `2.3-organisms-b` — todo: CombatHeader, TurnBar, UnitRow, PlayerRow, CombatCard, PresetCard, HpHistory
- `2.3-organisms-c` — todo: ConditionPicker, TagSheet, SortSheet, NumpadSheet, UnitForm, ShareSheet, MessageScreen

### 2.4 screens
- `2.4-api-hooks` — todo: ApiClient, FakeApiClient, useCombatList, useCombat, usePresets, useTags, useSettings, useAccount, useToasts
- `2.4-screens-combat` — todo: CombatScreen, CombatList
- `2.4-screens-player` — todo: Heroes, TurnOrder, LinkExpired, CombatDeleted
- `2.4-screens-app` — todo: Library, SignIn, SignUp, Settings, Account, About, NotFound, UnexpectedError, CombatNotFound, CantReachServer

### 3 server
- `3-server-schema` — todo: schema, migrations, client-hono, apps/server main
- `3-server-combats` — todo: combats, actions, events, link, play
- `3-server-rest` — todo: auth, presets, tags, settings, account

### 4 web — todo
- [ ] router, guards, providers, playerId, SSE end events, drawer gestures

### 5 e2e — todo
- [ ] scenarios from the plan

### 6 docker — todo
- [ ] Dockerfile, compose, README, build + run smoke

## Отчёты агентов

## Падения гейта

## Замечания guard-bee P2–P3, отложены

## Отличия от скриншотов хэндоффа

## Вопросы владельцу
