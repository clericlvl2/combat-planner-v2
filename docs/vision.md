# Combat Planner v2

## Vision

A 13th Age combat tracker for in-person play. The DM prepares combats and runs them
from a phone. Players follow the combat on their own phones through a link or QR
code. Many DMs can use one server; each has a private account and library. Free,
funded by donations, self-hostable.

The project must be pleasant to own: a standard stack, a small architecture, a
consistent design. A feature must be both easy to maintain and useful at the table.

## Scope

- 13th Age only. No multi-system abstraction.
- Locales: en, de, es, fr, ja, ru.
- One layout: a 390-wide phone column in light theme. Wider screens show the same
  column centered.
- Network is required.
- Not built: dark theme, desktop layout, redo, password reset, offline mode,
  loading indicators (a loading screen is blank).

## Names

| Thing | Name |
|-------|------|
| A tracked encounter | `combat` |
| A participant in a combat | `unit` |
| Unit type for a player character | `Hero` |
| Unit type for a creature fighting the heroes | `Enemy` |
| Unit type for a creature fighting with the heroes | `Ally` |
| A reusable unit definition in the library | `preset` |
| A signed-in person who owns combats | `DM` |
| A person who follows a combat through a link | `player` |
| The person who reviews and approves work on this project | `owner` |
| AI coding agents run by the owner | `agents` |

## Sources of truth

- This document: behavior, data, limits, stack, architecture.
- `docs/design/handoff/`: visuals, layout, component tree, states. Entry
  `Styleguide.dc.html`, rules `README.md`, tokens `Tokens.dc.html`, screen lines
  `Baselines.dc.html`.
- Where the handoff shows a behavior this document does not describe, the handoff
  applies. Where the two conflict, this document applies and the nearest handoff
  component is used for the visuals.
- Domain tests in `packages/domain` are the executable form of this document and
  are written from it.

## Roles

### DM

Has every action listed under Features.

### Player

- Opens a combat link.
- Enters a display name once, on the Heroes screen.
- Holds one or more Hero units at a time.
- On own heroes sends only the actions marked "Player" in the Unit actions table.
- Has no account and cannot undo.

### Player identity

- The player's browser generates a `playerId` (ULID) and stores it.
- Every request and the SSE subscription carry the `playerId`.
- The server stores `playerId → display name` per combat.

### Claims

- A unit is claimed by at most one player.
- A player claims and releases heroes on the Heroes screen, and releases one hero
  through Release claim in the expanded row.
- A player who claims an own hero again changes the display name; Done with a
  changed name sends one such claim.
- The DM releases any claim through Release claim in the unit menu.
- Removing the unit releases the claim.
- Clear releases every claim.
- Changing the unit type away from Hero releases the claim.
- Reissuing the link releases every claim.
- Restart keeps claims.
- Every viewer sees which hero is claimed and the display name of the claimer.
- A player whose browser lost the `playerId` sees the hero as taken by another
  player and asks the DM to release it.

### Visibility for players

| Field | Own Hero | Other Hero, Ally | Enemy |
|-------|:--------:|:----------------:|:-----:|
| Name | ✓ | ✓ | ✓ |
| Type | ✓ | ✓ | ✓ |
| Health status | ✓ | ✓ | ✓ |
| Conditions | ✓ | ✓ | ✓ |
| Position in turn order | ✓ | ✓ | ✓ |
| Initiative value | ✓ | ✓ | ✓ |
| Claimed by, display name | ✓ | ✓ | — |
| HP, temp HP, max HP | ✓ | ✓ | — |
| AC, PD, MD | ✓ | ✓ | — |
| Note | ✓ | — | — |
| HP history | ✓ | — | — |

Disabled units are not sent to players.

The server builds the player document from this table before sending. Hidden values
never reach a player's device.

## Pages

| Path | Content |
|------|---------|
| `/combats` | Combat list |
| `/combats/:id` | Combat screen |
| `/combats/:id/play` | Player view: the Heroes screen and the Turn order screen |
| `/library` | Presets |
| `/settings` | Language |
| `/account` | Email, sign out, delete account |
| `/about` | Description, version, rules, source, privacy note, donations, credits |
| `/auth/sign-in` | Sign in |
| `/auth/sign-up` | Sign up |
| `/auth/callback/:provider` | OAuth callback |

