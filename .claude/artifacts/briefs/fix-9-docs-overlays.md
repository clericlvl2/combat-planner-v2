# Brief: fix-9-docs-overlays

Batch `fix-9-docs-overlays`, done by the orchestrator. Rules: `CLAUDE.md`.

## Defect

On `organisms-dialog--docs` and `organisms-drawer--docs` every open story
mounts `RemoveScroll` and an active `FocusTrap` in the shared docs document:
the page scroll locks and Tab cycles inside the last open overlay. Stories in
their own iframes (`docs.story.inline: false`) steal focus on load, run `play`
on the docs page and jump the scroll, so stories stay inline.

## Units, one commit each

1. `Dialog`: `DialogProps` gets `lockScroll?: boolean` and
   `trapFocus?: boolean`, defaults `true`, read through Mantine
   `useProps('CpDialog', defaultProps, props)`. `lockScroll` drives
   `RemoveScroll enabled`, `trapFocus` drives `FocusTrap active`.
   `Dialog.stories.tsx` meta drops `docs.story`.
2. `Drawer`: the same props through `useProps('CpDrawer', …)`; `trapFocus`
   also gates the effect that focuses the panel on open. `Drawer.stories.tsx`
   meta drops `docs.story`.
3. `docs theme`: `storybook/withDocsTheme.tsx` `docsTheme.components` gets
   `CpDialog` and `CpDrawer` with `defaultProps: { lockScroll: false,
   trapFocus: false }`.

The keys are `CpDialog` and `CpDrawer` because Mantine owns `Dialog` and
`Drawer` in `theme.components`. No baseline or i18n change.

## Acceptance

1. On both Docs pages `body` has no `data-scroll-locked`, the first PageDown
   scrolls, `activeElement` stays `BODY` after load, Tab after a click on the
   title leaves the stories.
2. Stories render inline; no `play` runs on the docs pages.
3. `gate` green.
