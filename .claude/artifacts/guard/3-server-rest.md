# Guard: 3-server-rest

Range `23c4e54..3a92985` (09456b6 auth, a276c7b presets, b3ef785 tags, 1e8357e settings, 3a92985 account). Read-only; gate logs `.claude/run/3-server-rest/`. Guard on Opus 5.5 xhigh.

CRIT 1 PASS .claude/run/3-server-rest/summary.log:4-13 — check, test (57 files, 1039 tests), build exit 0 on the merged tip.
CRIT 2 PASS packages/api/test/auth.test.ts:22-97 — 401 before sign-in (22), sign-up sets the cookie (27), 200 with it (65), sign-out → 401 (73), sign-in reopens (91), through `app.request` with the cookie jar (test/helpers.ts:132-153); every route of presets, tags, settings, account tested.
CRIT 3 PASS packages/api/test/tags.test.ts:46,53,64,122 — 24 chars ok, 25 → 400, ` BOSS ` → 409, rename to another tag's name → 409; presets.test.ts:205 delete keeps the unit; presets.test.ts:160 copy first with `createdAt = updatedAt`.
CRIT 4 PASS packages/api/src/app.ts:34-47, packages/api/src/hono-client.ts:82-84 — `AppType` covers all 11 sub-apps; `ClientApp` from `AppSchema`; no stubs; build exit 0.
CRIT 5 PASS 5 commits with the brief's subjects; only `/*` is a string literal at auth/index.ts:64; `client.ts` untouched.

Checked, no finding: cookie defaults (HttpOnly, SameSite=Lax, Secure + `__Secure-` on https), owner scoping on every route with foreign-row tests, account deletion cascade in one transaction with `deleted` after commit, preset limit inside a transaction, tag uniqueness in code and by unique index.

## Scope check

18 files, all in scope; `package.json` and lockfile unchanged; largest commit 529 lines.

## Findings

1. P2 packages/api/src/auth/index.ts:16-33 — display-name limit enforced only by `PATCH /account`: Better Auth sign-up (`name: z.string()`), `/auth/update-user` through the `/*` mount (auth/index.ts:73-76) and social profile names are unbounded; `findSession` (account/store.ts:21-25) returns it unchecked and the client parses `displayNameSchema` 1–40 (client.ts:42, hono-client.ts:143-149), so such a user gets a ZodError on `signUp`/`signIn`/`session()`. Fix: clamp or reject in `databaseHooks.user.create.before`/`update.before` per `LIMITS.displayName`; add `/update-user` to `disabledPaths`.
2. P2 (hypothesis) packages/api/src/auth/index.ts:17-33 — no `trustedOrigins`; under `pnpm dev` the browser posts from `http://localhost:5173` through the Vite proxy, which keeps Origin, and Better Auth's origin check rejects sign-up/in/out. Tests run with `NODE_ENV=test`, where Better Auth skips origin and CSRF checks. Fix: trusted origins from env (`BETTER_AUTH_TRUSTED_ORIGINS` or an `ApiEnv` key), dev value in `apps/server/.env.example`, one auth test with the origin check forced on.
3. P3 packages/api/src/auth/index.ts:73-76 — the wildcard mount exposes every Better Auth endpoint; `/change-password` contradicts vision Account ("The password is set once, at sign-up"). Fix: list unused endpoints in `disabledPaths`.
4. P3 packages/api/src/auth/index.ts:48-62 — `AuthRoutes` input/output types are hand-written, not tied to `auth.api.*` return types.

## Outside the reviewed scope

- `ApiClient` (packages/api/src/client.ts) has no social sign-in method and no way to learn which providers are configured; vision Account shows a provider only when configured. Server side (`/auth/sign-in/social`) is ready.

5 pass / 0 fail / 0 unverifiable; scope held.
