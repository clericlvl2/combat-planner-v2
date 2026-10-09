# Combat Planner v2

## Vision

A 13th Age combat tracker for in-person play. The DM prepares combats on a desktop and
runs them from a phone. Players follow the combat on their own phones through a link or
QR code. Many DMs can use one server; each has a private account and library. Free,
funded by donations, self-hostable.

The project must be pleasant to own: a standard stack, a small architecture, a
consistent design. A feature must be both easy to maintain and useful at the table.

## Scope

- 13th Age only. No multi-system abstraction.
- Locales: en, de, es, fr, ja, ru.
- Phone layout for play, desktop layout for preparation.
- Tablet is supported but has no dedicated layout.
- Network is required.

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

## Roles

### DM

Has every action listed under Features.

### Player

- Opens a combat link.
- Enters a display name on the first claim.
- Claims Hero units.
- On claimed units sends only the actions marked "Player" in the Unit actions table.
- Has no account.
- Cannot undo.

### Player identity

- The player's browser generates a `playerId` (ULID) and stores it.
- Every request and the SSE subscription carry the `playerId`.
- The server stores `playerId → display name` per combat.

### Claims

- A unit is claimed by at most one player.
- A player may claim several units.
- The player may release their own claim.
- The DM may release any claim.
- Removing the unit releases the claim.
- Clear releases every claim.
- Changing the unit type away from Hero releases the claim.
- Revoking the link releases every claim.
- Restart keeps claims.
- A player whose browser lost the `playerId` sees the unit as claimed by another
  player and asks the DM to release it.

### Visibility for players

| Field | Hero | Enemy, Ally |
|-------|:----:|:-----------:|
| Name | ✓ | ✓ |
| Type | ✓ | ✓ |
| Health status | ✓ | ✓ |
| Conditions | ✓ | ✓ |
| Position in turn order | ✓ | ✓ |
| Disabled state | ✓ | ✓ |
| HP, temp HP, max HP | ✓ | — |
| AC, PD, MD | ✓ | — |
| Initiative value | ✓ | — |
| Note | ✓ | — |
| HP history | ✓ | — |

The server builds the player document from this table before sending. Hidden values
never reach a player's device.

## MVP

Everything under Pages, Features and Player view. Done means: a combat runs at a real
table from a phone, with players following on theirs.

## Pages

| Path | Content |
|------|---------|
| `/combats` | Combat list |
| `/combats/:id` | Combat screen |
| `/combats/:id/play` | Player view |
| `/library` | Presets |
| `/settings` | Language, theme |
| `/account` | Email, sign out, delete account |
| `/about` | Description, privacy note, version, donations, credits |
| `/auth/sign-in` | Sign in |
| `/auth/sign-up` | Sign up |
| `/auth/callback/:provider` | OAuth callback |

System screens:

- 404.
- Unexpected error.
- Combat not found. Shown to the DM when the combat is deleted or belongs to another DM.
- Link expired. Shown to a player whose token generation is old.
- Combat deleted. Shown to a player whose combat was deleted.

After sign-up the DM lands on an empty `/combats`.

## Features

### Combat list

Actions:

- Create a combat. New combats go to the top of the list.
- Edit title.
- Edit description.
- Edit color tag.
- Delete, with confirm.
- Copy. The copy has the same units with their stats and notes, HP at max, no
  conditions, state `setup`, no link, no claims, empty action log.
- Reorder by drag and drop.

Features:

- Color tag: one of 8 swatches.
- Search by title and description.
- Empty state with a Create button.

### Combat

A combat is in one of two states: `setup` or `active`.

#### Setup

Shown:

- Title.
- Unit list in insertion order.
- Initiative cell on every unit.
- Start button.

Hidden:

- Round.
- Escalation die.
- Active-turn highlight.

Combat actions available: Start, Clear, Share, undo, redo.
Combat actions not available: Next turn, Restart, Edit round, Set escalation die.