`/` redirects to `/combats`. Without a session every DM page redirects to
`/auth/sign-in`. After sign-up the DM lands on an empty `/combats`.

System screens, all without a bottom bar:

- 404.
- Unexpected error.
- Combat not found. Shown to the DM when the combat is deleted or belongs to another
  DM.
- Link expired. Shown to a player whose token generation is old. No action.
- Combat deleted. Shown to a player whose combat was deleted, with the combat
  title. No action.
- Can't reach the server. Shown when the first load of a screen gets no response,
  with a Try again button that repeats the load.

## Features

### Combat list

Actions:

- Create. Title required, Create disabled until the form is valid, default color
  swatch 7. Opens the new combat screen.
- Edit title, description, color.
- Delete, with confirm. Toast `<title> deleted`.
- Duplicate. The copy is titled `<title> (copy)`, keeps description and color, has
  the same units with their stats and notes, HP at max, no temp HP, no conditions,
  no initiative, state `setup`, no link, no claims, empty action log, no last-played
  date. Toast `<title> (copy) created`.

Card: color dot before the title, status pill Setup or Active, meta line
`Round N · M units` in Active and `M units` in Setup. In the Last played sort the
meta line adds Today, Yesterday, N days ago or Never played. A chevron expands the
description and the card actions: Edit, and a ⋯ menu with Duplicate and Delete.

Sort: Newest first (default), Last played, A–Z. A sort other than the default shows
the sort button filled and labeled with the sort name; the Last played label is
"Last played". Last played is the moment the DM last opened the combat screen; a
combat never opened sorts after the opened ones. The chosen sort is remembered on
the device. There is no manual order.

Search by title and description. No hits: "Nothing found" with the query.

Empty list: the sort tool is hidden and the bottom bar button New combat is the call
to action. At 100 combats New combat is disabled with the hint "limit reached".

### Combat

A combat is in one of two states: `setup` or `active`.

#### Setup

Shown: title, unit list in insertion order, initiative cell on every unit, Start
button. With no units Start is disabled and reads "Add a unit first", and the list
shows an empty state with Add unit.

Hidden: round, escalation die, active-turn highlight.

Combat menu: Undo, Share, Clear.

#### Active

Shown: everything from Setup except the Start button, plus round, escalation die,
Next turn button, active-turn highlight.

- Next turn shows the next unit's name on a second line, with `· round N` when the
  turn would wrap. When blocked, the button shows the reason instead of its label:
  one text for "every unit is disabled or dead", one for "round 99 is the last".
- The active row may scroll out of view; nothing pins it.
- Round is edited from a popover with a − / + stepper in the header, 1–99.
- Escalation die is set from a face picker in the header, 0–6. At 0 the die is
  drawn dashed and empty with "No escalation".
- Editing the round or the die does not move the turn.

Unit order: initiative high → low; ties by initiative bonus, then insertion order;
units without initiative at the bottom.

A unit added in Active gets its initiative rolled on add. A duplicated unit copies
the original's initiative.

Combat menu: Undo, Share, Restart, Clear.

#### Transitions

| Action | From | Effect | To |
|--------|------|--------|----|
| Start | setup, at least one unit | Rolls initiative for units without one. Round = 1, escalation = 0, turn = first unit in order. | active |
| Next turn | active | Turn moves to the next unit that is neither disabled nor dead. On wrap: round +1, escalation +1 up to 6. Blocked when round = 99 and the turn would wrap. Blocked when every unit is disabled or dead. | active |
| Edit round | active | Sets the round. | active |
| Set escalation die | active | Sets the die. | active |
| Restart, with confirm | active | Keeps units and claims. Resets initiative, HP to max, temp HP, conditions, disabled state, HP history, round, escalation die. | setup |
| Clear, with confirm | any | Removes every unit. Releases every claim. | setup |
| Remove last unit, with confirm | active | Removes the unit. Releases its claim. | setup |
| Remove active unit, with confirm | active | Turn moves to the next unit that is neither disabled nor dead; when there is none, the turn is unset and Next turn is blocked. | active |

