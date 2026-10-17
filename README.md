# Combat Planner

A 13th Age combat tracker for in-person play. The DM prepares combats and runs them
from a phone. Players follow the combat on their own phones through a link or QR
code. Many DMs can use one server; each has a private account and library. Free,
funded by donations, self-hostable.

## Requirements

- Node 24, version pinned in `.nvmrc`: `nvm use`.
- pnpm 10.34.7, pinned in `package.json` `packageManager`: `corepack enable`.

Every shell runs `source ~/.nvm/nvm.sh && nvm use` first. All commands run from the
repository root.

## Development

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

`pnpm dev` starts the web app on http://localhost:5173 (`/api` is proxied to the
server) and the server on http://localhost:3000. Without `BETTER_AUTH_SECRET` and
`LINK_SECRET` in `.env` the server generates random values for the run. Google and
GitHub sign-in stay off while neither their client id nor their secret is set; set
both values of a pair or neither, because with only one of them the server refuses
to start and names the missing variable.

## Storybook

```sh
pnpm storybook
```

Storybook runs on http://localhost:6006. Every component and screen has one story
per state of its design page in `docs/design/handoff/`. Screen flows carry the
flow codes of the design: `AP` AppPages, `CL` CombatList, `CS` CombatScreen, `LB`
Library, `PV` PlayerView. Story `CLF12` is step 2 of flow `CL-F1`; its render is
`docs/design/renders/CombatList-CL-F1.png`.

## Tests

- `pnpm check`: format, lint, type check, `tsc -b` and the `scripts/check-*.mjs`
  checks. Without Docker-made screenshots it needs `COMBAT_PLANNER_NO_DOCKER=1`.
- `pnpm test`: unit tests and every story with its `play` in headless Chromium.
- `pnpm e2e`: Playwright end-to-end tests against the real server and database.
- `pnpm screenshots:update`: regenerates the visual baselines in
  `packages/ui/__screenshots__/` inside the `mcr.microsoft.com/playwright` Docker
  image. It is the only command that writes baselines and needs Docker.

## Production

1. Copy the example configuration:

   ```sh
   cp .env.example .env
   ```

2. Set the secrets. Replace the `BETTER_AUTH_SECRET` and `LINK_SECRET` placeholders
   in `.env` with two different values, each the output of:

   ```sh
   openssl rand -hex 32
   ```

3. Build and start:

   ```sh
   docker compose up --build
   ```

- The image runs with `NODE_ENV=production`. The server then refuses to start while
  `BETTER_AUTH_SECRET` or `LINK_SECRET` is missing, shorter than 32 characters, or
  still equal to its `.env.example` placeholder: it exits with a message that names
  the variable, readable with `docker compose logs app`.
- `BETTER_AUTH_URL` is the public URL of the app; `BETTER_AUTH_TRUSTED_ORIGINS`
  lists further allowed origins, comma-separated.
- Google and GitHub sign-in: set both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`,
  or neither; the same for `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. A provider
  with neither value stays off; with only one of them the server refuses to start
  and names the missing variable.
- OAuth callback URLs to register with the providers:
  `<BETTER_AUTH_URL>/api/auth/callback/google` and
  `<BETTER_AUTH_URL>/api/auth/callback/github`.
- The About page links, `VITE_SOURCE_URL` and `VITE_DONATE_URL`, are build
  arguments: compose reads them from `.env` and the build bakes them into the web
  bundle, so a change takes effect with the next `docker compose up --build`. An
  empty value keeps the default link.
- The app listens on port 3000. The SQLite database is `/data/combat-planner.db`.
  The server runs as the `node` user, uid 1000, so `/data` needs a named volume,
  as the `data` volume in `docker-compose.yml`, or a host directory writable by
  uid 1000.
- Health check: `GET /api/health` answers `{"status":"ok"}`.
