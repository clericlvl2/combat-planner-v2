# Brief: fix-1-api-contract

Batch `fix-1-api-contract`, phase 1 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`:
the two P1 findings of `.claude/artifacts/guard/1-api-contract.md`. Rules:
`CLAUDE.md` at the worktree root. Spec: `docs/vision.md` Combat → Share, Roles →
Claims, Connection, Architecture → Data flow 13–15; the existing
`packages/api/src/client.ts` and `client.test.ts`.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-1-api-contract`,
  branch `agent/fix-1-api-contract`. Work only inside that path.
- Tool-call limit: 60. Node 24: `source ~/.nvm/nvm.sh && nvm use`;
  `pnpm install --frozen-lockfile` first.

## Unit, one commit `fix(api): ApiClient`

In `packages/api/src/client.ts`:

1. `link.get(id) → Promise<{ token: string; generation: number }>`: the current
   player link of a combat, DM only, no side effects; `link.reissue` keeps its
   signature and its documented effect (new token, every claim released).
2. `connection: { state(): ConnectionState; subscribe(listener: (state:
   ConnectionState) => void): Unsubscribe }` at the top level of `ApiClient`:
   one connection state for the client, driven by the SSE streams the client
   holds (`'connected'` while a stream is open and healthy, `'reconnecting'`
   after 10 s without a connection per vision Connection, `'offline'` when no
   stream is open); phase 2.4 `FakeApiClient` seeds it from a scenario, phase 3
   derives it from `EventSource`.
3. `combats.subscribe` drops the `viewer` parameter (it is always the DM;
   players use `play.subscribe`) and narrows `onDocument` to `Combat`.

`client.test.ts`: the in-memory implementation gains the new members and still
`satisfies ApiClient`; a test asserts `connection.subscribe` returns an
unsubscribe function and `link.get` returns the seeded token. `index.ts`
re-exports stay complete.

## Allowed paths

`packages/api/src/client.ts`, `packages/api/src/client.test.ts`,
`packages/api/src/index.ts`. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`, `pnpm test`, `pnpm build` exit 0.
2. `ApiClient` has `link.get`, `connection.state`, `connection.subscribe` with
   the types above; `combats.subscribe(id, onDocument: (doc: Combat) => void,
   onEnd) → Unsubscribe`.
3. `client.test.ts` compiles `satisfies ApiClient` and covers the two new
   members.
4. One commit `fix(api): ApiClient` with the trailer; no comments.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`; the hand-back message is the path only.
