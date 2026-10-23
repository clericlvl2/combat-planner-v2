import type { DmCombat } from '@combat-planner/api/client';
import { DomainError, apply, applyHp, healthSegments, healthStatus } from '@combat-planner/domain';
import type {
  Action,
  ActionId,
  Combat,
  CombatId,
  HpHistoryKind,
  PlayerCombat,
  PlayerUnit,
} from '@combat-planner/domain';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { combatKey } from './combat.ts';
import type {
  CombatDocument,
  CombatEntry,
  DmViewer,
  PendingTracker,
  PlayerViewer,
} from './combat.ts';

export interface PendingEntry {
  action: Action;
  serverVersion?: number;
  refused?: boolean;
}

export type Entries = readonly PendingEntry[];

export const NO_ENTRIES: Entries = [];

const DM = { kind: 'dm' } as const;

const DM_WAITS: ReadonlySet<Action['type']> = new Set(['undo', 'claimUnit', 'releaseUnit']);

const PLAYER_HP_KINDS = {
  damage: 'damage',
  heal: 'heal',
  setTempHp: 'temp',
} as const satisfies Partial<Record<Action['type'], HpHistoryKind>>;

type PlayerHpType = keyof typeof PLAYER_HP_KINDS;

const isPlayerHp = (action: Action): action is Extract<Action, { type: PlayerHpType }> =>
  action.type in PLAYER_HP_KINDS;

export const isOptimistic = (action: Action, viewer: DmViewer | PlayerViewer): boolean =>
  viewer.kind === 'dm' ? !DM_WAITS.has(action.type) : isPlayerHp(action);

export const pendingKey = (id: CombatId, viewer: DmViewer | PlayerViewer): QueryKey => [
  ...combatKey(id, viewer),
  'pending',
];

const replace = (
  entries: Entries,
  actionId: ActionId,
  change: (entry: PendingEntry) => PendingEntry,
): Entries =>
  entries.some((entry) => entry.action.id === actionId)
    ? entries.map((entry) => (entry.action.id === actionId ? change(entry) : entry))
    : entries;

export const addEntry = (entries: Entries, action: Action): Entries =>
  entries.some((entry) => entry.action.id === action.id)
    ? replace(entries, action.id, () => ({ action }))
    : [...entries, { action }];

export const settleEntry = (entries: Entries, actionId: ActionId, serverVersion: number): Entries =>
  replace(entries, actionId, (entry) => ({ ...entry, serverVersion }));

export const refuseEntry = (entries: Entries, actionId: ActionId): Entries =>
  replace(entries, actionId, (entry) => ({ ...entry, refused: true }));

export const dropEntry = (entries: Entries, actionId: ActionId): Entries =>
  entries.some((entry) => entry.action.id === actionId)
    ? entries.filter((entry) => entry.action.id !== actionId)
    : entries;

const confirmed = (entry: PendingEntry, version: number): boolean =>
  entry.serverVersion !== undefined && entry.serverVersion <= version;

export const pruneEntries = (entries: Entries, version: number): Entries =>
  entries.some((entry) => confirmed(entry, version))
    ? entries.filter((entry) => !confirmed(entry, version))
    : entries;

const lastApplied = (document: CombatDocument): ActionId | undefined =>
  'undo' in document ? document.undo?.action.id : undefined;

const liveEntries = (document: CombatDocument, entries: Entries): Entries => {
  const last = lastApplied(document);
  return entries.filter(
    (entry) =>
      entry.refused !== true && !confirmed(entry, document.version) && entry.action.id !== last,
  );
};

const overlayDm = (document: DmCombat, entries: Entries, now: string): DmCombat => {
  let current: Combat = document;
  let changed = false;
  for (const { action } of entries) {
    const result = apply(current, { ...action, version: current.version }, DM, now);
    if (result instanceof DomainError) continue;
    current = result.combat;
    changed = true;
  }
  return changed ? { ...document, ...current, undo: null } : document;
};

const changeHp = (unit: PlayerUnit, kind: HpHistoryKind, amount: number): PlayerUnit => {
  if (unit.mine !== true || unit.hp === undefined || unit.maxHp === undefined) return unit;
  const next = applyHp({ hp: unit.hp, tempHp: unit.tempHp ?? 0, maxHp: unit.maxHp }, kind, amount);
  const status = healthStatus(next.hp, next.maxHp, unit.role);
  return {
    ...unit,
    hp: next.hp,
    tempHp: next.tempHp,
    healthStatus: status,
    healthSegments: healthSegments(status, next.hp, next.maxHp),
  };
};

const overlayPlayer = (document: PlayerCombat, entries: Entries): PlayerCombat => {
  let units = document.units;
  let changed = false;
  for (const { action } of entries) {
    if (!isPlayerHp(action)) continue;
    const kind = PLAYER_HP_KINDS[action.type];
    units = units.map((unit) => {
      if (unit.id !== action.unitId) return unit;
      const next = changeHp(unit, kind, action.amount);
      changed ||= next !== unit;
      return next;
    });
  }
  return changed ? { ...document, units } : document;
};

export function overlay(
  document: DmCombat,
  entries: Entries,
  viewer: DmViewer,
  now?: string,
): DmCombat;
export function overlay(
  document: PlayerCombat,
  entries: Entries,
  viewer: PlayerViewer,
  now?: string,
): PlayerCombat;
export function overlay(
  document: CombatDocument,
  entries: Entries,
  viewer: DmViewer | PlayerViewer,
  now: string = new Date().toISOString(),
): CombatDocument {
  const live = liveEntries(document, entries);
  if (live.length === 0) return document;
  return viewer.kind === 'dm'
    ? overlayDm(document as DmCombat, live, now)
    : overlayPlayer(document as PlayerCombat, live);
}

export function pendingTracker(
  queryClient: QueryClient,
  id: CombatId,
  viewer: DmViewer | PlayerViewer,
): PendingTracker {
  const key = pendingKey(id, viewer);
  const documentVersion = () =>
    queryClient.getQueryData<CombatEntry>(combatKey(id, viewer))?.document.version;
  const update = (change: (entries: Entries) => Entries) => {
    const current = queryClient.getQueryData<Entries>(key) ?? NO_ENTRIES;
    const next = change(current);
    if (next !== current) queryClient.setQueryData<Entries>(key, next);
  };
  const prune = () => {
    const version = documentVersion();
    if (version !== undefined) update((entries) => pruneEntries(entries, version));
  };
  return {
    optimistic: (action) => isOptimistic(action, viewer),
    add: (action) => update((entries) => addEntry(entries, action)),
    settle: (actionId, version) => {
      update((entries) => settleEntry(entries, actionId, version));
      prune();
    },
    refuse: (actionId) => update((entries) => refuseEntry(entries, actionId)),
    drop: (actionId) => update((entries) => dropEntry(entries, actionId)),
    prune,
  };
}
