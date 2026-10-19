# Brief: fix-19-locale-edges

Batch `fix-19-locale-edges`, a fix batch for `fix-18-dm-locale` (guard `.claude/artifacts/guard/fix-18-dm-locale.md`).
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the result. Where `CLAUDE.md` mentions Docker screenshots, `COMBAT_PLANNER_NO_DOCKER`, check-domain-tests or handoff cells, it is outdated.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-19-locale-edges`, branch `agent/fix-19-locale-edges`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- e2e:
  - only `E2E_PORT=3100 pnpm e2e`;
  - check `ss -ltn` first, and never kill a process you did not start.
- Another batch (`fix-15-geometry`) owns `packages/ui/**`. Do not touch `packages/ui`.
- Tool-call limit: 120.

## Units, one commit each

1. `fix(web): DM routes reach the DM's language even when the session loads late, and an aborted DM navigation leaves the language alone`
   - In `apps/web/src/router.tsx:48-55`:
     - when `cachedSession()` yields no language, the DM layout applies the settings or session language once it arrives (a minimal follower in the DM layout, or a retry in the loader);
     - the loader returns without `changeLanguage` when `request.signal.aborted`.
   - Router-level tests for both paths, failing without the change.
2. `fix(api): a stuck repair refetch no longer blocks later repairs, and an event during a repair gets one follow-up refetch`
   - In `packages/api/src/hono-client.ts:359-374`:
     - the repair state resets on reconnect, and a repair GET has a timeout or abort;
     - a malformed event during an in-flight repair marks one pending follow-up, which runs after the in-flight GET settles. At most one GET runs at a time and at most one is queued.
   - Tests in `packages/api/test/hono-client.test.ts`.

## Acceptance

1. Each unit has its tests, which fail without the change.
2. `pnpm check`, `pnpm test`, `pnpm build` and `E2E_PORT=3100 pnpm e2e` are green.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Questions;
- Left undone;
- Processes left running (`none`).
