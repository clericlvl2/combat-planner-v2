# Handoff vs vision.md: discrepancies

Three read-only sweeps over `docs/design/handoff/` (atoms+molecules, organisms, screens
and flows) against `docs/vision.md`. Visual values excluded. Decision column holds the owner's answers of 2026-10-16; `fold` = handoff rule goes into vision.md as is.

## Conflicts, owner decides

| # | Topic | Handoff | vision.md | Decision |
|---|-------|---------|-----------|----------|
| 1 | Remove unit | confirm dialog "Remove X? Undo can bring it back", then toast "X removed" with Undo | no confirm |  1a handoff dialog + toast with Undo |
| 2 | Undo toast | "Undid: …" with Redo action | no redo control |  toast without action; no redo |
| 3 | Failed toast | Retry action resends the request | no retry |  keep Retry, same action id |
| 4 | Player initiative | own hero, setup only ("Rolling closes once the combat starts") | setup and active |  setup and active (vision) |
| 5 | Player Set AC/PD/MD | no UI, DefenseLine display only | allowed on own Hero |  player edits own hero through Edit, type locked |
| 6 | Claim list | all heroes, taken ones locked "<Name> is playing"; PlayerRow "Claimed by <name>" | unclaimed only; claimer name DM-only |  handoff; names visible to players |
| 7 | Heroes per player | one; Change hero frees the current one at once | several |  several; Heroes screen with checkboxes, Join/Done |
| 8 | Preset defenses | 1–40 | unit AC/PD/MD 0–99 |  0–99 everywhere |
| 9 | Preset form | no initiative bonus field | Save as preset stores initiative bonus |  add initiative bonus stepper to preset form |
| 10 | Tag Create row | shown also on partial match (LB-F4.7, "mo" → Mooks + Create) | only when nothing matches |  only when nothing matches (vision) |
| 11 | Duplicate unit in Active | initiative copied, HP full, conditions cleared | "unit added in Active gets initiative rolled" |  initiative copied |
| 12 | Preset duplicate position | under the original | Newest first sort puts it on top |  top, as newest |
| 13 | Link revoked screen | PV-F5.4 no action; MessageScreen variant has "Try again"; also a full-screen "no connection" variant with retry | toast only for failures |  first-load screen with Try again; action toast with Retry; 409 silent refetch + toast; SSE "Reconnecting…" toast after 10 s; revoked/deleted screens without action |
| 14 | About page | Version, Rules 13th Age, Source GitHub, Pelgrane disclaimer | description, privacy note, version, donations, credits |  add description, privacy note, donations, credits to handoff rows |
| 15 | From Library add | CS-F1.4 arrow "Add · ×6" vs UnitForm CTA "Add <name>" single | pick a preset (singular) |  one preset per add, form closes |
| 16 | Next turn blocked by dead units | reason text only "Every unit is disabled" | blocked when all disabled or dead |  one text for both |

## Handoff rules absent in vision.md, fold unless objected

- Start unavailable with no units; TurnBar "Add a unit first"; combat-screen EmptyState with Add unit.
- UnitForm: empty name → "<Type> 1"; Type default Enemy; hint about initiative roll per status.
- Next turn button second line: next unit name, "· round N" on wrap. Blocked texts "Round 99 is the last", "Every unit is disabled".
- Edit round and Set escalation do not move the turn. Round editor is a popover with a stepper.
- HP change and Duplicate flash the row 2 s. NumpadSheet shows Now/After preview; closes after apply. Set Max minimum 1. Numpad max 3 digits.
- HP segments: Full 4, Wounded 3, Bloodied 2 if HP ≥ max/4 else 1, Dead 0.
- HP history newest first; collapsed in the calculator with a count; setup entries labelled "Start" in the round column; Max shows "old → new", Temp "+N temp", Damage "(N temp)".
- Note saves on row collapse and on blur.
- Active row may scroll out of view, no pin.
- Combat card meta: Active "Round N · M units", Setup "M units"; in Last played sort adds Today / Yesterday / N days ago / Never played.
- Sort choice remembered per device (localStorage).
- Combat form: title required, Create disabled until valid; default colour swatch 7; Create opens the combat screen.
- Combat copy: keeps description and colour; toast "<title> (copy) created"; delete toast "<title> deleted".
- Empty list hides Sort/Tags tools; search with no hits shows "Nothing found" with the query.
- Caps 100 combats / 1000 presets: bottom button disabled with hint "limit reached". Unit cap 99: toast.
- Library: tags filter OR, combined with search; tag sheet shows per-tag counts, CTA "Show N presets"; By type order Enemy, Ally, Hero, A–Z within; preset duplicate "<name> 2" with tags copied; saved preset has no tags; toasts "added to Library", "created", "deleted".
- Player view: Join disabled until name and hero; banner "Waiting for the DM to start the combat" in setup; after Clear empty list "No units yet"; after DM release/remove back to claim list with toast; Change hero prefills the name; picker hides the header menu; deleted screen shows the combat title (final event carries it).
- Toasts: auto-hide 4 s, 8 s with action; × closes; stack newest on top.
- Chips: × removes one tag; Clear removes all. ConditionPicker: Done or × closes, each tap applies.
- Auth: password ≥ 8, errors "At least 8 characters", "This email already has an account", "Wrong email or password"; sign-out and delete land on sign-in, delete shows a toast. OAuth providers shown per provider.
- Drawer: Combats, Library, Settings, Account, About, email at the bottom. Language applies at once.
- Reissue button opens the dialog "Revoke the link?"; one action, named Reissue in code.
