# Brief: fix-22-geometry-selectors

Batch `fix-22-geometry-selectors`, a fix batch for `fix-21-geometry-scope`. The guard is `.claude/artifacts/guard/fix-21-geometry-scope.md`.
Rules: `CLAUDE.md` (Code, Commands, Versions). Commit subjects are Conventional Commits stating the result. Where `CLAUDE.md` mentions Docker screenshots, `COMBAT_PLANNER_NO_DOCKER`, check-domain-tests, handoff cells or Extra prefixes, it is outdated.

## Worktree

- Path `/home/artem-budarnyh/projects/combat-planner-v2.wt/fix-22-geometry-selectors`, branch `agent/fix-22-geometry-selectors`. Work only there; run `pnpm install --frozen-lockfile` first.
- Every shell: `source ~/.nvm/nvm.sh && nvm use`.
- Do not start Storybook or a dev server.
- Tool-call limit: 80.

## Units, one commit each

1. `fix(ui): an opt-out selector that matches nothing fails the story`
   - In `geometry.ts`, every `except` selector must match at least one element in the story, or the check fails and names the selector.
   - Fix any stale selector this uncovers.
2. `fix(ui): the PresetCard opt-out excuses only the tag line`
   - Replace `span:first-child + span:last-child` (`PresetCard.stories.tsx:329`) with a selector that matches only the tag line. Use a `data-*` attribute on the tags element in `PresetCard.tsx` if the class is hashed.
3. `test(ui): the note frame tap is proven to focus the editor`
   - The play blurs the textarea first, then clicks inside the frame at a point outside the textarea and its label (padding offset).
   - It must fail without `focusEditor` (`NoteField.tsx:65-70`). Verify this by temporarily removing the handler.
4. `fix(ui): labelled Checkbox and Radio rows use the tap-target token`
   - `Checkbox.module.css:18` and `Radio.module.css:18`: `min-height: var(--cp-tap-target)`.

## Acceptance

1. Guard findings 1–4 are fixed. No baseline changes, or each change is listed with its cause.
2. `pnpm check`, `pnpm test`, `pnpm exec vp test --project visual` and `pnpm build` are green.

## Hand-back

The final message is the report, sections in this order:
- Commits (hash, subject);
- Checks run (command, result);
- Changed baselines with cause;
- Questions;
- Left undone;
- Processes left running (`none`).