#### Active

Shown:

- Everything from Setup except the Start button.
- Round.
- Escalation die.
- Next turn button.
- Active-turn highlight.

Unit order:

- Initiative high → low.
- Ties by initiative bonus, then by insertion order.
- Units without initiative at the bottom.

Combat actions available: Next turn, Restart, Clear, Edit round, Set escalation die,
Share, undo, redo.
Combat actions not available: Start.

A unit added in Active gets its initiative rolled on add.

#### Transitions

| Action | From | Effect | To |
|--------|------|--------|----|
| Start | setup | Rolls initiative for units without one. Round = 1, escalation = 0, turn = first unit in order. | active |
| Next turn | active | Turn moves to the next enabled unit. On wrap: round +1, escalation +1 up to 6. Blocked when round = 99 and the turn would wrap. Blocked when every unit is disabled. | active |
| Edit round | active | Sets the round, 1–99. | active |
| Set escalation die | active | Sets the die, 0–6. | active |
| Restart, with confirm | active | Keeps units and claims. Resets initiative, HP to max, temp HP, conditions, disabled state, HP history, round, escalation die. | setup |
| Clear, with confirm | any | Removes every unit. Releases every claim. | setup |
| Remove last unit | active | Same as Clear, no confirm. | setup |
| Remove active unit | active | Turn moves to the next enabled unit. | active |

#### Share

- Show the link and a QR code.
- Copy the link.
- Revoke and reissue the link, with confirm.

#### Undo / redo

- DM only.
- Covers every unit and combat action except claim and release.
- Depth: 10 steps back from the newest action.
- Any new action clears the redo set.
- Player actions are in the same history and are undone the same way.

#### Live updates

Every open session of a combat, DM or player, receives every change.

### Unit

#### Fields

| Field | Range or limit | Default |
|-------|----------------|---------|
| Name | 1–40 characters | — |
| Type | Hero, Enemy, Ally | — |
| Initiative bonus | −99 … 99 | 0 |
| Initiative | −9 … 99, or none | none |
| Max HP | 1 … 999 | 10 |
| Current HP | −max … 999 | max |
| Temp HP | 0 … 999 | 0 |
| AC, PD, MD | 0 … 99 | 10 |
| Note | 0–250 characters | empty |
| Conditions | subset of the 12 | none |
| Disabled | yes / no | no |

#### Actions

| Action | setup | active | Player on own Hero |
|--------|:-----:|:------:|:------------------:|
| Create | ✓ | ✓ | — |
| Edit name, type, initiative bonus, max HP, AC, PD, MD, temp HP, note in the form | ✓ | ✓ | — |
| Duplicate, named `<name> 2`, `<name> 3`, … | ✓ | ✓ | — |
| Remove | ✓ | ✓ | — |
| Disable / enable | ✓ | ✓ | — |
| Save as preset | ✓ | ✓ | — |
| Roll initiative: tap, d20 + bonus | ✓ | ✓ | ✓ |
| Set initiative: long press | ✓ | ✓ | ✓ |
| Damage: numpad | ✓ | ✓ | ✓ |
| Heal: numpad | ✓ | ✓ | ✓ |
| Set temp HP: numpad | ✓ | ✓ | ✓ |
| Set max HP: numpad | ✓ | ✓ | — |
| Set AC, PD, MD | ✓ | ✓ | ✓ |
| Add condition | ✓ | ✓ | ✓ |
| Remove condition | ✓ | ✓ | ✓ |
| Edit note inline | ✓ | ✓ | ✓ |
| Expand / collapse row | ✓ | ✓ | ✓ |
| Release claim | ✓ | ✓ | ✓, own only |

#### Rules

- Temp HP absorbs damage first.
- Heal never raises HP above max, unless HP is already above max.
- Damage never lowers HP below −max.
- Changing max HP does not change current HP.
- Health status: HP ≤ 0 → Dead; HP ≥ max → Full; HP ≥ 50% of max → Wounded;
  otherwise Bloodied.
