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
| 0 | тулчейн, спайк, скрипты, CLAUDE.md Commands | 0-toolchain | |
| 0.5 | тема, PhoneFrame, ThemeAudit, эталонный Button, check-скрипты | 0.5-reference | |
| 1 | domain, контракт ApiClient | 1-domain-core, 1-domain-rest, 1-api-contract | |
| 2.1 | атомы | 2.1-atoms-a…d, fix-2.1 | |
| 2.2 | молекулы | 2.2-molecules-a…e, fix-2.2 | |
| 2.3 | организмы | 2.3-organisms-a…i, 2.3-UnitRow, 2.3-UnitForm, 2.3-NumpadSheet, fix-2.3 | |
| 2.4 | хуки, экраны | 2.4-api-hooks, 2.4-CombatScreen, 2.4-CombatList, 2.4-PlayerView, 2.4-Library, 2.4-AppPages, 2.4-SystemScreens, fix-2.4 | |
| 3 | сервер | 3-server-schema, 3-server-actions, 3-server-live, 3-server-rest | |
| 4 | web | 4-web | |
| 5 | e2e | 5-e2e | |
| 6 | docker | 6-docker | |

## Текущий шаг

Фаза −1 завершена: 87 рендеров в `docs/design/renders/` (57 страниц, 30 флоу,
1280 wide, DPR 1, 40 MB), `docs/design/handoff-errata.md`. Следующий шаг: новая
сессия, бриф `0-toolchain`, worktree `../combat-planner-v2.wt/0-toolchain`.

## Пачки

| Пачка | Статус | Единицы |
|-------|--------|---------|
| -1-renders | guarded — | renders, errata |
| 0-toolchain | todo | workspace, vitest projects, storybook, skeletons, scripts, CLAUDE.md commands |
| 0.5-reference | todo | theme, PhoneFrame, ThemeAudit, Button, check scripts |
| 1-domain-core | todo | types, schemas, actions, health, sort, names, reduce, authorize |
| 1-domain-rest | todo | project, undo, index, tests |
| 1-api-contract | todo | ApiClient |
| 2.1-atoms-a | todo | IconButton, ToolButton, TextField, TextArea |
| 2.1-atoms-b | todo | SearchField, NumberField, Checkbox, Radio |
| 2.1-atoms-c | todo | Swatch, Chip, StatSquare |
| 2.1-atoms-d | todo | EscalationDie, RoleBlock |
| fix-2.1 | todo | |
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
| 3-server-schema | todo | schema, migrations, client-hono, server main |
| 3-server-actions | todo | combats routes, actions route, link |
| 3-server-live | todo | events route, play routes |
| 3-server-rest | todo | auth, presets, tags, settings, account |
| 4-web | todo | router, providers, player identity, drawer, smoke e2e |
| 5-e2e | todo | auth, combat lifecycle, player, library, account |
| 6-docker | todo | Dockerfile, compose, README |

## Вопросы владельцу

## Отличия от рендеров

## Замечания guard-bee P2–P3, отложены

## Падения гейта
