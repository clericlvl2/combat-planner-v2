# Brief: fix-14-open-defects

Batch `fix-14-open-defects`. Plan: `.claude/plans/2026-10-19-release-v0.1.0-cleanup-and-publish.md`, step 3 — implement exactly that step.
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the user-visible result.

The routed findings to check are in `.claude/artifacts/2026-10-16-handoff-build-progress.md`, section «Замечания guard-bee P2–P3, отложены» (lines 697–1093). Check every item marked `→ fix-…` or `→ <batch>`. Skip items about process or docs: `check-commit`, `check-domain-tests`, `merge.sh`, `gate.sh`, trailers, `CLAUDE.md`, vision, handoff.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-14-open-defects`, branch `agent/fix-14-open-defects`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- Baselines:
  - regenerate with `pnpm screenshots:update`;
  - verify with `pnpm exec vp test --project visual`;
  - commit only the PNGs that changed.
- e2e:
  - only `E2E_PORT=3100 pnpm e2e`;
  - check `ss -ltn` first, and never kill a process you did not start.
- Tool-call limit: 300.

## Units, one commit each

One commit per numbered item 1–9 of plan step 3, in that order, plus one commit per routed finding you fix. Each subject states the user-visible or developer-visible result, e.g. `fix(api): a combat copy starts at version 1`.

## Acceptance

Plan step 3, Acceptance 1–3. Before the hand-back, run `pnpm check`, `pnpm test`, the two visual runs above and `E2E_PORT=3100 pnpm e2e`.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Routed findings: one line each, with status fixed / already fixed / not reproducible and file:line;
- Questions;
- Left undone;
- Processes left running (`none`).
