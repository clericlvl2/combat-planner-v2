# Handoff: Combat Planner v2 (mobile web)

## Overview
Combat Planner is a phone-first tool for a tabletop DM (13th Age style rules) and their players. The DM builds a combat, runs turn order, tracks HP, conditions, round and escalation die, and shares a link. Players join from the link, pick their hero and follow the combat; they control only their own hero.

Sections: **Combat list** → **Combat screen** (DM) · **Player view** (players) · **Library** (unit presets) · **App pages** (sign-in, settings, account, about, errors).

## About the design files
The files in this bundle are **design references built in HTML**: static prototypes that show the intended look, states and flows. They are not production code. Recreate them in the target codebase with its own framework, component library and patterns. If there is no codebase yet, pick a suitable stack (for example React + TypeScript; the project was planned with Mantine, but no Mantine mapping exists yet).

The prototypes have **no click interactions on purpose**: every state is drawn as its own static card or phone, side by side, and flows are rows of phones joined by arrows. Read behaviour from the Overview and Flow sections of each page and from `docs/VISION-UPDATES.md`.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii and component sizes are final for light theme on a 390-wide phone. Copy is final in English except where marked as a draft (see Open questions).

## How to open
Open `Styleguide.dc.html` in a browser (serve the folder over a local HTTP server, e.g. `npx serve .`). The sidebar lists every page, read from `nav.js`. Each page also opens on its own. Screen pages take `?flow=CODE` (e.g. `CombatScreen.dc.html?flow=CS-F3`) to show one flow. `?embed=1` hides a page's own header.

Each `*.dc.html` file is self-contained: markup with inline styles plus a small logic class that produces the gallery data. `support.js` is the preview runtime; the app does not need it.

## Page structure (how to read a page)
Every component page follows `Template.dc.html`:
- **Header**: what it is and where it lives, 15–25 words.
- **Overview**: What / Where / Behaviour.
- **Anatomy**: one instance at 1× plus a list of parts with exact values.
- **Variants × states**, **Sizes** (S / M / L, M default), **Edge cases** (longest strings in de, es, fr, ja, ru; three-digit HP; limits).
- **Flow**: static steps with arrows, when the component is interactive.

Screen pages: Overview (Purpose / Entry points / Components used), Anatomy, Key states, Flows (codes like CS-F1…F8), Rules proposed by the flows.

## Component tree (atomic)
Atoms → molecules → organisms → pages. One component per file; higher levels import lower ones.
- **Atoms:** Button, IconButton, ToolButton, TextField, TextArea, SearchField, NumberField, Checkbox, Radio, Swatch, Chip, StatSquare, EscalationDie, RoleBlock.
- **Molecules:** Stepper, Segmented, RadioList, CheckList, SwatchRow, CardActions, HpBox, HistoryRow, DefenseLine, NoteField, InitiativePopover, Toast, EmptyState.
- **Organisms:** Sheet, Dialog, Menu, Drawer, PageHeader, PlayerHeader, BottomBar, CombatHeader, TurnBar, UnitRow, PlayerRow, CombatCard, PresetCard, HpHistory, ConditionPicker, TagSheet, SortSheet, NumpadSheet, UnitForm, ShareSheet, MessageScreen.
- **Pages:** CombatScreen, PlayerView, CombatList, Library, AppPages.
- **Design:** Tokens, Template (page rules + audit), Baselines (screen lines), Flow (preview-only layout parts: page header, flow head, step, arrow, phone frame; not part of the app).

## Layout rules (Baselines.dc.html)
- Phone 390 × 844, light theme. Status bar 44.
- CombatHeader 126 high. PageHeader about 168 with search (44 + nav 48 + search 48 + bottom 12).
- Content edge 12 left and right. List gap 8.
- Bottom bar (TurnBar, BottomBar) 98 high, padding 12 28 28, border-top 2 #E2D8C6.
- **Every bottom button: 58 high, radius 29, Unbounded 18/700, 28 from the screen edges**, in bars and in sheets.
- Sheets: 12 from the screen edges, border 2 #231F1C, radius 24, padding 14 (12 + 2 + 14 = 28).
- Dialog: 24 from the edges, padding 16, two M buttons. Toast: 12 from the sides, 12 above the bottom bar (24 when there is no bar). Drawer: 300 wide from the left.

## Design tokens (Tokens.dc.html)
Tokens are applied by value in the prototypes; define them as real tokens in code.

**Base colors**
- #FAF6EE screen background · #FFFFFF surface (cards, fields, sheets) · #F3EDE2 soft (keys, tiles, dead fill)
- #FFF4D2 selected row · #FFE7A3 accent (active turn, tap marker, open state)
- #E2D8C6 border and divider · #E6DDCC disabled fill, empty HP segment
- #231F1C ink (text, primary button, active border) · #3A3531 ink pressed
- #5F574D secondary text · #8C8578 muted (placeholders, unchecked boxes, dashed lines)

**Roles:** Hero #1E5FA8 · Enemy #B4232A · Ally #2D7D46 · dead or disabled role block #5F574D.

**Health status** (from HP / Max): Full #2E7A43 (4 segments) · Wounded ≥ 50% #855800 (3) · Bloodied < 50% #B33A0A (2 or 1) · Dead ≤ 0 #57534E (0, name struck through).

**HP actions:** Damage #B4232A · Heal #2E7A43 · Set Temp #1E5FA8 · Set Max #A85400. Danger soft fill #F7E4E2.

