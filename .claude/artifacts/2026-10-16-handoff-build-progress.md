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

Фаза 0 закрыта тегом `phase-0`. Пачка `0.5-reference` запущена 2026-10-16T17:26:07+03:00: бриф
`.claude/artifacts/briefs/0.5-reference.md`, worktree
`../combat-planner-v2.wt/0.5-reference`, Opus 5.5, high. Гейт на этой машине
идёт с `COMBAT_PLANNER_NO_DOCKER=1` (маркер `.docker-*` не проверяется), пока
владелец не даст доступ к Docker. Следующий шаг: hand-back, интеграция, тег
`phase-0.5`, затем фаза 1 (две пачки параллельно).

## Пачки

| Пачка | Статус | Единицы |
|-------|--------|---------|
| -1-renders | guarded — | renders, errata |
| 0-toolchain | guarded `.claude/artifacts/guard/0-toolchain.md` | workspace, vitest projects, storybook, skeletons, scripts, CLAUDE.md commands |
| 0.5-reference | guarded `.claude/artifacts/guard/0.5-reference.md` | theme, PhoneFrame, ThemeAudit, Button, check scripts |
| 1-domain-core | rebased, report `.claude/artifacts/reports/1-domain-core.md`, gate running | types, schemas, actions, health, sort, names, reduce, authorize |
| 1-domain-rest | todo | project, undo, index, tests |
| 1-api-contract | todo | ApiClient |
| 2.1-atoms-a | running worker-bee 2026-10-16T17:55:06+03:00 | IconButton, ToolButton, TextField, TextArea |
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

- 0.5-reference, ThemeAudit: две колонки, свотчи 14 px, подписи 9–10 px, чтобы
  уместиться в 390×844; подпись строки = ключ палитры; заметки Typefaces
  сокращены; сноска Radii/Spacing опущена. HP actions содержит `#F7E4E2` из
  README. Размеры иконок 16/20/24/32 по README, страница Tokens говорит
  18/20/22/24.
- 0.5-reference, Button: full-width edge-ячейки заполняют канвас 358 px вместо
  240 px ячейки страницы.

## Замечания guard-bee P2–P3, отложены

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

## Падения гейта
