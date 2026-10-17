# Plan: One Command Start

Цель: после `git clone` приложение (SQLite, сервер, веб) поднимается одной
командой без правки `.env` и без генерации секретов руками:

- Docker: `docker compose up --build`, открыть http://localhost:3000.
- Без Docker: `pnpm install`, затем `pnpm dev`, открыть http://localhost:5173.
  Нужен только pnpm 10 (`corepack enable` или `npm i -g pnpm`); Node 24
  pnpm скачивает сам.

`.env` остаётся необязательным: публичный `BETTER_AUTH_URL` для https, пары
OAuth, ссылки About.

## Решения

- Секреты `BETTER_AUTH_SECRET` и `LINK_SECRET` разрешаются в порядке:
  переменная окружения → файл `<dirname(DATABASE_PATH)>/secrets.json` →
  генерация с записью в этот файл. Это верно во всех режимах.
  - Файл пишется атомарно (tmp + `renameSync`) с правами `0o600`, по ключам:
    если в окружении задан один секрет, файл дополняется только вторым.
  - Битый или нечитаемый файл — выход с кодом 1. Сообщение называет путь и
    uid процесса, значения в нём нет. Молча перегенерировать нельзя: это
    разлогинит всех и сломает ссылки игроков.
  - При генерации пишется одна строка в лог, без значения.
  - Явно заданный секрет короче 32 символов или равный старой заглушке из
    `.env.example` отвергается во всех режимах. Сообщение называет
    переменную, значения в нём нет.
  - Секреты лежат рядом с базой: в Docker это том `data` (`/data`), локально
    каталог `data/`, он уже в `.gitignore` и `.dockerignore`. База и
    `secrets.json` бэкапятся вместе.
- `BETTER_AUTH_URL` необязателен (`apiEnvSchema.betterAuthUrl` →
  `z.url().optional()`). Без него Better Auth берёт base URL и доверенный
  origin из запроса. Поэтому работают dev через прокси Vite на 5173 (прокси
  не меняет `Host`), Docker на любом опубликованном порту и телефон в
  локальной сети. Если переменная задана, поведение строгое, как сейчас.
- Node 24 фиксирует pnpm. В `pnpm-workspace.yaml` добавляются
  `useNodeVersion: 24.12.0` и `engineStrict: true`. Узел хоста (сейчас nvm
  по умолчанию даёт 22.12, на котором `node src/main.ts` не стартует) больше
  не важен. `.nvmrc` остаётся для редакторов. Если `useNodeVersion` ломает
  гейт (`pnpm check`, `pnpm test`, `pnpm build`, `pnpm e2e`), он не вносится,
  а в README остаётся шаг `nvm use`. Это решение принимается по результату,
  а не заранее.
- Compose:
  - `env_file: [{ path: .env, required: false }]` (Compose ≥ 2.24);
  - `ports: ['${PORT:-3000}:3000']`;
  - `restart: unless-stopped`, именованный том `data` и `environment`
    (`DATABASE_PATH`, `PORT` внутри контейнера) остаются.
- Dockerfile не меняется. Слой сборочных инструментов для `better-sqlite3`
  остаётся, пока сборку нельзя проверить в настоящем Docker.
- Dev в Docker с hot reload не делается. Зависимости рантайма — Node и файл
  SQLite, их закрывают `useNodeVersion` и генерация секретов.

## Единица работы: пачка `fix-6-zero-config`

Opus 5.5 xhigh, worktree `../combat-planner-v2.wt/fix-6-zero-config`, ветка
`agent/fix-6-zero-config`. Коммиты, по одному на единицу:

1. `fix(server): secrets`:
   - `apps/server/src/main.ts`: `mkdirSync` каталога базы до разрешения
     секретов, чтение и запись `secrets.json`, проверки выше,
     `betterAuthUrl` только из переменной;
   - `apps/server/src/main.test.ts`: подробности в разделе «Проверка»;
   - `packages/api/src/env.ts` и `packages/api/test/**`;
   - `.env.example`: убрать две заглушки секретов и `DATABASE_PATH`,
     `BETTER_AUTH_URL` и `BETTER_AUTH_TRUSTED_ORIGINS` пустые. Строки OAuth
     и `VITE_*` остаются.