#### Share

- Shows the link and a QR code.
- Copy the link. Toast "Link copied".
- Reissue, with confirm "Revoke the link?": revokes the link, issues a new one,
  releases every claim.

#### Undo

- DM only, from the combat menu.
- Covers every entry of the action log except claim and release. REST writes
  (combat title, description, color, link, presets) are not undoable.
- Depth: 10 steps back from the newest action.
- Player actions are in the same history and are undone the same way.
- Toast after undo: "Undid: <action>", no button.

#### Live updates

Every open session of a combat, DM or player, receives every change.

### Unit

#### Fields

| Field | Range or limit | Default |
|-------|----------------|---------|
| Name | 1–40 characters | `<Type> N`, N = count of that type + 1 |
| Type | Hero, Enemy, Ally | Enemy |
| Initiative bonus | −99 … 99 | 0 |
| Initiative | −9 … 99, or none | none |
| Max HP | 1 … 999 | 10 |
| Current HP | −max … 999 | max |
| Temp HP | 0 … 999 | 0 |
| AC, PD, MD | 0 … 99 | 10 |
| Note | 0–250 characters | empty |
| Conditions | subset of the 12 | none |
| Disabled | yes / no | no |

#### Form

Tabs New and From Library on create; no tabs on edit. Fields: name, type
(segmented), max HP, AC, PD, MD, initiative bonus, temp HP, note. A hint says that
initiative is rolled at Start in setup and on add in Active. From Library: search
and the tag filter, no sort; one preset per add; adding closes the form.

#### Actions

| Action | setup | active | Player on own Hero |
|--------|:-----:|:------:|:------------------:|
| Create; at 99 units blocked with the toast "This combat already has 99 units" | ✓ | ✓ | — |
| Edit in the form | ✓ | ✓ | ✓, type locked to Hero |
| Duplicate: `<name> 2`, `<name> 3`, …, right under the original, HP at max, no temp HP, no conditions, initiative copied | ✓ | ✓ | — |
| Remove, with confirm; toast `<name> removed` with Undo | ✓ | ✓ | — |
| Disable / enable | ✓ | ✓ | — |
| Save as preset | ✓ | ✓ | — |
| Initiative popover: − / + stepper, Roll d20 + bonus | ✓ | ✓ | ✓ |
| Damage, Heal, Set temp HP: calculator | ✓ | ✓ | ✓ |
| Set max HP: calculator | ✓ | ✓ | — |
| Toggle condition: picker | ✓ | ✓ | ✓ |
| Edit note inline | ✓ | ✓ | ✓ |
| Expand / collapse row | ✓ | ✓ | ✓, own row only |
| Release claim | ✓ | ✓ | ✓, own only |

The expanded row shows conditions, HP history, note and the card actions: Edit,
and a ⋯ menu with Duplicate, Disable / Enable, Save as preset, Release claim,
Remove. A player's own row has Edit and a ⋯ menu with Release claim.

#### HP calculator

- Bottom sheet with a numpad, amount up to three digits.
- Actions Damage, Heal, Set Temp, Set Max; a player's own hero has no Set Max.
- Actions are disabled until an amount is typed.
- A Now → After preview shows HP, temp HP and status.
- Applying closes the sheet and flashes the row for 2 s.
- HP history is shown inside the sheet, collapsed with a count.

#### Rules

- Temp HP absorbs damage first.
- Heal never raises HP above max.
- Damage never lowers HP below −max.
- Set Temp replaces temp HP.
- Set Max, minimum 1, caps current HP at the new max; a lower current HP stays.
- Health status: HP ≤ 0 → Dead; HP ≥ max → Full; HP ≥ 50% of max → Wounded;
  otherwise Bloodied.
- HP segments: Full 4, Wounded 3, Bloodied 2 when HP ≥ 25% of max else 1, Dead 0.
- Disabled and dead units are skipped in turn order and can still be edited and
  damaged.
- A note is saved when its field loses focus or the row collapses.
- A claimed unit shows the claimer's display name.

#### HP history

- One entry per damage, heal, temp HP or max HP change: kind, amount, resulting
  HP, round. In setup the round reads "Start".
