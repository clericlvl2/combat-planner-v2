# Brief: docs-autodocs

Batch `docs-autodocs`. The owner wants Storybook's native Docs pages for every
component: autodocs, one Docs entry per stories file. Rules: `CLAUDE.md` (all
sections).

Owner decisions, 2026-10-19:
- Every stories file gets a Docs page, including the flow screens.
- `play` does not run on Docs pages. Docs show each story's initial state.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/docs-autodocs`,
  branch `agent/docs-autodocs`. Work only inside that path.
- Tool-call limit: 150. At the limit, write `REPORT.md`, stop every process,
  and hand back with what is committed.
- Port 6006 belongs to the owner's own Storybook. Do not start or stop
  anything on it.

## Unit, one commit

`autodocs` (`chore(ui): autodocs`):
- `packages/ui/.storybook/preview.tsx`:
  - `tags: ['autodocs']` in `definePreview`;
  - `parameters.docs.story.autoplay` stays `false`.

  If a Docs page needs a parameter to render stories inline at their size,
  set it here and name it in the report.
- `packages/ui/src/storybook/PhoneFrame.module.css`: `.phone` gets
  `contain: layout`. Then `position: fixed` overlays (Sheet, Dialog, Drawer,
  toasts) are positioned inside their own phone frame and do not cover the
  Docs page.
  - Check that stories rendered without `PhoneFrame` but with a
    fixed-position overlay stay inside their story box on a Docs page too.
    Sheet, Dialog and Drawer stories use their own stage with `contain`.
  - Where a stories file has no such container, add one in its stage the
    same way and name the file in the report. Only `storybook/**` and the
    stories files may change.
- No baseline may change. `pnpm exec vp test --project visual` without
  `--update` has to pass as it is.
  - If it fails because `contain: layout` changes a screenshot, stop and
    report the failing stories with their diff instead of regenerating.

## Allowed paths

`packages/ui/.storybook/preview.tsx`, `packages/ui/src/storybook/**`,
`packages/ui/src/**/*.stories.tsx` (stage containers only).

## Pre-commit

`COMBAT_PLANNER_NO_DOCKER=1 pnpm check && pnpm test`.

## Acceptance criteria

1. These exit 0:
   - `COMBAT_PLANNER_NO_DOCKER=1 pnpm check`;
   - `pnpm test`;
   - `pnpm storybook:build`;
   - `pnpm exec vp test --project visual` without `--update`, with no PNG
     changed (`git status` clean under `__screenshots__`).
2. `packages/ui/storybook-static/index.json` lists one `docs` entry per
   stories file: the count of `"type":"docs"` entries equals the count of
   `*.stories.tsx` files. The report gives both numbers.
3. One commit `chore(ui): autodocs`; no comments; trailer as in `CLAUDE.md`.

## Hand-back

`REPORT.md` sections per `CLAUDE.md`. If `REPORT.md` cannot be written,
return its full text as the final message.
