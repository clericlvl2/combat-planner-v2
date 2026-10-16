# Combat Planner — prototype TODO

Out of scope for now: dark theme, desktop layouts, redo, Mantine mapping, password reset, offline and loading states.
Rules source: Combat Planner v2 vision (health statuses Full / Wounded / Bloodied / Dead, 12 conditions). Changes to the vision: VISION-UPDATES.md.

## State on 16.10.2026
- Entry point: **Styleguide.dc.html**. Sidebar sections Design / Atoms / Molecules / Organisms / Pages, from **nav.js** (update it whenever a page is added, renamed or removed; see CLAUDE.md).
- Design: Tokens, Template (page rules + audit), Baselines (screen lines and values), Flow parts.
- Atomic split done: one component per file; molecules import atoms, organisms import molecules/atoms, pages import organisms. Same-level imports one way only, no cycles.
- Every page follows **Template.dc.html**: Header 15–25 words · Overview (What / Where / Behaviour) · Anatomy (one instance at 1× + list of parts, no numbers) · Variants × states · Sizes · Edge cases · Flow. Pages: Overview (Purpose / Entry points / Components used), Anatomy, Key states, Flows, Rules.
- Shared parts in Flow: pageHead, overview, spec, rules, flowHead, step, arrow, phone.
- Every page header hides on `?embed=1`. Screen pages take `?flow=CODE` (CS-F1…F8, PV-F1…F5, CL-F1…F6, LB-F1…F6, AP-F1…F5).
- Components are imported with `embedded`; editing one updates every screen. Never pass a prop called `name` to a dc-import; use `unitName`, `presetName`.
- Tokens are applied by value (inline literals); a token change needs a find-and-replace pass.
  - Type 11 / 12 / 14 / 16 / 18 / 22 / 28 / 44 · line height 1 / 1.25 / 1.45 · spacing 4 / 8 / 12 / 16 / 24 / 32 · radius 2 / 4 / 12 / 16 / 24 / full · borders 2 (1 for list dividers) · icons 16 / 20 / 24 / 32.
  - Sizes S / M / L (M default) for buttons, inputs, selectors, chips.
  - Bottom buttons: 58 high, Unbounded 18, 28 from the screen edges. Sheets: 12 from the edges, border 2, padding 14.
- Gallery type: section titles Unbounded 22/700 + description 14/1.45 #5F574D; cell captions 14/600 ink.

## Decisions
- ConditionPicker: bottom sheet, 2 columns A–Z down each column, round mark in the condition colour, chips always filled. Header shows the unit name only, no counts.
- HP History: inline in the calculator; from the unit row it is a bottom sheet.
- HpBox: 96 wide, current HP Rubik 18 bold + small grey “/max”; fits −999/999.
- Escalation 0: dashed empty die + “No escalation”. Off-screen active unit: no indicator.
- Calculator actions are disabled until an amount is typed.
- InitiativePopover: title “Initiative (+2)”, stepper centred, Roll d20 + bonus.
- Player view: initiative visible for every unit, enemies included; disabled units hidden from players.
- Card actions (UnitRow, CombatCard, PresetCard): CardActions — Edit with its label (beige border, like ⋯) + ⋯ that opens Menu with the rest; danger last under a divider. No rows of labelled buttons: they break in de/ru and at 320.
- UnitForm From Library: search + Tags filter (TagSheet), no sorting; list area fixed at 336 with fade.
- Localization drafts (de, es, fr, ja, ru) for HP strings — terms need review.

## Next
- [ ] iPhone SE baseline (375 or 320?) — parked
- [ ] Last played label on the sort button: "Played" or a clock icon — parked
- [ ] Review placeholder copy and localized HP terms — parked
- [ ] Confirm rules proposed in flows (VISION-UPDATES.md → "Предложено во флоу"; shown under Rules on each page)

## Done
- CardActions molecule replaces ActionButton rows and the UnitRow action strip; dead card makers removed from StatSquare, PlayerRow, CombatCard, PresetCard (16.10).
- Plans closed and removed: ATOMIC-PLAN.md (split, 15.10), UPDATE-PLAN.md (Template pass, 16.10).
- Overview renamed to Styleguide; top bar keeps only Open full page (16.10). Unit cap 99 (16.10).
- Atomic split (15.10), Template rewrite and audit (15.10), every page on the Template (15.10).
- Anatomy simplified to instance + list (16.10).
- Bottom-button baseline: sheet padding 14 (16.10). Baselines page.
- Flows with arrows for CombatHeader, UnitRow, UnitForm, ShareSheet (16.10).
- Section headings and captions aligned across pages (16.10).
