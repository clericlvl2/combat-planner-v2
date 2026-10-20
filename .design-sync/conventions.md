# Combat Planner UI: conventions

A 13th Age combat tracker played at the table from phones. The DM runs combats; players follow their heroes. Mantine 9 underneath, `window.CombatPlannerUi` on the page.

## Wrap every render

- `UiProvider` (props `locale`: `en de es fr ja ru`, `motion`: `on`/`off`) supplies the theme, the `--cp-*` CSS variables and translations. Components outside it render unstyled and show translation keys.
- Screens also need `ApiProvider` with a `FakeApiClient` (`scenario(...)` builds its data; `DM_ACCOUNT` is the signed-in DM) and a router: `createMemoryRouter` + `RouterProvider` from the same global.

## Layout

- Phone first: design at 390×844, and check 320×568 (iPhone SE). The status bar is 44 px; `PageHeader` is 168 px tall.
- Every tap target is at least 44 px.
- Sheets (`Sheet`, `NumpadSheet`, `UnitForm`, `SortSheet`, `TagSheet`, `ShareSheet`) scroll their body and keep their actions in a fixed footer.
- Width tiers to come: phone 320–599, tablet 600–1023, desktop ≥ 1024 with content capped at 1440.

## Tokens

- Colors: `--cp-color-background` (cream), `--cp-color-surface`, `--cp-color-ink`, `--cp-color-muted`, `--cp-color-border`, `--cp-color-accent`, `--cp-color-highlight`.
- Roles: `--cp-role-hero`, `--cp-role-enemy`, `--cp-role-ally`, `--cp-role-inactive`.
- Health: `--cp-health-full`, `--cp-health-wounded`, `--cp-health-staggered`, `--cp-health-dead`; HP actions `--cp-hp-damage`, `--cp-hp-heal`, `--cp-hp-set-temp`, `--cp-hp-set-max`.
- Type: `--cp-font-display` (Unbounded, headings and numbers), `--cp-font-ui` (Rubik; Noto Sans JP for `ja`).

## Domain words

Unit (hero, enemy, ally), preset (a saved unit), initiative, round, escalation die (0–6), AC / PD / MD, HP and temp HP, health status (full, wounded, staggered, dead), conditions. Players never see enemy HP or defenses.
