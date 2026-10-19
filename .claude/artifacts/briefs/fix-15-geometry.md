# Brief: fix-15-geometry

Batch `fix-15-geometry`. Plan: `.claude/plans/2026-10-19-release-v0.1.0-cleanup-and-publish.md`, step 4 — implement exactly that step.
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the result. Where `CLAUDE.md` mentions Docker screenshots, `COMBAT_PLANNER_NO_DOCKER`, check-domain-tests or handoff cells, it is outdated.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-15-geometry`, branch `agent/fix-15-geometry`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- Baselines must not change. Verify with `pnpm exec vp test --project visual`, the full run only.
  - If a component fix for a geometry violation changes pixels, regenerate with a full `pnpm screenshots:update`, and list every changed PNG and why in the report.
- Do not run `pnpm e2e`, `pnpm dev` or Storybook.
- Tool-call limit: 300.

## Units, one commit each, in this order

1. `test(ui): shared geometry helpers replace the local fit checks`
   - `packages/ui/src/storybook/geometry.ts`;
   - ShareSheet and PlayerRow stories use the helpers.
2. `test(ui): every story checks overflow, tap targets, frame bounds, truncation and overlays`
   - preview `afterEach` plus the `parameters.geometry` opt-outs;
   - component fixes for real violations go in separate commits, before this one, each named after the fix, e.g. `fix(ui): the Chip close button is a 44 px tap target`.
3. `feat(ui): stories take the phone width from a viewport global`
   - `layout.viewports` and the global `viewport`;
   - PhoneFrame takes its width from the global.

## Acceptance

Plan step 4, Acceptance 1–3. Before the hand-back, run `pnpm check`, `pnpm test` and the full visual run.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Opt-outs: story, check, reason;
- Questions;
- Left undone;
- Processes left running (`none`).