2. `chore(toolchain): node version`: `pnpm-workspace.yaml`.
3. `chore(docker): compose`: `docker-compose.yml`.
4. `docs(docker): README`: блок Quick start, оба способа выше, в начало
   `README.md`.
   - Разделы Development и Production сокращаются до необязательных
     настроек.
   - Одна строка про бэкап `data` целиком.
   - Одна строка про bind-mount: каталог должен быть доступен uid 1000, или
     в сервисе задаётся `user: "${UID}:${GID}"`.

Файлы вне scope: `Dockerfile`, `.dockerignore`, `apps/web/**`,
`packages/ui/**`, `packages/domain/**`, `e2e/**`, `playwright.config.ts`,
`CLAUDE.md`.

Повторно используются:
- `secret()` и `provider()` в `apps/server/src/main.ts`, где копятся
  проблемы и происходит выход;
- в `main.test.ts` запуск дочернего `node apps/server/src/main.ts` с
  временным `DATABASE_PATH` и `PORT=0`.

## Проверка

- Гейт `.claude/run/gate.sh` зелёный, `pnpm e2e` 21 passed.
- `main.test.ts`:
  - первый старт без секретов в production создаёт `secrets.json` с
    правами 600;
  - второй старт на том же `DATABASE_PATH` берёт те же значения: cookie
    сессии, выданный первым стартом, принимается;
  - секрет из окружения сильнее файла;
  - битый файл даёт выход 1 с путём в сообщении и без значения;
  - явный секрет короче 32 символов отвергается в development и production;
  - старая заглушка отвергается;
  - половинная пара OAuth по-прежнему отвергается;
  - старт без `BETTER_AUTH_URL`, затем регистрация с `Origin`, равным хосту
    запроса, отвечает 200.
- Ручной прогон агента:
  1. Чистая копия репозитория во временном каталоге, shell без `nvm use`
     (`node -v` = 22.12).
  2. `pnpm install`, затем `pnpm dev`.
  3. `curl` регистрирует пользователя через http://localhost:5173/api с
     `Origin: http://localhost:5173` и получает 200.
  4. Перезапуск `pnpm dev`, тот же cookie остаётся валидным.
- Раскладка образа без Docker, как в `fix-6`: `NODE_ENV=production` без
  единой переменной секретов → старт, `/api/health` 200, регистрация через
  :3000, перезапуск, сессия жива.
- Настоящий `docker compose up --build` запускается, если пользователь в
  группе `docker`. Иначе он остаётся непроверенным и попадает в отчёт.

## Решения после первого прогона (2026-10-18)

Чистый клон показал три препятствия и одну утечку. Пачка дополняется
единицами 5–8, в той же ветке:

5. `fix(server): env file` (`apps/server/package.json`,
   `apps/server/src/main.ts`, `apps/server/src/main.test.ts`).
   - Скрипты `dev` и `start` запускают `node --watch src/main.ts` и
     `node src/main.ts` без `--env-file-if-exists`: watch-режим Node 24.12
     падает на отсутствующем файле.
   - `main.ts` в самом начале загружает корневой `.env` через
     `process.loadEnvFile`, если файл есть. Путь берётся от
     `import.meta.dirname`, а не от cwd.
   - Тест: старт без `.env` и старт с `.env`, где задана переменная.
6. `fix(web): proxy` (`apps/web/vite.config.ts`): `'/api': { target:
   'http://localhost:3000', changeOrigin: false }`. Тогда прокси сохраняет
   `Host: localhost:5173`, и регистрация через 5173 проходит проверку origin
   без `BETTER_AUTH_TRUSTED_ORIGINS`.
7. `fix(api): secure cookies` (`packages/api/src/auth/index.ts`,
   `packages/api/test/**`):
   - `advanced.useSecureCookies` = `true`, только если `betterAuthUrl` задан
     и начинается с `https:`. Иначе `false`.
   - Так сессия работает по http на `localhost` и на адресе в локальной
     сети. Для https по README задаётся `BETTER_AUTH_URL`.
   - Тест: без `betterAuthUrl` cookie без `Secure`, с `https://…` — с
     `Secure`.
8. `chore(docker): dockerignore` (`.dockerignore`): `**/data`. Локальные
   `apps/server/data/secrets.json` и база не попадают в контекст сборки.

Предупреждение Better Auth «Base URL is not set» при старте без
`BETTER_AUTH_URL` остаётся: оно безвредно, а глушить логгер — значит терять
другие предупреждения.
