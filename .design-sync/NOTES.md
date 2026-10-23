# Design sync notes: @combat-planner/ui → Claude Design project "WIP"

Shape `storybook`. Reference Storybook: `.design-sync/sb-reference` (built from `packages/ui/.storybook`).

## Build

- `node .design-sync/build-ui.mjs` builds `packages/ui/dist`: Vite lib build from `.design-sync/ui-entry.ts`, `.d.ts` from `tsc -b` copied to `dist/types` with `.ts`/`.tsx` specifiers rewritten to `.js`, and `dist/design-sync.css` = Mantine `styles.layer.css` + `dist/index.css`. `packages/ui/package.json` `publishConfig.types` points the converter at `dist/types/index.d.ts`.
- `@fontsource/*` resolve to an empty module in the lib build; fonts ship through `cfg.extraFonts`. Inlined fonts made the CSS 27 MB.
- The full converter build needs `NODE_OPTIONS=--max-old-space-size=8192`; without it esbuild stops with "The service was stopped".
- Full build plus validate takes about 40 min, mostly preview compilation. Presentation-only edits (`cardMode`, `primaryStory`) need only `node .ds-sync/lib/preview-rebuild.mjs --components A,B --node-modules packages/ui/node_modules --out ./ds-bundle --config .design-sync/config.json`.

## Fixes [GENERAL]

- `.design-sync/ui-entry.ts` re-exports `src/index.ts` plus story-only helpers (`PopoverFrame`, `hpAfter`, `combatSorts`, `presetSorts`). Stories import them by relative path, which resolves to the DS global; without the export they are undefined.
- `cfg.extraEntries`: `react-router`, `@tanstack/react-query`, `react-i18next`. Each must be one instance with the DS: router context, `QueryClient` instanceof in `withApi`, and `useTranslation` in stories reading the `UiProvider` i18n.
- `overrides/source-storybook.mjs` (fork):
  - the decorator bundle loads `.woff`/`.woff2`/`.ttf` as empty;
  - relative imports under `packages/ui/src/` outside `src/storybook/` resolve to the DS global, so `provider.tsx` and its Vite-only `import.meta.glob` never bundle;
  - `cfg.extraEntries` resolve to the DS global;
  - preview loaders run synchronously into the global decorator context.
- `overrides/story-imports.mjs` (fork):
  - `@storybook/react-vite` is a CSF-factory stub: `definePreview(p).meta(m).story(s)` returns story objects with meta merged in, because the story modules export no default meta;
  - each story runs the preview decorators itself, behind a setup decorator that sets `ctx.globals` (initialGlobals, meta, story), `ctx.parameters` and `ctx.loaded` (preview loaders, once per story). That gives each story its phone frame, locale and API scenario;
  - `storybook-addon-remix-react-router` becomes a memory router built from `parameters.reactRouter` on the DS `react-router`.
- `storyImports.shim` covers `provider.tsx`, `api/`, `layout.ts`, `theme.ts`.

## Component-specific

- `cardMode: "single"`: overlays and sheets (Dialog, Drawer, Sheet, ShareSheet, SortSheet, TagSheet, UnitForm, NumpadSheet, Menu, HpHistory, ConditionPicker) and Library (its grid is 87 000 px tall). `cardMode: "column"`: stories wider than a grid cell (SignIn and the form molecules listed in config).

- `overrides.CombatList.primaryStory: "Default"`: the CombatList card shows the list, not a story with an open sheet.

## Re-sync risks

- A new story-only export imported by a story by relative path needs a line in `.design-sync/ui-entry.ts`.
- A new bare package that a story or a decorator shares state with (a context, a class checked with instanceof) needs `cfg.extraEntries`.
- `[TOKENS_MISSING]` lists Mantine's runtime-only variables (`--input-fz`, `--group-child-width`, …) and `--cp-*`, which `cssVariablesResolver` sets at runtime: expected.

## Grading

- Preview captures sit in a 24 px page margin on a taller cream band than the Storybook canvas (offset about +40 px): framing, not a component delta.
- Stories whose state comes from a `play` render in the preview in their pre-play state.
- Compare covers the first 6 stories per component (`--max-stories` default); tail variants are sibling-trusted.
- [GENERAL] Compare captures the preview side at the card viewport (`fullPage: false`, default 900x700) and the Storybook side as the whole 844 px `#storybook-root`. The phone frame starts about 40 px down, so anything in its bottom ~180 px (sheet footers, Toast, BottomBar, TurnBar, screens) falls below the fold. Every component with bottom-anchored phone-frame content and every screen carries `overrides.<Name>.viewport: "900x930"`; screens are `cardMode: "single"`. A viewport change needs the full build and re-grades the component.
- Grading covers the first 6 stories per component (CombatList all 44). Tail variants are trusted, not image-checked: SignIn's tail (Social, GoogleOnly, AccountDeleted, German) and PlayerView's 26 tail stories are the largest unchecked sets.
- About 90 stories are `close` only because their state comes from a `play` (typed text, opened sheets and menus, focus rings); the preview shows the pre-play state. Raising `--max-stories` or owning previews that reproduce the play state are the only levers.
- `.design-sync/sb-reference` and the bundle are built from the `design-sync` branch base; re-sync after the stage B and C merges into `main`.