- A disabled unit is skipped in turn order and can still be edited and damaged.
- HP history keeps one entry per damage, heal, temp HP or max HP change, with the
  round number. In setup the round is empty.
- The expanded row shows the HP history.
- A claimed unit shows the player's display name to the DM.

#### Conditions

charmed, confused, dazed, fear, helpless, hindered, shocked, stuck, stunned,
vulnerable, weakened, staggered.

### Library

Actions:

- Create a preset.
- Edit a preset.
- Delete a preset, with confirm.
- Create a tag.
- Toggle a tag on a preset.
- Pick a preset into a combat from the unit form.

Features:

- Tag names are compared case-insensitively; an existing tag's spelling is reused.
- A tag with no presets disappears.
- Tag filter chips: the first 8 are shown, with a toggle to show all or fewer.
- Search by name.
- Private per DM.
- Empty state with a Create button.

### Settings

- Language: one of the six locales.
- Theme: system, dark or light.

### Account

- Sign up with email and password. No email verification.
- Sign in with Google or GitHub when the server has credentials for them. Absent
  providers are not shown.
- Sign out.
- Delete account, with confirm. Removes combats, presets, links and claims.
- The password is set once, at sign-up.

### Cross-cutting

- Navigation on phone: drawer, opens on swipe-right.
- Navigation on desktop: sidebar.
- Toast: saved as preset.
- Toast: cap reached.
- Toast: link copied.
- Toast: request failed, with a plain message about the connection. The UI does not
  change state.
- Every interactive control has a localized accessible name.
- Dialogs trap focus.

### Limits

| Thing | Limit |
|-------|-------|
| Combats per DM | 100 |
| Units per combat | 30 |
| Presets per DM | 1000 |
| Combat title | 60 characters |
| Combat description | 200 characters |
| Tag name | 30 characters |
| Player display name | 40 characters |
| Round | 1 … 99 |
| Escalation die | 0 … 6 |

## Player view

### Link

- Opened from `/combats/:id/play?t=<token>`.
- Each combat has a link generation number.
- The token is signed by the server with its own secret and contains the combat id
  and the generation.
- Revoke increases the generation; older tokens stop working.
- Tokens have no time limit.

### Screens

- Claim list: unclaimed Heroes and the display name input.
- Turn order. In setup it shows "waiting for the DM".
- Own unit expanded: the same numpad sheet, condition picker and inline note as the DM.
- Link expired.
- Combat deleted.
- Request failed toast.

### Content

- Turn order, round, escalation die and the active unit, filtered by the visibility
  table.
- No drawer, no settings, no undo.
- Phone layout on every device.
- Language: the DM's setting.
- Theme: the system theme.

### Updates

- Over SSE.
- When the combat is deleted or the link is revoked, the stream sends a final event
  and the view switches to the matching screen.

## Design

### Rules

- Mantine's default components and spacing are the baseline.
- Two layouts: phone and desktop.
- The combat screen in `active` and the player view use the phone layout on every
  device, centered.
- Flows every prototype includes:
  - Add unit with tabs New and From preset.
  - Numpad sheet with HP history.
  - Condition picker.
  - Initiative tap and long press.
  - Row expand and collapse.
  - Tag assignment in the preset form.
- The Mantine theme object in `packages/ui/theme.ts` is the only source of design
  tokens.

### Set by the prototypes

The accepted prototypes define:

- Phone layout details.
- Desktop layout details.
- Color-tag swatches, mapped to Mantine palette colors.
- Unit-type colors and icons.
- Health-status colors.
- Disabled style.
- Active-turn highlight.
- Condition icons.
- Empty, loading, error and confirm states.

### Process

- Agents build components and screens as Storybook stories in `packages/ui`.
- The owner reviews in Storybook and corrects in words.
- Accepted stories are the source of truth for implementation.
- Coverage: every page, on phone and desktop, in every state, plus every player-view
  screen.

