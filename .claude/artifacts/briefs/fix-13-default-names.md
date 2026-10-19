# Brief: fix-13-default-names

Batch `fix-13-default-names`. Plan: `.claude/plans/2026-10-19-release-v0.1.0-cleanup-and-publish.md`, step 2 — implement exactly that step.
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the user-visible result. Checks no longer read `docs/` or require Docker.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-13-default-names`, branch `agent/fix-13-default-names`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- Baselines:
  - regenerate with `pnpm screenshots:update` (local Chromium);
  - verify with `pnpm exec vp test --project visual`;
  - commit only the PNGs that changed.
- Do not run `pnpm e2e`, `pnpm dev` or Storybook: another batch runs at the same time.
- Tool-call limit: 250.

## Units, one commit each, in this order

1. `feat(ui): an empty combat title saves as "Combat <date>"` — CombatFormSheet, CombatList stories.
2. `feat(ui): an empty unit name saves as the first free "<Role> N"` — UnitForm (`unitNames` prop) and CombatScreen.
3. `feat(ui): an empty preset name saves as "<Role> 1"` — PresetFormSheet, Library stories.

In every form, editing with an empty field keeps the previous name. i18n changes go into the commit of the form they belong to.

## Acceptance

Plan step 2, Acceptance 1–2. Before the hand-back, run `pnpm check`, `pnpm test` and the two visual runs above.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Questions;
- Left undone;
- Processes left running (`none`).
