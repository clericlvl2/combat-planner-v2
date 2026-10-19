# Brief: fix-8-docs-overlays

Batch `fix-8-docs-overlays`, done by the orchestrator. Rules: `CLAUDE.md`.

## Defect

On the Docs pages `organisms-dialog--docs` and `organisms-drawer--docs`
every open story mounts `RemoveScroll` (`Dialog.tsx:56`, `Drawer.tsx:79`)
and `FocusTrap active` (`Dialog.tsx:60`, `Drawer.tsx:82`) in the shared
docs document: `body[data-scroll-locked]` blocks page scroll and Tab cycles
inside the last open overlay.

## Units, one commit each

1. `Dialog`: `Dialog.stories.tsx` meta `parameters.docs.story` gets
   `{ inline: false, height: '876px' }`. 876 = phone frame 844 + canvas
   padding 2 × 16.
2. `Drawer`: the same in `Drawer.stories.tsx`.

No component, baseline or i18n change.

## Acceptance

1. On both Docs pages `body` has no `data-scroll-locked`, PageDown scrolls,
   Tab after a click on the page title leaves the stories.
2. Every story renders in its own iframe, the phone frame fully visible.
3. `gate` green.
