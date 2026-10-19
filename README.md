# Combat Planner

A 13th Age combat tracker for in-person play. The DM prepares combats and runs them
from a phone. Players follow the combat on their own phones through a link or QR
code. Many DMs can use one server; each has a private account and library. Free,
funded by donations, self-hostable.

## Quick start

With Docker Compose 2.24 or later:

```sh
docker compose up --build
```

Then open http://localhost:3000.

Without Docker, with pnpm 10 (`corepack enable` or `npm i -g pnpm`); pnpm downloads
Node 24 itself, as pinned by `useNodeVersion` in `pnpm-workspace.yaml`:

```sh
pnpm install
pnpm dev
```

Then open http://localhost:5173.

Neither way needs a `.env` file. On the first start the server generates
`BETTER_AUTH_SECRET` and `LINK_SECRET` and stores them in `secrets.json` next to the
database: `/data` in the `data` volume under Docker, `apps/server/data/` without
Docker. Back up that directory as a whole: a database restored without its
`secrets.json` signs every user out and breaks every player link.

All commands run from the repository root.

## Development

Optional settings go into `.env` at the repository root; `.env.example` lists them.

- `pnpm dev` starts the web app on http://localhost:5173, with `/api` proxied to the
  server, and the server on http://localhost:3000.
- Google and GitHub sign-in stay off while neither their client id nor their secret
  is set. Set both values of a pair or neither: with only one of them the server
  refuses to start and names the missing variable.

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
  checks.
- `pnpm test`: unit tests and every story with its `play` in headless Chromium.
- `pnpm e2e`: Playwright end-to-end tests against the real server and database.
- `pnpm screenshots:update`: regenerates the visual baselines with the local Chromium.

## Production

The image runs with `NODE_ENV=production`. Every setting below is optional and goes
into `.env`, which compose reads when it exists. The server refuses to start on a
wrong value and names the variable, readable with `docker compose logs app`.

- `PORT` is the published host port, 3000 by default; the container listens on 3000.
- `BETTER_AUTH_URL` is the public URL of the app, to set for https or a reverse
  proxy. Then the server accepts requests only from that origin and the
  comma-separated `BETTER_AUTH_TRUSTED_ORIGINS`; without it, from the origin each
  request was sent to.
- `BETTER_AUTH_SECRET` and `LINK_SECRET` set in `.env` take precedence over
  `secrets.json`. Each needs at least 32 characters, for example the output of
  `openssl rand -hex 32`.
- Google and GitHub sign-in: set both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`,
  or neither; the same for `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Callback
  URLs to register with the providers: `<public URL>/api/auth/callback/google` and
  `<public URL>/api/auth/callback/github`.
- The About page source link, `VITE_SOURCE_URL`, is a build argument: the build
  bakes it into the web bundle, so a change takes effect with the next
  `docker compose up --build`. An empty value keeps the default link.
- The database is `/data/combat-planner.db` and the secrets `/data/secrets.json`.
  The server refuses to start on an unreadable or broken `secrets.json` and names
  its path and the server uid instead of generating new secrets.
- A host directory bind-mounted at `/data` must be writable by uid 1000, or the
  service sets `user: "${UID}:${GID}"` with `UID` and `GID` from `id -u` and `id -g`
  in `.env`.
- Health check: `GET /api/health` answers `{"status":"ok"}`.
