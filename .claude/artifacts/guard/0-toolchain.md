# Guard: 0-toolchain

Range 418e001..f49f584, guard-bee Fable 5.1 higher, read-only.

CRIT 1 PASS .claude/run/0-toolchain/summary.log:1
CRIT 2 PASS apps/web/vite.config.ts:9
CRIT 3 PASS vite.config.ts:64
CRIT 4 PASS scripts/screenshots-update.sh:8
CRIT 5 PASS CLAUDE.md:185
CRIT 6 PASS scripts/check-comments.mjs:117
CRIT 7 PASS .claude/run/0-toolchain/check-commit.log:1

## Findings

- P3 scripts/check-commit.sh:67 The 1500-line cap excludes `pnpm-lock.yaml` and `**/__screenshots__/**`; CLAUDE.md Checks does not say so.
- P3 scripts/check-commit.sh:45 `CLAUDE.md` accepted only in unit `CLAUDE.md commands`; the phase-0.5 unit `check scripts` edits CLAUDE.md Commands.
- P3 scripts/check-commit.sh:35 Unit-name validation is a fixed-string `grep -qF` over the plan and briefs; a unit that is a substring of prose passes.
- P3 scripts/check-comments.mjs:66 Hypothesis: a JsxText node starting with `//` or `/*` would be reported as a comment.
- P3 .claude/run/0-toolchain/check.log:1 The gate ran under Node v22.12.0 (orchestrator gate script called `nvm use` before entering the worktree).

Totals: 7 pass / 0 fail / 0 unverifiable; scope held.