- Newest first. Max shows `old → new`, Temp `+N temp`, Damage adds `(N temp)` for
  the part absorbed by temp HP.
- From the unit row it opens as its own sheet titled with the unit name, same rows.

#### Conditions

charmed, confused, dazed, fear, helpless, hindered, shocked, staggered, stuck,
stunned, vulnerable, weakened.

Picker: bottom sheet, two columns A–Z, any combination, each tap applies at once,
Done or × closes.

### Library

Actions:

- Create, edit, delete a preset (delete with confirm, toast `<name> deleted`).
- Duplicate a preset: `<name> 2`, tags copied, toast `<name> 2 created`.
- Save a unit as a preset from the combat screen: name, type, max HP, AC, PD, MD,
  initiative bonus; no tags. Toast `<name> added to Library`.
- Create a tag, toggle a tag on a preset.
- Pick a preset into a combat from the unit form.

Preset form fields: name, type, max HP, AC, PD, MD, initiative bonus, tags. Ranges
as for a unit.

Card: HP in the role block, AC / PD / MD as squares, a row of tags. A chevron
expands the card actions: Edit, and a ⋯ menu with Duplicate and Delete.

Tags:

- Names are compared case-insensitively; an existing tag's spelling is reused.
- A tag with no presets disappears.
- Filter: a Tags button with the count of active tags next to the search field;
  active tags as chips, × on a chip removes it, Clear removes all. Several tags
  match presets having any of them; tags and search combine.
- One tag sheet with checkboxes serves the filter and the preset form; each row
  shows its preset count; the filter sheet's button reads "Show N presets". A
  query that matches no tag offers Create "…"; the new tag is checked at once.

Sort: Newest first (default), A–Z, By type (Enemy, Ally, Hero, A–Z within each).
The chosen sort is remembered on the device.

Search by name. No hits: "Nothing found" with the query.

Empty library: the sort and Tags tools are hidden and New preset in the bottom bar
is the call to action. At 1000 presets New preset is disabled with the hint "limit
reached".

Deleting a preset does not change units in combats. Presets are private per DM.

### Settings

- Language: one of the six locales. Applies at once.

### Account

- Sign up with email and password, password at least 8 characters. No email
  verification. Errors: "At least 8 characters", "This email already has an
  account".
- Sign in with email and password; error "Wrong email or password".
- Sign in with Google or GitHub when the server has credentials for the provider.
  Each provider is shown only when configured.
- Sign out, lands on sign-in.
- Delete account, with confirm. Removes combats, presets, links and claims. Lands
  on sign-in with the toast "Your account was deleted".
- The password is set once, at sign-up.

### About

Description, version from the build, rules "13th Age", source link, privacy note,
donations, credits, "Not affiliated with Pelgrane Press".

### Navigation

- Drawer, 300 wide from the left, opens on swipe-right and from the header
  button. Items Combats, Library, Settings, Account, About; the account email at
  the bottom.
- Every interactive control has a localized accessible name. Dialogs trap focus.

### Toasts

- Shown above the bottom bar, never covering Next turn. Auto-hide after 4 s, 8 s
  with a button; × closes at once; newest on top.
- Copy: agents write the English strings for toasts, dialogs, empty states and
  About, translate them into the other five locales, and the owner corrects
  afterwards.

### Connection

- An action that gets no response: toast "Couldn't reach the server. Nothing
  changed." with Retry, which resends the same request with the same action id.
  The UI does not change state.
- Version conflict (409): the client refetches the document and shows the toast
  "The combat changed. Try again.", no button.
- SSE drop: the browser reconnects on its own. After 10 s without a connection the
  toast "Reconnecting…" without a button stays until the stream is back; then the
  document is refetched.
- First load without a response: the Can't reach the server screen.

## Player view

### Link

- Opened from `/combats/:id/play?t=<token>`.
- Each combat has a link generation number.
- The token is signed by the server with its own secret and contains the combat id
  and the generation.
- Reissue increases the generation; older tokens stop working.
- Tokens have no time limit.

### Heroes screen

- Shown on the first visit and from the header menu item Heroes.
- Lists every Hero of the combat and the display name input. Own heroes are
  checked and marked "You"; heroes of other players are locked with "<Name> is
  playing"; free heroes can be checked. Unchecking an own hero releases it.
