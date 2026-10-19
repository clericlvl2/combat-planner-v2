# Brief: fix-10-docs-sheet-focus

Batch `fix-10-docs-sheet-focus`, done by the orchestrator. Rules: `CLAUDE.md`.

## Defect

`organisms/Sheet/Sheet.tsx` `attachSheet` focuses the sheet on mount. On a
Docs page an open Sheet story takes the page focus at load; on
`organisms-dialog--docs` (`extra-over-sheet`) the first Tab then scrolls the
page to that story.

## Units, one commit each

1. `Sheet`: `SheetProps` gets `autoFocus?: boolean`, default `true`, read
   through Mantine `useProps('CpSheet', defaultProps, props)`; `attachSheet`
   focuses nothing when it is `false`.
2. `docs theme`: `storybook/withDocsTheme.tsx` `docsTheme.components` gets
   `CpSheet: { defaultProps: { autoFocus: false } }`.

No baseline or i18n change.

## Acceptance

1. On `organisms-sheet--docs` and `organisms-dialog--docs`
   `document.activeElement` is `BODY` after load; the first Tab does not
   jump the page to a story.
2. `gate` green.
