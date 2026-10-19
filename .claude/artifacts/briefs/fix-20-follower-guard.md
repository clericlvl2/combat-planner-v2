# Brief: fix-20-follower-guard

Batch `fix-20-follower-guard`, a fix batch for `fix-19-locale-edges` (guard `.claude/artifacts/guard/fix-19-locale-edges.md`).
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the result. Where `CLAUDE.md` mentions Docker screenshots, `COMBAT_PLANNER_NO_DOCKER`, check-domain-tests or handoff cells, it is outdated.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-20-follower-guard`, branch `agent/fix-20-follower-guard`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- e2e:
  - only `E2E_PORT=3100 pnpm e2e`;
  - check `ss -ltn` first, and never kill a process you did not start.
- Another batch owns `packages/ui/**`. Do not touch it.
- Tool-call limit: 100.

## Units, one commit each

1. `fix(web): the DM language follower only applies while a DM page is shown`
   - The late-session follower in `apps/web/src/router.tsx` applies the language only when the router state is idle, has no errors, and its matches include route id `'dm'`. Mirror `usesBrowserLocale` in `routeLocale.ts:24`.
   - `createRoutes` gets a router getter.
   - `leaveDm()` stays.
   - Router-level tests:
     - a DM child render error, then a late session: the error page keeps the browser language;
     - a test that walks the route tree and asserts every top-level route outside `dm` has a loader that stops the follower.
2. `fix(api): a reconnect refetch and a repair never run at the same time`
   - In `packages/api/src/hono-client.ts:437`, the reconnect refetch goes through the same in-flight slot as `repair`: one GET at a time, with a timeout and abort. Nothing is delivered after `close`.
   - Test in `hono-client.test.ts`.

## Acceptance

1. The new tests fail without the change; the route-walk test passes on the current tree.
2. `pnpm check`, `pnpm test`, `pnpm build` and `E2E_PORT=3100 pnpm e2e` are green.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Questions;
- Left undone;
- Processes left running (`none`).