- The button reads Join on the first visit and Done afterwards; disabled until a
  name and at least one hero are set.
- When a chosen hero gets claimed by someone else while the screen is open, the
  toast "<hero> was just taken" shows and the row locks.
- The header menu is hidden on this screen.

### Turn order screen

- Header: a read-only copy of the DM combat header with title, "Round N" or
  "Setup", escalation die (absent in setup), and a ⋯ menu with Heroes. No bottom
  bar.
- In setup a banner reads "Waiting for the DM to start the combat". After Clear the
  list reads "No units yet".
- Own hero row: "You" in the role block, light blue background, dashed underline
  under initiative and HP. Only own rows expand: conditions, HP history, note, and
  the card actions Edit and ⋯ with Release claim. Tap on own HP opens the
  calculator; tap on own initiative opens the initiative popover.
- Other rows show the HP column without border or segments, filled with the status
  color.
- DM events arrive as toasts: "The DM restarted the combat", "The DM cleared the
  combat", "The DM released <hero>. Pick a hero.", "The DM removed <hero>. Pick a
  hero." When the player holds no hero after a release or removal, the Heroes
  screen opens.

### Content

- Turn order, round, escalation die and the active unit, filtered by the visibility
  table.
- No drawer, no settings, no undo.
- Language: the DM's setting, read from the combat document.

### Updates

- Over SSE.
- When the combat is deleted or the link is reissued, the stream sends a final
  event and the view switches to Combat deleted or Link expired.

## Limits

| Thing | Limit |
|-------|-------|
| Combats per DM | 100 |
| Units per combat | 99 |
| Presets per DM | 1000 |
| Unit name | 40 characters |
| Combat title | 80 characters |
| Combat description | 500 characters |
| Note | 250 characters |
| Tag name | 24 characters |
| Player display name | 40 characters |
| Round | 1 … 99 |
| Escalation die | 0 … 6 |

## Design

- The Mantine theme object in `packages/ui/src/theme.ts` is the only source of
  design tokens; its values come from `Tokens.dc.html` and `Baselines.dc.html`.
- Mantine components are used where a handoff component maps onto one; the
  handoff's sizes, radii, borders and colors win over Mantine defaults.
- Agents build components and screens as Storybook stories in `packages/ui`, one
  story per state shown in the handoff. Stories are the source of truth for the UI.
- Coverage: every handoff component in every variant and state, every screen in
  every key state and flow step, every player-view screen.
- Acceptance: Next turn and damage reachable by thumb on a 6.1" phone; the longest
  strings of all six locales fit; a 99-unit roster scrolls; WCAG AA contrast on
  health states.

## Stack

### Client

- React 19.
- Vite+ (`vp`, ^1.1): one binary and one `vite.config.ts` for dev server, build,
  lint, format, type check, tests, library packaging and monorepo tasks.
- TypeScript.
- Mantine 9: `@mantine/core`, `@mantine/hooks`, `postcss-preset-mantine`,
  `postcss-simple-vars`. Styles are imported from `styles.layer.css` so project CSS
  always wins.
- CSS Modules.
- React Router, data mode.
- TanStack Query.
- react-i18next.
- `@tabler/icons-react`.
- `@fontsource/unbounded`, `@fontsource/rubik`, `@fontsource/noto-sans-jp`.
- `react-qr-code`.
- `ulid`.

### Storybook

- Storybook 10 with `@storybook/react-vite`.
- Addons: `@storybook/addon-docs`, `@storybook/addon-vitest`,
  `@storybook/addon-mcp`, `storybook-addon-remix-react-router`.
- Stories use CSF factories.
- Screen stories get data through a fake API client in context, not through
  network mocks.
- Stories run as tests through `vp test`. Screenshot tests run in a separate Vitest
  project over composed stories, with baselines committed and generated in a pinned
  Playwright Docker image.

### Server

- Node 24.
- Hono with `@hono/zod-validator`.
- Zod.
- Drizzle with `better-sqlite3`.
- SQLite in WAL mode.
- Better Auth with its Drizzle adapter.
- SSE for live updates.
- One server process.
- Migrations run at container start.

