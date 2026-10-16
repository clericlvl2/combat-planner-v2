# Brief: 1-domain-core

Batch `1-domain-core`, phase 1 of `.claude/plans/2026-10-16-build-combat-planner-v2.md`.
Rules: `CLAUDE.md` at the worktree root, including Commands, Versions,
Dependencies. Spec: plan sections «Решения владельца» (every bullet is law) and
«Фаза 1 — packages/domain и контракт API», block `1-domain-core`; `docs/vision.md`
sections Roles (DM, Player, Player identity, Claims, Visibility for players),
Features → Combat (Setup, Active, Transitions, Share, Undo), Features → Unit
(Fields, Form, Actions, HP calculator, Rules, HP history, Conditions), Library
(presets, tags), Limits, Architecture (Actions, Action log, Data flow). The handoff
README section Key interaction rules restates some of them; vision.md wins. No
renders are needed.

## Worktree

- Path: `/home/artem-budarnyh/projects/combat-planner-v2.wt/1-domain-core`, branch
  `agent/1-domain-core`. Work only inside that path.
- Tool-call limit: 200. At the limit, write `REPORT.md`, stop every process, hand
  back.
- Node 24: `source ~/.nvm/nvm.sh && nvm use` in every shell;
  `pnpm install --frozen-lockfile` first.

## Existing pattern

`packages/domain/src/health.ts` and `health.test.ts` are the phase-0 skeleton:
Zod 4 schemas with inferred types, tests through `vite-plus/test`. The skeleton
`healthSchema` / `tickSchema` stay exported from `index.ts` because
`packages/api` and `apps/server` import them; the unit `health` below is the
health status of a unit, a different module `healthStatus.ts`.

## Units, in this order, one commit each

Subjects `feat(domain): <unit>`; each commit carries its module, its export line
in `packages/domain/src/index.ts`, and its tests in
`packages/domain/test/<unit>.test.ts`.

1. `types`: `packages/domain/src/types.ts`. `Combat` (`id`, `title`,
   `description`, `color` 0–7, `status: 'setup' | 'active'`, `round`,
   `escalation` 0–6, `activeUnitId | null`, `lastPlayedAt | null`,
   `linkGeneration`, `version`, `units[]`, `players: Record<PlayerId,
   DisplayName>`, `createdAt`, `updatedAt`), `Unit` (every field of vision «Unit →
   Fields» plus `id`, `claimedBy: PlayerId | null`, `hpHistory[]`),
   `HpHistoryEntry` (`kind: 'damage' | 'heal' | 'temp' | 'max'`, `amount`,
   `result`, `round | null`, `at`), `Preset` (vision Library), `Tag`,
   `Condition` (the 12 names of vision Conditions, in that order),
   `HealthStatus: 'full' | 'wounded' | 'bloodied' | 'dead'`, `Role: 'hero' |
   'enemy' | 'ally'`, `Viewer = { kind: 'dm' } | { kind: 'player', playerId }`,
   `PlayerCombat` (the player projection type, same shape as `Combat` minus the
   fields the visibility table hides; the projection itself is batch
   `1-domain-rest`). Ids are ULID strings.
2. `schemas`: `packages/domain/src/schemas.ts`. `LIMITS` (vision Limits: units
   per combat 99, name 40, title 80, description 500, note 250, tag 24, Max HP
   999, HP range −999..999, defenses 0–99, round 1–99, escalation 0–6, colors
   0–7, initiative bonus range per vision) and a Zod schema per type of unit 1,
   with the limits applied; the schemas are the source of the types where the
   two would otherwise duplicate (`z.infer`).
3. `actions`: `packages/domain/src/actions.ts`. A discriminated union `Action` with
   `type` literals `start` (payload `rolls: Record<UnitId, number>`), `nextTurn`,
   `editRound`, `setEscalation`, `restart`, `clear`, `undo`, `addUnit`,
   `editUnit`, `duplicateUnit`, `removeUnit`, `setDisabled`, `setInitiative`,
   `rollInitiative` (payload `roll`), `damage`, `heal`, `setTempHp`,
   `setMaxHp`, `toggleCondition`, `editNote`, `claimUnit`, `releaseUnit`. Every
   action carries `id` (ULID) and `version` (the combat version it was built
   against). Zod schema per action and `actionSchema` for the union; payloads
   use the limits of unit 2.
4. `health`: `packages/domain/src/healthStatus.ts`. `healthStatus(hp, maxHp)` per
   the handoff README Health status rule (Full, Wounded ≥ 50 %, Bloodied < 50 %,
   Dead ≤ 0) and `healthSegments(status)` (4/3/2 or 1/0 per the same rule, the 2
   or 1 split per vision or the README; when neither says, 2 at ≥ 25 % and 1
   below, and write the question into `REPORT.md`).
