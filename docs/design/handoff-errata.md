# Handoff errata

Lines of `docs/design/handoff/` that do not apply to the build. The bundle itself is
not edited.

- `README.md`, "About the design files": the sentence inviting to pick a stack
  does not apply. The stack is in `docs/vision.md`.
- `README.md`, "Fidelity" and "Open questions": copy, HP terms, the small-phone
  width and the Last played label are settled in `docs/vision.md`; the base width
  is 390 and nothing narrower is handled.
- `README.md`, "Out of scope for now": the Mantine mapping is done in
  `packages/ui/src/theme.ts`; dark theme, desktop layouts, redo, password reset,
  offline and loading states stay out.
- `README.md`, "Key interaction rules" and "State and data": where they differ
  from `docs/vision.md`, vision.md applies. Known differences: players hold several
  heroes and pick them with checkboxes; a player edits their own hero through
  Edit; the player initiative popover works in Active too; preset defenses are
  0–99; the preset form has an initiative bonus field; the Create row in the tag
  sheet appears only when no tag matches; a preset copy sorts to the top; the
  Undo toast has no Redo; About has more rows.
- `README.md`, "Files": `docs/VISION-UPDATES.md` and `docs/TODO.md` are in
  `docs/archive/`; `docs/CLAUDE.md` is `docs/PROTOTYPE-RULES.md`.
- `docs/PROTOTYPE-RULES.md`: rules for editing the prototypes, not for the app;
  the line "update nav.js in the same turn" never applies.
- `nav.js` and every page: `status="Draft"` and `status: 'Draft'` mark the
  prototype stage, not unfinished design. Every page is final.
- Fonts and icons load from Google Fonts and jsDelivr in the prototypes; the app
  self-hosts them through `@fontsource/*` and `@tabler/icons-react`.
- `docs/design/renders/`: PNG of every page (`<Name>.png`) and every flow
  (`<Screen>-<CODE>.png`) at 1280 wide, taken from the served bundle; the source of
  pixels for agents and guard-bee.
