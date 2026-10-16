# Project rules

- Component prototypes show static renders of every state side by side (closed, open, edge cases). No click interactions or toggles; each state is its own drawn card.
- Every component and screen is phone width (max 390px). Light theme only for now; no desktop, dark theme, redo, or Mantine mapping yet.
- Rules come from the Combat Planner v2 vision: health statuses Full / Wounded / Bloodied / Dead, the 12 conditions from the vision.
- Plan of upcoming screens lives in TODO.md.
- Project tree lives in nav.js (read by Styleguide.dc.html, the entry point). After any change that adds, renames, moves or removes a page, component group or flow, update nav.js in the same turn.
- Pages support ?embed=1 (hides their own page header); screen pages also take ?flow=CODE. Styleguide shows pages with their header.
- Design pages: Tokens, Template (page rules + audit), Baselines (screen lines and values), Flow (layout parts).