### Acceptance

- Next turn and damage are reachable by thumb on a 6.1" phone.
- Readable in a dim room in dark theme.
- Both themes.
- The longest strings of all six locales fit.
- A 30-unit roster scrolls.
- WCAG AA contrast on health states.

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
- dnd-kit: `@dnd-kit/core` and `@dnd-kit/sortable`.
- react-i18next. The player view sets the language from the combat document.
- `@tabler/icons-react`.
- `@fontsource/*` for self-hosted fonts.
- `react-qr-code`.
- `ulid`.

### Storybook

- Storybook 10 with `@storybook/react-vite`.
- Addons: `@storybook/addon-docs`, `@storybook/addon-themes`,
  `@storybook/addon-vitest`, `@storybook/addon-mcp`,
  `storybook-addon-remix-react-router`.
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
- `apps/web`.
- `apps/server`.
- `packages/domain`: pure functions, schemas, actions.
- `packages/api`: Hono sub-apps and the exported `AppType`.
- `packages/ui`: theme, components, Storybook.
- `vp run` builds packages before the apps that depend on them, with caching.
- `packages/*` are packaged with `vp pack`.

### Dev

- Vite proxies `/api` to the server so cookies and SSE share one origin.
- In Docker the server serves the built client.

### Tests

- Domain and server: Vitest through `vp test`. The domain tests in
  `packages/domain` are the behavior specification. Where this document and the
  tests disagree, the tests win.
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
2. Creating, deleting, copying and reordering combats, and every write to presets,
   links, settings and accounts, are plain REST writes outside the action model.
3. Clients generate ids (ULID) for combats, units, presets and actions. A repeated
   request with a known action id returns the earlier result.
4. Random values (initiative rolls) are generated by the client and sent in the
   action payload; the server validates the range. The reducer is pure.
5. Domain logic lives in `packages/domain` and runs identically on client and
   server. The server is the authority. `project(document, viewer)` builds the
   per-viewer document; viewer is `dm` or `{ playerId }`.
6. The document carries a `version`, the same in every projection. An action carries
   the version it was computed against. On mismatch the server answers 409 and the
   client shows the request-failed toast.

### Action log

7. The server keeps, per combat, the current document and an append-only log. The
   log is never pruned.
8. A log entry holds the action, its author (`dm` or `playerId`), the timestamp and,
   for undoable actions, a patch of the prior state.
9. `claimUnit` and `releaseUnit` are logged without a patch. Every other action is
   undoable.
10. `undo` and `redo` are log entries that point at a target entry. Undo applies the
    patch of the newest entry that is undoable and not already undone; it stops at
    an entry without a patch. Redo re-applies the newest undone entry. Any other
    action clears the redo set.

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
15. Deleting the combat or revoking the link sends a final event, `deleted` or
    `linkRevoked`, and closes the stream.
16. Combats and presets are hard-deleted.

## Process

- The owner reviews design in a browser, features on a phone, and architecture as
  diagrams.
- Agents own code, tests and code review.
- Before implementation, three diagrams are produced and approved:
  - System context: client, server, player device.
  - Data model: combat, unit, preset, DM, link, claim, action log.
  - Sequence of a player HP edit: token check, claim check, action, version, log,
    SSE fan-out.
- Gate: `vp check`, `vp test`, i18n check, build, e2e. No commit is merged without
  the gate passing.
- Linear history; one change per commit.

## Roadmap

- Enemy visibility controls. The DM chooses per unit or per combat which Enemy and
  Ally fields players see. Implemented as flags on the document read by `project`.
- AI preset parser. A photo or screenshot of a stat block opens a pre-filled preset
  form; the user saves it. Signed-in users only, per-user quota, images not retained,
  no compendium of copyrighted books.
- VPS deployment. Docker, Caddy as reverse proxy, Litestream sidecar to B2 or R2 on
  the shared database volume.
