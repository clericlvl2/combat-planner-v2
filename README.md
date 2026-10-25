# Combat Planner

Unofficial combat tracker for the 13th Age Roleplaying Game.

The DM prepares combats and runs them from a phone. Players follow the combat on their own phones
through a link or QR code. Many DMs can use one server; each has a private account and library.
Free and self-hostable.

## Quick start

`docker compose up --build` (Docker Compose 2.24+), then http://localhost:3000. Without Docker:
`pnpm install && pnpm dev` (pnpm 10; it fetches Node 24 itself), then http://localhost:5173.
Optional settings: [.env.example](.env.example). Back up `secrets.json` together with the database
next to it: without it every user is signed out and every player link breaks.

## Development

- `pnpm dev`: web on http://localhost:5173 (`/api` proxied), server on http://localhost:3000.
- `pnpm storybook`: every component and screen on http://localhost:6006, no server needed.
- `pnpm check`: format, lint, type check and the `scripts/check-*.mjs` checks.
- `pnpm test` / `pnpm e2e`: unit tests and stories in headless Chromium / Playwright against the
  real server on port 3000 (`E2E_PORT`).

## Production

A VPS with HTTPS and continuous database backup: [deploy/README.md](deploy/README.md).

## Releases

Work happens on a short-lived branch from `main`, merged through a pull request to `main`. A
release is a manual run of the `release` workflow on `main` with a green `ci` check; it creates
the tag `vX.Y.Z` and its GitHub Release, pushes the image
`ghcr.io/clericlvl2/combat-planner-v2:X.Y.Z` (also tagged `X.Y` and `latest`) and deploys it after
the owner's approval: [deploy/README.md](deploy/README.md).

## Legal

Combat Planner uses trademarks and/or copyrights owned by Fire Opal Media Inc., which
are used under the Fire Opal Media Inc., 13th Age Community Use Policy. We are
expressly prohibited from charging you to use or access this content. Combat Planner
is not published, endorsed, or specifically approved by Fire Opal Media. 13th Age is
a trademark of Fire Opal Media Inc.

The MIT license covers the source code only and grants no rights to Fire Opal Media
trademarks; forks must comply with the 13th Age Community Use Policy themselves.

Code: [MIT](LICENSE). Third-party assets: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Security
reports: [SECURITY.md](SECURITY.md).
