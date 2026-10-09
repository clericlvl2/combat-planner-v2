# Design brief: combat screen, three directions

## Goal

Three visual directions for one screen of Combat Planner, a 13th Age initiative
tracker used at a physical table. The DM runs the fight from a phone, glancing at it
between talking to players. The screen must be readable at arm's length, in a dim
room, with one thumb. Pick the direction that feels like a tool someone chose on
purpose, not a default.

The chosen direction becomes a Mantine theme (colors, fonts, radius, spacing) and
CSS Modules. Every choice must be reachable that way: no effects that need canvas,
WebGL or heavy animation.

## Screen

Phone, 390 × 844, light theme. Light is the primary theme of the product.

One screen: a combat in the Active state. Fixed content, identical in all three
directions:

- Title: "Ambush at the Ferry"
- Round 3, escalation die 2
- Six units, in initiative order; the active turn is on Vashti:
  1. Ser Aldric — Hero — init 19 — HP 52/52 — AC 21 PD 17 MD 15 — no conditions
  2. Orc Berserker — Enemy — init 17 — HP 14/40 (bloodied) — AC 18 PD 16 MD 12 — staggered
  3. Vashti the Hexer — Hero — init 15 — HP 20/36 (wounded) — AC 16 PD 14 MD 19 — dazed — active turn
  4. Goblin Archer 1 — Enemy — init 12 — HP −3/18 (dead) — AC 16 PD 14 MD 12
  5. Brother Tomas — Ally — init 9 — HP 30/30, temp HP 5 — AC 19 PD 15 MD 17
  6. Goblin Archer 2 — Enemy — init 7 — HP 18/18 — disabled (skipped in turn order) — stuck

Actions that must be present and reachable: Next turn (primary), damage / heal on
a unit (tap on HP), roll initiative (tap on the initiative value), add unit, undo,
open a unit's details (conditions, note, HP history), combat menu (restart, clear,
share).

## Problems every direction must solve

1. Round and escalation die stay visible while the list scrolls.
2. Next turn is in thumb reach and never covers list content.
3. At least six units fit on screen, or scrolling is clearly designed for 30.
4. Health status (full / wounded / bloodied / dead) reads without color: text, shape
   or position carries it too.
5. Unit type (Hero / Enemy / Ally) reads at a glance.
6. Every gesture has a visible affordance; nothing depends on long press alone.
7. Popovers and sheets never touch the screen edge.
8. One dominant action per screen. Secondary actions recede.

## What to vary

- Palette: background, text, one accent, the four health colors, the three type
  colors. Name each as a hex value.
- Type: one display face, one text face, numerals that line up in columns. Name
  the faces; they must be available on Google Fonts or Fontsource.
- Unit row: density, shape, what is visible collapsed, what opens on expand.
- Where Next turn and add unit live: bottom bar, header, inline, elsewhere.
- Radius, borders, dividers, elevation: choose a system and keep to it.

## What not to change

- Field set of a unit, the twelve 13th Age conditions, four health statuses.
- Phone-first; this screen is used one-handed.

## Three directions

Each direction has a name and a one-line concept. Commit to it fully; do not blend.

- A. Field notebook: paper, ink, hairline rules, a serif display face, dense rows,
  one red accent for the active turn.
- B. Instrument panel: cool neutrals, flat surfaces, strong type hierarchy, tabular
  numerals, one amber accent, no cards.
- C. Board game: warm off-white, a bold geometric display face, chunky rows, type
  colors used as role colors, playful but legible.

## Not allowed

- Purple, indigo or violet anywhere; gradients of any kind; gradient text.
- Glassmorphism, blur, glowing borders, neon on dark.
- The same radius and padding on every element; a shadow on every card; everything
  as a card.
- Inter, Roboto, Arial, Space Grotesk, system fonts.
- Cream with terracotta; near-black with acid green; all-caps mono eyebrow labels;
  decorative 01 / 02 / 03 numbering; fake window dots.
- Placeholder copy. Use the content above verbatim.
- Decorative motion. Only state changes may animate.

## Deliverable per direction

- The screen at 390 × 844, light theme.
- The same screen with one unit expanded.
- The numpad sheet open for damage on Orc Berserker.
- Tokens: every color as hex with its role, both font names, radius scale, spacing
  scale.
- One paragraph: how the direction solves problems 1–8.

## Acceptance

- Next turn and damage reachable by thumb on a 6.1" phone.
- Readable at arm's length in a dim room.
- The longest strings of de, fr, ja, ru fit (names up to 40 characters).
- WCAG AA contrast for text and for the four health states.
- A 30-unit list scrolls without losing round and escalation.
