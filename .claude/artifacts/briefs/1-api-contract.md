# Brief: 1-api-contract

Batch `1-api-contract`, phase 1 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
Rules: `CLAUDE.md` at the worktree root. Spec: plan section «Фаза 1», block
`1-api-contract`, and «Фаза 3 — сервер» (the routes the client mirrors);
`docs/vision.md` sections Pages, Features (Combat list, Combat → Share, Library,
Settings, Account), Player view → Link, Connection, Toasts, Architecture
(Actions 2–6, Data flow 11–15). `packages/domain` on `master` is the type
source (`Combat`, `PlayerCombat`, `Action`, `Preset`, `Tag`, `Viewer`). No
renders.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/1-api-contract`,
  branch `agent/1-api-contract`. Work only inside that path.
- Tool-call limit: 120. Node 24: `source ~/.nvm/nvm.sh && nvm use`;
  `pnpm install --frozen-lockfile` first.

## Unit, one commit `feat(api): ApiClient`

`packages/api/src/client.ts`: the interface every later batch implements or
consumes without change (`FakeApiClient` in 2.4, the Hono client in 3, hooks in
2.4, `apps/web` in 4). Types only, plus Zod schemas for the wire shapes that the
domain does not already define; no implementation.

- `ApiClient` with groups: `auth` (`signUp({ email, password, displayName })`,
  `signIn({ email, password })`, `signOut()`, `session() → Session | null`);
  `combats` (`list() → CombatSummary[]`, `create(input) → Combat`, `update(id,
  patch: { title?, description?, color? }) → { version }`, `remove(id)`,
  `duplicate(id, newId) → Combat`, `open(id) → Combat` (sets last played),
  `get(id) → Combat`, `dispatch(id, action) → { version }`, `subscribe(id,
  viewer, onDocument: (doc: Combat | PlayerCombat) => void, onEnd: (event:
  ApiEndEvent) => void) → () => void`); `link` (`reissue(id) → { token,
  version }`); `play` (`get(token) → { combatId, playerId, combat: PlayerCombat
  }`, `subscribe(token, …)` mirrors `combats.subscribe` for the player
  identity); `presets` (`list`, `create`, `update`, `remove`, `duplicate`);
  `tags` (`list`, `create`, `rename`, `remove`); `settings` (`get`, `update({
  language })`); `account` (`update({ displayName })`, `remove()`).
- `ApiEvent = { type: 'document', version, document } | { type: 'deleted',
  title } | { type: 'linkRevoked' }`; `ApiEndEvent` is the `deleted` or
  `linkRevoked` member; `ApiError extends Error` with `status`, `code`
  (`'version' | 'forbidden' | 'notFound' | 'invalid' | 'unauthorized' |
  'network'`), and `retryable: boolean`.
- `CombatSummary` (list row: id, title, description, color, status, unit
  count, last played, updated); `CombatCreateInput` (id, title, description,
  color); `Session` (user id, email, display name, language); `PlayerIdentity`
  (`playerId`, `displayName`); `ConnectionState = 'connected' | 'reconnecting'
  | 'offline'`.
- Every method returns a `Promise` except `subscribe`, which returns the
  unsubscribe function. Idempotency per vision Actions 3: `dispatch` with a
  known action id resolves with the earlier result.
- `packages/api/src/index.ts` re-exports the client types next to the existing
  exports. One test `packages/api/src/client.test.ts` that type-checks a
  minimal in-memory implementation against the interface (a compile-time test:
  `satisfies ApiClient`) and asserts `ApiError` carries `status` and `code`.

## Allowed paths

`packages/api/src/client.ts`, `packages/api/src/client.test.ts`,
`packages/api/src/index.ts`, `packages/api/package.json` (only to add
`@combat-planner/domain` as a workspace dependency), `pnpm-lock.yaml` only for
that link. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build` exit 0.
2. `ApiClient` names every group and method listed above with explicit
   parameter and return types drawn from `@combat-planner/domain`; no `any`,
   no `unknown` in a return type.
3. `ApiEvent`, `ApiEndEvent`, `ApiError`, `CombatSummary`, `Session`,
   `PlayerIdentity`, `ConnectionState` are exported from `packages/api/src/index.ts`.
4. `client.test.ts` compiles an in-memory object `satisfies ApiClient`.
5. One commit `feat(api): ApiClient`; no comments.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
