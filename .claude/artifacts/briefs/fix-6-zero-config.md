# Brief: fix-6-zero-config

Batch `fix-6-zero-config`. The plan for this batch is
`.claude/plans/2026-10-18-one-command-start.md`, and it is the full
specification: units, paths, decisions and checks. Read it first. Rules:
`CLAUDE.md` (all sections).

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-6-zero-config`,
  branch `agent/fix-6-zero-config`. Work only inside that path.
- Tool-call limit: 250. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed.
- Never print a secret value; in shell use only `${VAR:+set}`.
- Port 3000 and 5173: check that they are free with `ss -ltn` before starting
  a server. Never kill a process you did not start, and stop your own before
  the hand-back.
- Docker: run `docker compose up --build` only if `docker ps` works. Otherwise
  report it as not run. Never use `sudo`.

## Units, in this order, one commit each

The four commits named in the plan's section «Единица работы»:
`fix(server): secrets`, `chore(toolchain): node version`,
`chore(docker): compose`, `docs(docker): README`.

## Allowed paths

The paths the plan names per unit. Nothing else.

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`. For units 1 and 2, also
`pnpm build && pnpm e2e`.

## Acceptance criteria

1. These exit 0:
   - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
   - `pnpm test`;
   - `pnpm build`;
   - `pnpm storybook:build`;
   - `pnpm e2e` (21 passed).
2. Every check in the plan's section «Проверка» is done. The report shows the
   commands and their status lines, never a secret value.
3. A clean clone starts with `pnpm install` then `pnpm dev`, with no `.env`
   and host Node 22. Sign-up works through 5173, and the session survives a
   restart.
4. The image layout starts in production with no secret variables. Sign-up
   works, and the session survives a restart.
5. Four commits with the subjects above, inside their paths; no comments;
   trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`. If `REPORT.md` cannot be written,
return its full text as the final message. Otherwise the hand-back message is
the path only.

## Addendum 2026-10-18 (after the first hand-back)

Units 5–8 are in the plan's section «Решения после первого прогона». They go
in the same branch, one commit each, with these subjects:
- `fix(server): env file`;
- `fix(web): proxy`;
- `fix(api): secure cookies`;
- `chore(docker): dockerignore`.

Allowed paths: the ones that section names.

Acceptance criterion 3 must now hold on a fresh clean clone, with no `.env`
and host Node 22:
- `pnpm install`, then `pnpm dev` starts both processes;
- sign-up through `http://localhost:5173/api` with
  `Origin: http://localhost:5173` gets 200;
- a cookie that is not `Secure` comes back;
- after both processes restart, `get-session` through 5173 still returns the
  user.

Repeat the image-layout run and confirm the cookie has no `Secure`. The full
pre-commit and `pnpm e2e` are green.
