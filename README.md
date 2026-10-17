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
GitHub sign-in stay off until their client id and secret are set.

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

```sh
cp .env.example .env
docker compose up --build
```

- Secrets live in `.env`: set `BETTER_AUTH_SECRET` and `LINK_SECRET` to random
  strings of at least 32 characters, for example `openssl rand -hex 32`. The server
  refuses to start in production without them.
- `BETTER_AUTH_URL` is the public URL of the app; `BETTER_AUTH_TRUSTED_ORIGINS`
  lists further allowed origins, comma-separated.
- OAuth callback URLs to register with the providers:
  `<BETTER_AUTH_URL>/api/auth/callback/google` and
  `<BETTER_AUTH_URL>/api/auth/callback/github`.
- The app listens on port 3000. The SQLite database is
  `/data/combat-planner.db` in the `data` volume.
- Health check: `GET /api/health` answers `{"status":"ok"}`.