**Conditions** (the 12 from the vision; fill / text): charmed #F9DDE6/#8A2448 · confused #DDEFD5/#2F6B1F · dazed #FFF1B8/#6B5600 · fear #E3E1DC/#3D3A35 · helpless #F6DCD5/#8A2E17 · hindered #D7EBF5/#12506E · shocked #D5F0F0/#0E5E63 · stuck #E9DFD1/#5C4026 · stunned #FBE0C2/#8A3F00 · vulnerable #F8D7D7/#9B1C1C · weakened #EDE6C9/#5E5214 · staggered #DCE6F7/#1E4E8C.

**Type:** Unbounded (display, numbers, bottom buttons) and Rubik (UI), Noto Sans JP for Japanese.
- Display Unbounded 700 44 · Title 28 · Heading 22 · Number / Button 18
- Body Rubik 400–600 16 · Small 14 · Meta 600–700 12 · Micro 700 11
- Line height 1 / 1.25 / 1.45. Numbers use tabular figures.

**Spacing:** 4 / 8 / 12 / 16 / 24 / 32. **Radius:** 2 (HP segments) · 12 (fields, keys, tiles, S buttons) · 16 (cards, popovers, menus, toasts) · 24 (sheets, dialogs) · full (chips, 58 buttons, round icons). **Borders:** 2 everywhere, 1 for list dividers. **Icons:** Tabler Icons webfont, sizes 16 / 20 / 24 / 32. **Tap marker:** 3 px #FFE7A3 outline.

## Key interaction rules
Full list in `docs/VISION-UPDATES.md` (Russian) and in the Behaviour and Flow sections of each page. The most important:
- **Turn order:** Start combat rolls missing initiative and sorts. Next turn passes the turn; Disabled and Dead units are skipped. When Next turn is blocked, the button shows the reason.
- **Round and escalation:** round 1–99, editable from the header. Escalation die 0–6, set by the DM from a face picker; 0 shows a dashed empty die and "No escalation".
- **HP calculator (NumpadSheet):** actions stay disabled until an amount is typed. Damage takes temp HP first and can push HP below 0. Heal caps at Max. Set Temp replaces temp HP. Set Max caps current HP. Max HP up to 999; HpBox fits −999/999.
- **Conditions:** bottom sheet, two A–Z columns, any combination, applies on tap.
- **Card actions (CardActions):** in an expanded UnitRow, CombatCard or PresetCard: Edit with its label, plus ⋯ that opens Menu with the rest (danger item last, under a divider). Do not use rows of labelled buttons: they break in de/ru and at 320.
- **Player view:** players see initiative for every unit. For heroes and allies they also see HP and AC/PD/MD; for enemies only the health status and conditions. Disabled units are hidden from players. A player edits only their own hero (initiative, HP without Set Max, conditions, note).
- **Share:** Reissue makes a new link and releases every claim.
- **Limits:** 99 units per combat · unit name 40 · combat title 80 · description 500 · note 250 · tag 24 characters.
- **Lists:** Combat list sorts Newest first (default), Last played, A–Z; Library sorts Newest first, A–Z, By type and filters by tags. Combats have 8 colours and a status of Setup or Active.
- **Languages:** en, de, es, fr, ja, ru, chosen in Settings. Every layout must hold the longest de and ru strings.

## State and data (minimum)
- Combat: id, title, description, colour, status (setup / active), round, escalation, active unit, last opened date, player link token, units[].
- Unit: id, name, role (hero / enemy / ally), initiative, initiative bonus, HP, Max HP, temp HP, AC, PD, MD, conditions[], note, disabled, claimed by (player name), HP history[] (when, kind, amount, result).
- Preset: id, name, role, Max HP, AC, PD, MD, initiative bonus, tags[].
- DM changes must reach players live (toasts for events; separate screens for a revoked link or a deleted combat).

## Out of scope for now
Dark theme, desktop layouts, redo, Mantine mapping, password reset, offline and loading states.

## Open questions
- Small phones: the base width (375 or 320) is not decided yet. PresetCard gets tight at 320 (defense squares next to the name).
- Label of the Last played sort: "Played" or a clock icon.
- Draft copy (toasts, dialogs, empty states, About) and localized HP terms need review.
- Rules proposed in flows still need confirmation (listed under Rules on each screen page and in VISION-UPDATES.md).

## Screenshots
`screenshots/` holds 13 key screens at 1× (390 × 844, PNG), taken from the flows:
01 combat-empty (CS-F1.1) · 02 combat-setup (CS-F1.4) · 03 combat-running (CS-F2.1) · 04 hp-calculator (CS-F3.3) · 05 conditions (CS-F4.2) · 06 unit-actions (CS-F6.1) · 07 player-join (PV-F1.1) · 08 player-combat (PV-F3.2) · 09 combat-list (CL-F1.1) · 10 card-menu (CL-F5.1, ⋯ open) · 11 library (LB-F1.1) · 12 library-filtered (LB-F1.4) · 13 sign-in (AP-F1.1).
Tap markers (yellow outlines) in some shots show which control the next flow step uses; they are not a visual state of the app.

## Files
- `Styleguide.dc.html`: entry point with the sidebar. `nav.js`: page tree.
- `Tokens.dc.html`, `Baselines.dc.html`, `Template.dc.html`: design rules.
- All other `*.dc.html`: one component or screen each (see the component tree above).
- `docs/VISION-UPDATES.md`: decisions that change or extend the Combat Planner v2 vision. `docs/TODO.md`: project state and decisions. `docs/CLAUDE.md`: rules used while designing.
- Fonts and icons load from Google Fonts and jsDelivr (Tabler Icons 3.19).
