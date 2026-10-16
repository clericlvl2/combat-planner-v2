# Design brief: four directions, four screens

## How to work

This is a brainstorm. Draw four visual directions, each applied to the same four
screens. Lay them out on one canvas as a grid: four rows (one per screen), four
columns (one per direction). A column is one direction across all four screens, so
the style must hold from screen to screen.

Do not refine. No comments round, no fixes. The owner scrolls the canvas and picks.
After review the owner may ask for four more directions, unlike the first four.

Each direction has a short name and a one-line concept. The four must differ from
each other on every axis: palette, typefaces, density, row shape, where the primary
action sits, how surfaces are separated. If two columns could be confused at a
glance, replace one.

## Product

Combat Planner, a 13th Age initiative tracker used at a physical table. The DM
prepares fights on a desktop and runs them from a phone, glancing at it between
talking to players. The chosen direction becomes a Mantine theme (colors, fonts,
radius, spacing) and CSS Modules; every choice must be reachable that way.

Light theme only.

## Screens and fixed content

Content is identical in every column.

### Row 1. Combat, active. Phone 390 × 844

- Title: "Ambush at the Ferry"
- Round 3, escalation die 2
- Six units in initiative order; the active turn is on Vashti:
  1. Ser Aldric — Hero — init 19 — HP 52/52 — AC 21 PD 17 MD 15
  2. Orc Berserker — Enemy — init 17 — HP 14/40 (bloodied) — AC 18 PD 16 MD 12 — staggered
  3. Vashti the Hexer — Hero — init 15 — HP 20/36 (wounded) — AC 16 PD 14 MD 19 — dazed — active turn
  4. Goblin Archer 1 — Enemy — init 12 — HP −3/18 (dead) — AC 16 PD 14 MD 12
  5. Brother Tomas of the Silver Lantern Order — Ally — init 9 — HP 30/30, temp HP 5 — AC 19 PD 15 MD 17
  6. 影の射手ゴブリン — Enemy — init 7 — HP 18/18 — disabled (skipped) — stuck
- Actions present: Next turn (primary), add unit, undo, combat menu. On a unit: tap
  HP to edit, tap initiative to roll, expand for conditions and note.

### Row 2. Combats list. Desktop 1280 × 800

- Navigation to: Combats, Library, Settings, About. Signed in as "Artem".
- Search field.
- Five combats, each with title, description, color tag, state, unit count:
  1. "Ambush at the Ferry" — "Session 12, river crossing" — red — Active, round 3 — 6 units
  2. "Tomb of the Lich Baron" — "Final chamber" — violet-free: use the tag palette of the direction — Setup — 9 units
  3. "Goblin Warren" — "" — green — Setup — 12 units
  4. "Dragon's Council" — "Three ambassadors, one assassin" — blue — Setup — 4 units
  5. "Tavern Brawl" — "Improvised" — orange — Setup — 0 units
- Actions: New combat (primary), per-row menu (edit, copy, delete), drag to reorder.

### Row 3. Add unit form. Phone 390 × 844

- Opened from the combat screen as a sheet or page, the direction decides.
- Two tabs: New, From library. New tab is shown, filled in:
  - Name: "Hobgoblin Captain"
  - Type: Enemy (choice of Hero, Enemy, Ally)
  - Initiative bonus: +4
  - Max HP: 60
  - AC 20, PD 17, MD 15
  - Temp HP: 0
  - Note: "Leader. Flees at 15 HP."
- Actions: Add (primary), Cancel.

### Row 4. Edit HP. Phone 390 × 844

- Opened by tapping HP on Orc Berserker (14/40, bloodied, temp HP 0).
- Modes: Damage (selected), Heal, Temp HP, Max HP.
- Numpad with digits, backspace, confirm. Entered value: 7.
- Preview of the result: 14 → 7.
- HP history this combat: round 1 −12, round 2 −9, round 2 −5.
- The combat screen stays visible behind or above it, the direction decides.

## Problems every direction must solve

1. Round and escalation die stay visible while the unit list scrolls.
2. Next turn is in thumb reach and never covers list content.
3. Six units fit on the phone screen, or scrolling is clearly designed for 30.
4. Health status (full / wounded / bloodied / dead) reads without color.
5. Unit type (Hero / Enemy / Ally) reads at a glance.
6. Every gesture has a visible affordance.
7. Sheets and popovers never touch the screen edge.
8. One dominant action per screen.
9. Desktop uses its width: the list is not a phone column centered on a wide page.

## Not allowed

- Purple, indigo or violet anywhere; gradients of any kind; gradient text.
- Glassmorphism, blur, glowing borders, neon.
- The same radius and padding on every element; a shadow on every card; everything
  as a card.
- Inter, Roboto, Arial, Space Grotesk, system fonts.
- Cream with terracotta; all-caps mono eyebrow labels; decorative 01 / 02 / 03
  numbering; fake window dots.
- Placeholder copy. Use the content above verbatim.

## Deliverable

- One canvas, 4 rows × 4 columns, each cell at the stated size.
- Above each column: direction name, one-line concept, display font, text font,
  background hex, text hex, accent hex.
