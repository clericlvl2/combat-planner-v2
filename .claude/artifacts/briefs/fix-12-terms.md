# Brief: fix-12-terms

Batch `fix-12-terms`. Plan: `.claude/plans/2026-10-19-release-v0.1.0-cleanup-and-publish.md`, step 1 — implement exactly that step.
Rules: `CLAUDE.md` (Code, Commands, Versions), with these overrides:
- Commit subjects are Conventional Commits stating the user-visible result.
- One commit for the whole step is allowed, because domain, API and UI must change together to type-check.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-12-terms`, branch `agent/fix-12-terms`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`, then `export COMBAT_PLANNER_NO_DOCKER=1`.
- Baselines:
  - regenerate with `pnpm exec vp test --project visual --update` (local Chromium);
  - verify with `pnpm exec vp test --project visual`;
  - commit only the PNGs that changed.
- Do not run `pnpm e2e`, `pnpm dev` or Storybook: another batch uses the ports.
- Tool-call limit: 250.

## Units

1. `fix: use 13th Age terms Staggered and hampered` — everything in plan step 1:
   - domain, migration `0001_13th_age_terms.sql` with its test;
   - theme, CSS, i18n in six locales, stories, baselines.

## Acceptance

Plan step 1, Acceptance 1–3. Before the hand-back, run `pnpm check` and `pnpm test`, and both visual runs above.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Questions;
- Left undone;
- Processes left running (`none`).