### Monorepo

- pnpm workspaces.
- `apps/web`: routing, auth guard, providers, real API client.
- `apps/server`: entry point, static files, migrations.
- `packages/domain`: pure functions, schemas, actions.
- `packages/api`: Drizzle schema, Hono sub-apps, the exported `AppType`, the
  `ApiClient` interface and its Hono implementation.
- `packages/ui`: theme, components, hooks, screens, fake API client, Storybook.
- Internal packages are imported from source through workspace links and TS
  project references; nothing is packed.

### Dev

- Vite proxies `/api` to the server so cookies and SSE share one origin.
- In Docker the server serves the built client.

### Tests

- Domain and server: Vitest through `vp test`.
- Components and screens: Storybook stories only. A story's play function is its
  interaction test; its screenshot is its visual baseline.
- End to end: Playwright against the real server and database.

### Hosting

- `docker compose up` runs the server with the built client and a volume for the
  database.
- Self-hosting is that one command.

## Architecture

### Actions

1. Every change to a combat document is an action: `damage`, `nextTurn`,
   `claimUnit`, `editNote`, … The client sends actions, never a whole document.
2. Creating, deleting and duplicating combats, editing combat title, description
   and color, opening a combat (last played), reissuing the link, and every write
   to presets, tags, settings and accounts are plain REST writes outside the action
   model. Those that change the document bump its version and broadcast it.
3. Clients generate ids (ULID) for combats, units, presets and actions. A repeated
   request with a known action id returns the earlier result.
4. Random values (initiative rolls) are generated by the client and sent in the
   action payload; the server validates the range. The reducer is pure.
5. Domain logic lives in `packages/domain` and runs identically on client and
   server. The server is the authority. `project(document, viewer)` builds the
   per-viewer document; viewer is `dm` or `{ playerId }`.
6. The document carries a `version`, the same in every projection. An action carries
   the version it was computed against. On mismatch the server answers 409.

### Action log

7. The server keeps, per combat, the current document and an append-only log. The
   log is never pruned.
8. A log entry holds the action, its author (`dm` or `playerId`), the timestamp and,
   for undoable actions, a patch of the prior state.
9. `claimUnit` and `releaseUnit` are logged without a patch. Every other action is
   undoable.
10. `undo` is a log entry that points at a target entry. It applies the patch of the
    newest entry that is undoable and not already undone; it stops at an entry
    without a patch. Undone entries stay in the log.

### Data flow

11. The client is a flux loop: the UI dispatches an action to the server; the server
    applies it and broadcasts the new projected document; the client replaces its
    state with that document; the UI renders. The UI never changes state on its own.
12. The UI reads and writes through hooks. Hooks wrap the API client and the SSE
    subscription; components never call either directly.
13. One SSE stream per combat. Each applied action broadcasts one projected document
    per connected viewer. Event id = version. Heartbeat every 15 seconds. On
    reconnect the client refetches when `Last-Event-ID` is behind.
14. An action's HTTP response returns only `{ version }`. SSE is the single state
    channel.
15. Deleting the combat sends a final event `deleted` with the combat title;
    reissuing the link sends `linkRevoked`. Both close the stream.
16. Combats and presets are hard-deleted.

## Process

- The owner reviews design in Storybook and in a browser, and features on a phone.
- Agents own code, tests and code review. They build the whole application from
  the handoff and this document in one run; the owner reviews the result.
- Checks: an agent runs the type check and its unit's tests before each commit;
  the orchestrator runs lint, type check, tests, Storybook build and app build
  before integrating a branch; e2e runs before a phase tag once it exists.
- Linear history; one commit per unit of work; a tag per build phase.

## Roadmap

- Redo. A `redo` log entry re-applies the newest undone entry.
- Enemy visibility controls. The DM chooses per unit or per combat which Enemy and
  Ally fields players see. Implemented as flags on the document read by `project`.
- AI preset parser. A photo or screenshot of a stat block opens a pre-filled preset
  form; the user saves it. Signed-in users only, per-user quota, images not retained,
  no compendium of copyrighted books.
- VPS deployment. Docker, Caddy as reverse proxy, Litestream sidecar to B2 or R2 on
  the shared database volume.
