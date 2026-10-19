# Brief: fix-18-dm-locale

Batch `fix-18-dm-locale`, a fix batch for `fix-14-open-defects` (guard `.claude/artifacts/guard/fix-14-open-defects.md`).
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the result. Where `CLAUDE.md` mentions Docker screenshots, `COMBAT_PLANNER_NO_DOCKER`, check-domain-tests or handoff cells, it is outdated.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-18-dm-locale`, branch `agent/fix-18-dm-locale`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- e2e:
  - only `E2E_PORT=3100 pnpm e2e`;
  - check `ss -ltn` first, and never kill a process you did not start.
- Another batch (`fix-15-geometry`) runs at the same time and owns `packages/ui/**` stories. Do not touch `packages/ui`.
- Tool-call limit: 150.

## Units, one commit each

1. `fix(web): DM routes show the DM's language from the first frame`
   - The DM's settings language is applied before the DM route renders. Use the route loader of the session-guarded DM layout (`apps/web/src/router.tsx`, `requireSession`), or a layout effect — whichever runs before paint.
   - `DmLocale` in `apps/web/src/pages.tsx:48-56` is removed or reduced to following later settings changes.
   - The test proves that i18n holds the DM's language when the DM route's element first renders, for two paths: from a player route, and from sign-in / a system route.
     - Use a router-level test in `apps/web/src/*.test.ts` that asserts the language at loader completion, or an e2e in `e2e/app-wiring.spec.ts` that reads `document.documentElement.lang` on the first frame (e.g. via a `MutationObserver` installed with `page.addInitScript`).
     - The test fails against the current `useEffect` version.
2. `fix(api): owner sub-apps are no longer exported without the session check`
   - `packages/api/src/index.ts:7,16-18` stops exporting `actionsApp`, `combatsApp`, `eventsApp` and `linkApp`, or exports them only already wrapped in `requireUser`.
   - Callers are updated.
3. `fix(api): a burst of malformed live events triggers one refetch`
   - In `packages/api/src/hono-client.ts:364-372`, a refetch already in flight is reused, and a malformed event during it starts no second GET.
   - Test in `packages/api/test/hono-client.test.ts`.

## Acceptance

1. Each unit has its test, which fails without the change.
2. `pnpm check`, `pnpm test`, `pnpm build` and `E2E_PORT=3100 pnpm e2e` are green.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Questions;
- Left undone;
- Processes left running (`none`).
