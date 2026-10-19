# Brief: fix-16-about-e2e

Batch `fix-16-about-e2e`. Plan: `.claude/plans/2026-10-19-release-v0.1.0-cleanup-and-publish.md`, step 5 — implement exactly that step.
Rules: `CLAUDE.md` (Code, Commands, Versions); commit subjects are Conventional Commits stating the user-visible result.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-16-about-e2e`, branch `agent/fix-16-about-e2e`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`, then `export COMBAT_PLANNER_NO_DOCKER=1`.
- Baselines:
  - regenerate with `pnpm exec vp test --project visual --update`;
  - verify with `pnpm exec vp test --project visual`;
  - commit only the PNGs that changed.
- e2e:
  - run only `E2E_PORT=3100 pnpm e2e`. Port 3000 may be used by another batch.
  - Check `ss -ltn` first, and never kill a process you did not start.
- Tool-call limit: 200.

## Units, one commit each, in this order

1. `feat(ui): show the 13th Age Community Use Policy notice in About and drop the donate row`. Covers the About part of step 5, including `apps/web` `about.ts`, `env.d.ts`, tests and stories.
2. `fix(web): link the About source to github.com/clericlvl2/combat-planner-v2`.
3. `chore: set version 0.1.0`.
4. `test(e2e): take the server port from E2E_PORT and fail when no tests run`.

## Acceptance

Plan step 5, Acceptance 1–3. Acceptance 2 uses port 3100; do not use 3000.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Questions;
- Left undone;
- Processes left running (`none`).
