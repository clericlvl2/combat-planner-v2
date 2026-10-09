# Combat Planner - UI inventory

Screenshot inventory of the live app (https://combat-planner-five.vercel.app, About page: version 0.0.1), captured 2026-10-09/10 with Chrome 155 over the DevTools protocol. The app is local-only (IndexedDB), so all data shown was created by hand in throw-away browser contexts.

## How these were captured

- Viewports: phone 390x844 CSS px (mobile + touch emulation, device scale factor 2, PNG 780x1688) and desktop 1280x800 CSS px (device scale factor 2, PNG 2560x1600). One exception: `06-navigation-header-nav-desktop-dark.png` is an element crop of the header (2530x104).
- Theme: the app's own theme setting stayed on "System"; the color scheme was emulated (`prefers-color-scheme`). Dark everywhere; light only for the Combats list (empty and with 3 combats) and Combat Active, as requested.
- Every frame is taken at scroll position 0, so long screens are cut at the viewport fold (see "Limits").
- File name: `<nn>-<screen>-<state>-<phone|desktop>-<light|dark>.png`. `nn` is the screen slot in the order of the brief; every slot/state exists for both viewports. Section headings below carry the item number of the brief (several brief items span more than one slot). `00` = first-launch extras.
- Test data: three combats - Goblin Ambush (red tag, kept empty), Dragon's Lair (blue tag, 6 units, Active, round 2, escalation die 1, full HP), Tavern Brawl (amber tag, 6 units; Setup captured first, then started: round 2 with damage, conditions and a disabled unit). Library: 6 templates - Bugbear Brute (enemy, goblinoid), Dwarf Cleric (player, party), Elven Ranger (player, party), Goblin Warrior (enemy, goblinoid + humanoid), Town Guard (ally, humanoid), Young Red Dragon (enemy, dragon). Units were added through the From library tab; initiative values are the app's random d20 rolls.
- `00-first-launch-*`, `01-combats-list-seeded-*` and `01-combats-list-empty-desktop-*` come from separate fresh browser contexts (empty IndexedDB).

## Screenshot index

### 00 - extra - First launch

- `00-first-launch-phone-dark.png` - First launch (empty IndexedDB, entered at `/`): the app auto-creates one untitled combat and redirects into it. Combat screen in Setup, no units. Header has only the back chevron and the kebab (blank title). Empty state 'No combatants yet'; '+' FAB bottom-right.
- `00-first-launch-desktop-dark.png` - First launch (empty IndexedDB, entered at `/`): redirected into the auto-created untitled combat. Setup, no units. Header: back chevron (blank title), '+' add-combatant, kebab, 4-icon nav. Centered empty state with an 'Add your first combatant' button.

### 01 - brief item 1 - Combats list: empty and seeded

- `01-combats-list-empty-phone-dark.png` - Combats list with no combats: burger + 'Combats' header, centered swords icon, 'No combats yet' + hint text, '+' FAB bottom-right (no inline button).
- `01-combats-list-empty-phone-light.png` - Combats list with no combats: burger + 'Combats' header, centered swords icon, 'No combats yet' + hint text, '+' FAB bottom-right (no inline button). (light theme)
- `01-combats-list-empty-desktop-dark.png` - Combats list with no combats: 'Combats' title at the left, '+' and the 4-icon nav (Combats current) at the right; centered empty state with a 'New combat' button.
- `01-combats-list-empty-desktop-light.png` - Combats list with no combats: 'Combats' title at the left, '+' and the 4-icon nav (Combats current) at the right; centered empty state with a 'New combat' button. (light theme)
- `01-combats-list-seeded-phone-dark.png` - Combats list right after first launch: the auto-created combat is listed as 'Untitled combat' (blank title) with a neutral '?' color tag; search field above the row.
- `01-combats-list-seeded-desktop-dark.png` - Combats list right after first launch: the auto-created combat is listed as 'Untitled combat' (blank title) with a neutral '?' color tag; search field above the row.

### 02 - brief item 1 - Combats list: three combats (color tags)

- `02-combats-list-populated-phone-dark.png` - Combats list with 3 combats, newest first: Tavern Brawl (amber T), Dragon's Lair (blue D), Goblin Ambush (red G). Row = drag handle, color-tag square with the initial, title, one-line truncated description, kebab. Search field on top, '+' FAB.
- `02-combats-list-populated-phone-light.png` - Combats list with 3 combats, newest first: Tavern Brawl (amber T), Dragon's Lair (blue D), Goblin Ambush (red G). Row = drag handle, color-tag square with the initial, title, one-line truncated description, kebab. Search field on top, '+' FAB. (light theme)
- `02-combats-list-populated-desktop-dark.png` - The same 3 combats in a 744 px centered column with full descriptions; the header '+' replaces the FAB.
- `02-combats-list-populated-desktop-light.png` - The same 3 combats in a 744 px centered column with full descriptions; the header '+' replaces the FAB. (light theme)

### 03 - brief item 1 - Combats list: search

- `03-combats-list-search-phone-dark.png` - Search field typed with 'dra': list filtered to Dragon's Lair, matches highlighted in title and description, x clear button inside the field.
- `03-combats-list-search-desktop-dark.png` - Search field typed with 'dra': list filtered to Dragon's Lair, matches highlighted in title and description, x clear button inside the field.
- `03-combats-list-search-no-match-phone-dark.png` - Search 'zzz' with no match: the list area is blank - no 'no results' message or empty state.
- `03-combats-list-search-no-match-desktop-dark.png` - Search 'zzz' with no match: the list area is blank - no 'no results' message or empty state.

### 04 - brief item 2 - Combat create / edit form and row menu

- `04-combat-form-create-phone-dark.png` - 'New combat' bottom sheet (drag handle): Title, Description, Color tag swatches N R O A G T B V (Neutral selected), Cancel / Create.
- `04-combat-form-create-desktop-dark.png` - 'New combat' centered dialog with x close: Title, Description, Color tag swatches, Cancel / Create.
- `04-combat-form-edit-phone-dark.png` - 'Edit combat' bottom sheet pre-filled with Goblin Ambush (Red selected), Cancel / Save.
- `04-combat-form-edit-desktop-dark.png` - 'Edit combat' centered dialog pre-filled with Goblin Ambush (Red selected), Cancel / Save.
- `04-combat-row-menu-phone-dark.png` - Row kebab menu open on Goblin Ambush: small popover with Edit and Delete (red).
- `04-combat-row-menu-desktop-dark.png` - Row kebab menu open on Goblin Ambush: small popover with Edit and Delete (red).

### 05 - brief item 3 - Delete-combat confirm

- `05-combat-delete-confirm-phone-dark.png` - Delete confirmation (centered alert dialog on both viewports): 'Delete this combat? This permanently deletes “Goblin Ambush”. It can't be undone.' Cancel / Delete (red). Not confirmed.
- `05-combat-delete-confirm-desktop-dark.png` - Delete confirmation (centered alert dialog on both viewports): 'Delete this combat? This permanently deletes “Goblin Ambush”. It can't be undone.' Cancel / Delete (red). Not confirmed.

### 06 - brief item 4 - Navigation

- `06-navigation-drawer-open-phone-dark.png` - Navigation drawer (left slide-over) over the Combats list: 'Combat Planner' title, x close, Combats (current, highlighted) / Library / Settings / About with icons; backdrop dimmed and blurred.
- `06-navigation-header-nav-desktop-dark.png` - Cropped header strip only (2530x104 px). There is no sidebar at 1280 px: 'Combats' title, '+' new combat, and the 4-icon nav (Combats current) in the header.

### 07 - brief item 5 - Combat Setup, empty

- `07-combat-setup-empty-phone-dark.png` - Combat screen (Goblin Ambush) in Setup with no units: header = back chevron + title + kebab; 'No combatants yet' empty state; '+' FAB (no inline button).
- `07-combat-setup-empty-desktop-dark.png` - Combat screen in Setup with no units: header = back + title, '+' add, kebab, nav icons; centered empty state with an 'Add your first combatant' button.

### 08 - brief item 6 - Add combatant: New tab

- `08-add-unit-new-filled-phone-dark.png` - 'Add combatant' bottom sheet, New tab filled: Name 'Goblin Warrior', Type toggle (Player / Enemy / Ally; Enemy selected), Max HP 12, AC 14, PD 12, MD 10, Initiative bonus 2, Initiative empty, Note; 2-column steppers. Sheet is about 80% of the viewport height with an inner scrollbar; Note is cut at the fold; Cancel / Add pinned.
- `08-add-unit-new-filled-desktop-dark.png` - 'Add combatant' centered dialog with x close, New tab filled the same way; 2-column steppers; fits without scrolling; Cancel / Add.

### 09 - brief item 6 - Add combatant: From library

- `09-add-unit-from-library-empty-phone-dark.png` - 'From library' tab with an empty library: 'Your library is empty', hint text, 'Open library' button; Add disabled.
- `09-add-unit-from-library-empty-desktop-dark.png` - 'From library' tab with an empty library: 'Your library is empty', hint text, 'Open library' button; Add disabled.
- `09-add-unit-from-library-list-phone-dark.png` - 'From library' tab with 6 templates: 'Search templates...' field, rows with type dot, name and an HP / AC / PD / MD line; Add disabled until one is picked.
- `09-add-unit-from-library-list-desktop-dark.png` - 'From library' tab with 6 templates: 'Search templates...' field, rows with type dot, name and an HP / AC / PD / MD line; Add disabled until one is picked.
- `09-add-unit-from-library-selected-phone-dark.png` - After picking 'Elven Ranger': 'From: Elven Ranger' with a Change link; the New-tab fields pre-filled and editable (Type Player, HP 28, AC 17, PD 14, MD 12, Init bonus 4, note); Add enabled.
- `09-add-unit-from-library-selected-desktop-dark.png` - After picking 'Elven Ranger': 'From: Elven Ranger' with a Change link; the New-tab fields pre-filled and editable (Type Player, HP 28, AC 17, PD 14, MD 12, Init bonus 4, note); Add enabled.

### 10 - brief item 7 - Combat Setup with 6 units

- `10-combat-setup-units-phone-dark.png` - Tavern Brawl in Setup with 6 units in insertion order: Elven Ranger (player, Init 9), Dwarf Cleric (player, Init -), Town Guard (ally, Init -), Goblin Warrior (enemy, Init 12), Bugbear Brute (enemy, Init -), Young Red Dragon (enemy, Init 16; below the fold). Card = type dot, name, expand chevron, kebab, HP n/n + green bar, AC / PD / MD, Init pill, italic note. Two stacked FABs (play = Start, + = add) cover part of the 4th card's Init pill.
- `10-combat-setup-units-desktop-dark.png` - Same state: header has '+' add, play (Start), kebab, nav icons; 744 px centered column; 5 of the 6 cards visible.

### 11 - brief item 8 - Combat Active (+ round / escalation editors)

- `11-combat-active-phone-dark.png` - Dragon's Lair in Active after Start + 8 'next turn' taps: 'ROUND 2 / ESCALATION DIE 1' bar; units sorted by initiative (Young Red Dragon 25, Goblin Warrior 19, Elven Ranger 16, Bugbear Brute 8, ...); active unit (Elven Ranger) has a green glow border; Init pills dimmed; '>>' next-turn FAB bottom-right.
- `11-combat-active-phone-light.png` - Dragon's Lair in Active after Start + 8 'next turn' taps: 'ROUND 2 / ESCALATION DIE 1' bar; units sorted by initiative (Young Red Dragon 25, Goblin Warrior 19, Elven Ranger 16, Bugbear Brute 8, ...); active unit (Elven Ranger) has a green glow border; Init pills dimmed; '>>' next-turn FAB bottom-right. (light theme)
- `11-combat-active-desktop-dark.png` - Same state: the '>>' next-turn icon sits in the header beside the kebab; Round / Escalation bar inside the 744 px column; active unit glow.
- `11-combat-active-desktop-light.png` - Same state: the '>>' next-turn icon sits in the header beside the kebab; Round / Escalation bar inside the 744 px column; active unit glow. (light theme)
- `11-escalation-editor-phone-dark.png` - Tavern Brawl (Active): tapping the Escalation die value opens a popover 'ESCALATION DIE' - 1 + Save.
- `11-escalation-editor-desktop-dark.png` - Tavern Brawl (Active): tapping the Escalation die value opens a popover 'ESCALATION DIE' - 1 + Save.
- `11-round-editor-phone-dark.png` - Tavern Brawl (Active, round 2): tapping the Round value opens a popover 'ROUND' - 2 + Save under the bar; it starts flush at the left viewport edge.
- `11-round-editor-desktop-dark.png` - Tavern Brawl (Active, round 2): the Round popover ('ROUND' - 2 + Save) hangs to the left of the content column.

### 12 - brief item 9 - Unit row: expanded, actions menu

- `12-unit-actions-menu-phone-dark.png` - Unit kebab menu on Town Guard (Active, not yet disabled): Edit, Duplicate, Save to library, Disable, Remove (red).
- `12-unit-actions-menu-desktop-dark.png` - Unit kebab menu on Town Guard (already disabled, so the item reads 'Enable'): Edit, Duplicate, Save to library, Enable, Remove (red).
- `12-unit-row-expanded-phone-dark.png` - Young Red Dragon expanded (Tavern Brawl, Active): chevron flips up; 85/120 amber bar (wounded); condition chips 'Dazed x' 'Weakened x' plus a '+ Condition' chip; editable note textarea. Around it: Town Guard dimmed (disabled), Goblin Warrior active + bloodied, Dwarf Cleric dead (-8/32).
- `12-unit-row-expanded-desktop-dark.png` - Young Red Dragon expanded (Tavern Brawl, Active): chevron flips up; 85/120 amber bar (wounded); condition chips 'Dazed x' 'Weakened x' plus a '+ Condition' chip; editable note textarea. Around it: Town Guard dimmed (disabled), Goblin Warrior active + bloodied, Dwarf Cleric dead (-8/32).

### 13 - brief item 10 - Numpad sheet (HP)

- `13-numpad-sheet-damage-phone-dark.png` - HP numpad bottom sheet for Young Red Dragon (120 /120, green) with '35' typed: Damage / Heal / Temp HP buttons (red / green / blue) enabled, keypad 1-9, clear, 0, backspace, collapsed 'History' row.
- `13-numpad-sheet-damage-desktop-dark.png` - HP numpad as a centered dialog (85 /120 in amber, '35' typed, not applied); the x close icon overlaps the '/120' text.
- `13-numpad-sheet-history-phone-dark.png` - Same sheet with History expanded: '1 records - R2 -35 Damage 85/120'; no amount typed, so Damage / Heal / Temp HP are disabled.
- `13-numpad-sheet-history-desktop-dark.png` - Same dialog with History expanded under the keypad: R2 -35 Damage 85/120 ('35' still typed).

### 14 - brief item 11 - Condition picker

- `14-condition-picker-phone-dark.png` - 'Add condition' bottom sheet for Elven Ranger: 12 color-coded chips (Charmed, Confused, Dazed, Fear, Helpless, Hindered, Shocked, Staggered, Stuck, Stunned, Vulnerable, Weakened), none selected.
- `14-condition-picker-desktop-dark.png` - 'Add condition' centered dialog (x close) for Goblin Warrior: the same 12 chips, none selected.
- `14-condition-picker-selected-phone-dark.png` - Same sheet with Dazed and Vulnerable toggled on (selected chips outlined); the sheet stays open after each toggle.
- `14-condition-picker-selected-desktop-dark.png` - Same dialog for Young Red Dragon with Dazed and Weakened toggled on.

### 15 - brief item 12 - Initiative manual input

- `15-initiative-manual-input-phone-dark.png` - Press-and-hold (450 ms, synthesized pointer events) on Dwarf Cleric's Init pill in Setup: popover 'INITIATIVE' - 0 + Save under the pill; its right edge touches the viewport edge and it covers the next card.
- `15-initiative-manual-input-desktop-dark.png` - Same popover beside Dwarf Cleric's Init pill in Setup.

### 16 - brief item 13 - Health states and disabled unit

- `16-unit-health-states-phone-dark.png` - Tavern Brawl, Active round 2, after damage via the numpad: Town Guard disabled (dimmed), Young Red Dragon wounded (85/120, amber bar, Dazed / Weakened chips inline), Goblin Warrior bloodied (5/12, orange bar, active-turn glow), Dwarf Cleric dead (-8/32, red bar filling from the right). Elven Ranger and Bugbear Brute (both full HP) sit at or below the fold.
- `16-unit-health-states-desktop-dark.png` - Tavern Brawl, Active round 2, after damage via the numpad: Town Guard disabled (dimmed), Young Red Dragon wounded (85/120, amber bar, Dazed / Weakened chips inline), Goblin Warrior bloodied (5/12, orange bar, active-turn glow), Dwarf Cleric dead (-8/32, red bar filling from the right). Elven Ranger and Bugbear Brute (both full HP) sit at or below the fold.

### 17 - brief item 14 - Combat header menu

- `17-combat-header-menu-phone-dark.png` - Combat header kebab menu: Undo, Redo (disabled), Add combatant, Restart, Clear combat.
- `17-combat-header-menu-desktop-dark.png` - Combat header kebab menu: Undo, Redo (disabled), Add combatant, Restart, Clear combat.

### 18 - brief item 14 - Restart / clear confirms

- `18-combat-clear-confirm-phone-dark.png` - Clear confirmation (centered alert dialog): 'Clear all combatants? This removes every combatant from this combat. You can undo it.' Cancel / Clear (red). Not confirmed.
- `18-combat-clear-confirm-desktop-dark.png` - Clear confirmation (centered alert dialog): 'Clear all combatants? This removes every combatant from this combat. You can undo it.' Cancel / Clear (red). Not confirmed.
- `18-combat-restart-confirm-phone-dark.png` - Restart confirmation (centered alert dialog): 'Restart combat? Keeps the roster but resets initiative, HP, temp HP, conditions, and the round. You can undo it.' Cancel / Restart (red). Not confirmed.
- `18-combat-restart-confirm-desktop-dark.png` - Restart confirmation (centered alert dialog): 'Restart combat? Keeps the roster but resets initiative, HP, temp HP, conditions, and the round. You can undo it.' Cancel / Restart (red). Not confirmed.

### 19 - brief item 15 - Library: empty

- `19-library-empty-phone-dark.png` - Library with no templates: burger + 'Library' header, centered icon, 'No templates yet' + hint text, '+' FAB.
- `19-library-empty-desktop-dark.png` - Library with no templates: centered icon, 'No templates yet' + hint text, 'New template' button; header '+' and nav icons.

### 20 - brief item 15 - Library: templates and tags

- `20-library-populated-phone-dark.png` - Library with 6 templates: 'Search library...' field, tag filter pills (dragon, goblinoid, humanoid, party), alphabetical cards (type dot red enemy / green player / blue ally, name, 'HP - AC - PD - MD' line, colored tag chips with x, '+ Tags', kebab). The FAB overlaps the last card; the list continues below the fold.
- `20-library-populated-desktop-dark.png` - Same list in the 744 px centered column; the 6th card is cut at the bottom edge.

### 21 - brief item 15 - Library: tag filter

- `21-library-tag-filter-phone-dark.png` - Tag pill 'goblinoid' active (highlighted): list narrows to Bugbear Brute and Goblin Warrior.
- `21-library-tag-filter-desktop-dark.png` - Tag pill 'goblinoid' active (highlighted): list narrows to Bugbear Brute and Goblin Warrior.

### 22 - brief item 15 - Library: template forms and tag assignment

- `22-library-form-create-phone-dark.png` - 'New template' bottom sheet: Name (placeholder 'Enemy'), Type toggle, Max HP / AC / PD / MD, Initiative bonus, Note, Tags row (Edit tags); Cancel / Create.
- `22-library-form-create-desktop-dark.png` - 'New template' centered dialog with x close: the same fields; Cancel / Create.
- `22-library-form-edit-phone-dark.png` - 'Edit template' bottom sheet pre-filled with Goblin Warrior; Cancel / Save.
- `22-library-form-edit-desktop-dark.png` - 'Edit template' centered dialog pre-filled with Goblin Warrior; Tags row shows goblinoid / humanoid chips + 'Edit tags'; Cancel / Save.
- `22-library-tag-assign-phone-dark.png` - 'Assign tags' bottom sheet stacked over the template sheet: 'New tag...' input and tag chips (goblinoid, humanoid selected), each tag with its own color.
- `22-library-tag-assign-desktop-dark.png` - 'Assign tags' dialog over the Edit template dialog: input + chips dragon / goblinoid (selected) / humanoid (selected) / party.

### 23 - brief item 16 - Settings

- `23-settings-phone-dark.png` - Settings: two cards - LANGUAGE select (English) and APPEARANCE select (System).
- `23-settings-desktop-dark.png` - Settings: two cards - LANGUAGE select (English) and APPEARANCE select (System).
- `23-settings-language-open-phone-dark.png` - Language select open: English (checked), Deutsch, Español, Français, 日本語, Русский.
- `23-settings-language-open-desktop-dark.png` - Language select open: English (checked), Deutsch, Español, Français, 日本語, Русский.
- `23-settings-theme-open-phone-dark.png` - Theme select open: System (checked), Dark, Light.
- `23-settings-theme-open-desktop-dark.png` - Theme select open: System (checked), Dark, Light.

### 24 - brief item 17 - About

- `24-about-phone-dark.png` - About: 'Combat Planner', Version 0.0.1, short description, privacy note ('Your data never leaves this device. No accounts, no servers, no tracking.'), Credits (Development clericlvl2, Design xomnsn as links).
- `24-about-desktop-dark.png` - About: 'Combat Planner', Version 0.0.1, short description, privacy note ('Your data never leaves this device. No accounts, no servers, no tracking.'), Credits (Development clericlvl2, Design xomnsn as links).

### 25 - brief item 18 - 404

- `25-404-phone-dark.png` - Unknown route (/this-page-does-not-exist): app header ('Combats' title + nav) with 'Page not found', 'This page doesn't exist. Head back to your combats.' and a 'Back to Combats' button.
- `25-404-desktop-dark.png` - Unknown route (/this-page-does-not-exist): app header ('Combats' title + nav) with 'Page not found', 'This page doesn't exist. Head back to your combats.' and a 'Back to Combats' button.

### 26 - brief item 18 - Combat not found

- `26-combat-not-found-phone-dark.png` - /combats/does-not-exist: no app header at all; 'Combat not found', 'This encounter may have been deleted on this device.', 'Back to Combats' button.
- `26-combat-not-found-desktop-dark.png` - /combats/does-not-exist: no app header at all; 'Combat not found', 'This encounter may have been deleted on this device.', 'Back to Combats' button.

## Observations

**Navigation**

- Phone: the app header has a burger ("Open navigation") at the left and the page title; the burger opens a left slide-over drawer (Combats / Library / Settings / About, current page highlighted). Source comments say a right-swipe from the left screen edge also opens it (not exercised).
- Desktop (1280 px): no sidebar. The same four destinations are an icon-only strip at the right end of the header (36x36 buttons, current route highlighted, `title` tooltips). Page content is a 744 px centered column under a 1024 px header container.
- `/combats/<id>` replaces the app header with its own: back chevron + title (+ kebab on phone; '+' add, play / next-turn, kebab and nav icons on desktop). A combat with a blank title (the auto-created first combat) shows nothing next to the chevron, and its delete confirm reads 'permanently deletes ""'.
- First launch: `/` redirects straight into an auto-created, untitled, empty combat (Setup), not to the list; `/combats` opened directly lists it as "Untitled combat". An unknown path gives a 404 page inside the app shell (header + 'Back to Combats'); an unknown combat id gives a bare "Combat not found" page with no app header.

**Where primary actions sit**

- Phone: one 56x56 FAB at the bottom-right creates things (New combat, New template, Add combatant). In a combat's Setup a second FAB (play = Start) stacks above the '+'; in Active it becomes '>>' Next turn and Add combatant moves into the header kebab menu.
- Desktop: the same actions are 36x36 icon buttons in the header ('+', play / '>>', kebab) plus a labelled button in empty states.
- Edit combat (title / description / color tag) exists only in the Combats list row menu; the combat screen's own kebab holds Undo, Redo, Add combatant, Restart, Clear combat.

**Component structure**

- Overlays follow one rule: forms, numpad and condition picker are bottom sheets on phone (drag handle) and centered dialogs with an x on desktop; confirmations are centered alert dialogs on both; menus and the initiative / round / escalation editors are popovers on both; the Settings selects are dropdown popovers. (Source: `ResponsiveModal` in `src/lib/components/app/` of the main checkout.)
- The unit card is the same in Setup and Active (type dot, name, chevron, kebab, HP value + bar, AC / PD / MD, Init pill, note); state is carried by color, not layout: type dot (player green, enemy red, ally blue), HP bar bands (full green, wounded amber, bloodied orange, dead = red bar filling from the right with negative HP shown), active turn = glow border in the type color, disabled = whole card dimmed, conditions = colored chips under the stats row.
- Card interactions: tap Init pill = roll d20 + bonus immediately; hold 450 ms = manual-entry popover (no visible affordance); tap HP value = numpad (Damage / Heal / Temp HP, History); chevron = expand (conditions, note); kebab = Edit / Duplicate / Save to library / Disable|Enable / Remove. Init pills are disabled once Active; Start rolls any pill still at '-'. Setup keeps insertion order, Active sorts by initiative.
- Color tag swatches carry a letter (N R O A G T B V), so the tag is not color-only; library tags get their own colors automatically.
- Theme follows the OS preference (Settings > Appearance defaults to System); the only theme control is in Settings.

**What felt awkward at phone size**

- FABs cover content: in Setup the stacked play / '+' FABs sit over the right end of the lower cards (the 4th card's Init pill is partly hidden); in Active the '>>' FAB covers the Init pill / note of the card at the bottom.
- Density: a unit card is about 170 px, so 6 units are 1312 px (Setup) to 1366 px (Active) of document in an 844 px viewport; 4-5 cards are visible. The header and the Round / Escalation bar are not sticky (the only fixed element measured on phone is the FAB), so round and escalation scroll out of view; after 8 next-turn taps the document had scrolled 117 px by itself.
- Popovers touch the viewport edge: the manual-initiative popover's right edge is flush with the screen edge and it covers the next card; the Round editor popover starts at x=0.
- Add-combatant sheet: about 80% of the viewport, inner scroll area with a visible scrollbar, Note cut at the fold, Cancel / Add pinned below.
- Tap targets measured: header kebab 44x44, unit-card kebab 40x40, expand chevron 40x40, Init button 80x40 (visible pill 66x26), HP button 344x40, FAB 56x56.
- Search with no match shows a blank list (no message); Combats list rows show only title + description (no state, round or unit count).

**Desktop**

- At 1280x800 about five unit cards fit; the rest of the width is empty margin.
- The numpad dialog's x close icon overlaps the '/120' max-HP text.
- No sticky or fixed element was measured, so the header (which holds Next turn on desktop) scrolls away with the page; the Round popover hangs to the left of the content column.

## Limits

- Desktop sidebar: none exists at 1280 px (see 06).
- Scrolled states: under mobile emulation a screenshot of a scrolled page returned the top of the document and full-page mode returned duplicated header tiles, so all frames are at scroll 0 and the lower part of long phone lists is not shown.
- The press-and-hold for manual initiative was synthesized with pointer events (pointerdown, 800 ms wait), not a real touch gesture.
- Not captured: PWA install banner, hydrate-failure screen, toasts, drag-to-reorder state, a unit's Edit form, the Temp HP bar segment, other locales, widths between 390 and 1280.
- Initiative values are random rolls and differ between combats.