5. `sort`: `packages/domain/src/sort.ts`. `turnOrder(units)` for the Active
   screen: initiative descending, ties per vision (when vision is silent: higher
   initiative bonus first, then heroes before allies before enemies, then name
   A–Z, then id); `skipsTurn(unit)` for disabled and dead units.
6. `names`: `packages/domain/src/names.ts`. `duplicateName(name, existing)` →
   `<name> 2`, `<name> 3` … within the name limit; `copyTitle(title)` →
   `<title> (copy)` within the title limit; `normalizeTag(tag)` for the
   case-insensitive 24-character tag rule.
7. `reduce`: `packages/domain/src/reduce.ts`. `apply(combat, action, author:
   Viewer, now: string) → { combat, patch } | DomainError` where `patch` is the
   snapshot of the fields the action changed (the shape the `undo` unit of batch
   `1-domain-rest` consumes: `{ actionId, fields: Partial<Combat>, units:
   Record<UnitId, Partial<Unit> | null> }`); `DomainError` carries `code`
   (`version`, `forbidden`, `blocked`, `limit`, `notFound`, `invalid`) and
   `message`. Rules: every owner decision bullet about escalation, Set Temp, Heal
   cap, Set Max, Duplicate, copy, tag, Save as preset, player claims; vision
   Transitions, Undo (`apply` delegates the `undo` action to `applyUndo` from
   `packages/domain/src/undo.ts`; this batch ships `undo.ts` as a stub whose
   `applyUndo` returns `DomainError` `invalid`, and batch `1-domain-rest`
   replaces it), HP calculator, Unit Rules, HP history (an entry per damage, heal, temp, max
   with `result` and the round when active), Conditions. `version` mismatch →
   `DomainError` `version`. `nextTurnBlockReason(combat) → string | null` with
   the reasons the Active screen shows on a blocked Next turn.
8. `authorize`: `packages/domain/src/authorize.ts`. `authorize(combat, action,
   viewer) → true | DomainError` from the vision table «Unit → Actions» (DM
   column, Player column) and the Claims rules (a player acts only on units they
   claimed; `claimUnit` only on an unclaimed hero; `releaseUnit` on their own
   claim, the DM on any). `apply` calls it first.

## Allowed paths

`packages/domain/src/**` (not `health.ts`, `health.test.ts`),
`packages/domain/test/**`, `packages/domain/package.json`,
`packages/domain/tsconfig.json` (add `test` to `include`), `vite.config.ts`
(only the `unit` project `include` array: add `packages/*/test/**/*.test.ts`),
`pnpm-lock.yaml` only when a listed dependency moves. Out of scope: everything
else, in particular `docs/**`, `.claude/**`, `packages/api`, `packages/ui`,
`apps/**`, `CLAUDE.md`, `scripts/**`.

## Tests

`packages/domain/test/<unit>.test.ts`, `vite-plus/test`, importing only from
`../src/index.ts`. Test names are the rows of the vision tables and the
sentences of the vision rule lists, verbatim, so that the phase-1 script
`check-domain-tests.mjs` (batch `1-domain-rest`) can match them; a test the
tables do not name gets a plain descriptive name. Every branch of `reduce.ts`
has a test. No comments in code or tests.

## Pre-commit

`pnpm check && pnpm test` before each commit.

## Acceptance criteria

1. `pnpm check`, `pnpm test`, `pnpm build` exit 0.
2. `packages/domain/src/index.ts` exports every type, schema, `LIMITS`,
   `Action`, `actionSchema`, `apply`, `nextTurnBlockReason`, `authorize`,
   `healthStatus`, `healthSegments`, `turnOrder`, `skipsTurn`, `duplicateName`,
   `copyTitle`, `normalizeTag`, `DomainError`.
3. Every bullet of «Решения владельца» 2026-10-16 about combat behaviour
   (escalation, Set Temp, Heal cap, Set Max cut, Duplicate name and position,
   copy title, tag length and case, Save as preset fields, player claims, undo
   depth and exclusions) has a test in `packages/domain/test/reduce.test.ts` or
   `authorize.test.ts` whose name quotes the bullet.
4. Every row of vision «Transitions» and «Unit → Actions» has a test with the
   row's text as its name; every sentence of «Unit → Rules» has a test with that
   sentence as its name.
5. `apply` rejects an action whose `version` differs from `combat.version` with
   `DomainError` `version`, and increments `combat.version` by one on success.
6. `nextTurnBlockReason` returns `null` on a combat where Next turn is allowed
   and a reason string for each blocked case vision names.
7. Eight commits with the unit subjects above, nothing else on the branch; no
   `//` or `/*` comments.

## Hand-back

No processes are expected. `REPORT.md` sections per `CLAUDE.md`. The hand-back
message is the `REPORT.md` path only.
