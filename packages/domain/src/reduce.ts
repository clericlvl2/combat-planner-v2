import type { Action, ActionOf } from './actions.ts';
import { authorize } from './authorize.ts';
import { DomainError } from './errors.ts';
import { copyTitle, duplicateName } from './names.ts';
import { LIMITS } from './schemas.ts';
import { skipsTurn, turnOrder } from './sort.ts';
import { CONDITIONS } from './types.ts';
import type {
  ActionId,
  Combat,
  CombatId,
  HpHistoryEntry,
  HpHistoryKind,
  Preset,
  PresetId,
  Unit,
  UnitId,
  Viewer,
} from './types.ts';
import { applyUndo } from './undo.ts';
import type { UndoableEntry, Undone } from './undo.ts';

export interface Patch {
  actionId: ActionId;
  fields: Partial<Combat>;
  units: Record<UnitId, Partial<Unit> | null>;
}

export interface Applied {
  combat: Combat;
  patch: Patch | null;
}

export type ApplyResult = Applied | Undone | DomainError;

export const NEXT_TURN_BLOCK_REASONS = [
  'notActive',
  'everyUnitDisabledOrDead',
  'lastRound',
] as const;
export type NextTurnBlockReason = (typeof NEXT_TURN_BLOCK_REASONS)[number];

export interface NextTurnTarget {
  unitId: UnitId;
  wraps: boolean;
}

type Step = Combat | DomainError;

const ACTIONS_WITHOUT_PATCH: ReadonlySet<Action['type']> = new Set(['claimUnit', 'releaseUnit']);

const PATCHED_COMBAT_FIELDS = [
  'title',
  'description',
  'color',
  'status',
  'round',
  'escalation',
  'activeUnitId',
  'lastPlayedAt',
  'linkGeneration',
  'players',
] as const satisfies readonly (keyof Combat)[];

const PATCHED_UNIT_FIELDS = [
  'name',
  'role',
  'initiativeBonus',
  'initiative',
  'maxHp',
  'hp',
  'tempHp',
  'ac',
  'pd',
  'md',
  'acMod',
  'pdMod',
  'mdMod',
  'note',
  'conditions',
  'disabled',
  'hpHistory',
] as const satisfies readonly (keyof Unit)[];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const rolledInitiative = (roll: number, bonus: number): number =>
  clamp(roll + bonus, LIMITS.initiative.min, LIMITS.initiative.max);

const notFound = (unitId: UnitId) =>
  new DomainError('notFound', `Unit ${unitId} is not in this combat`);
const blocked = (message: string) => new DomainError('blocked', message);
const invalid = (message: string) => new DomainError('invalid', message);
const unitLimit = () =>
  new DomainError('limit', `This combat already has ${LIMITS.unitsPerCombat} units`);

const findUnit = (combat: Combat, unitId: UnitId): Unit | undefined =>
  combat.units.find((unit) => unit.id === unitId);

const replaceUnit = (combat: Combat, next: Unit): Combat => ({
  ...combat,
  units: combat.units.map((unit) => (unit.id === next.id ? next : unit)),
});

const updateUnit = (combat: Combat, unitId: UnitId, update: (unit: Unit) => Unit): Step => {
  const unit = findUnit(combat, unitId);
  if (!unit) return notFound(unitId);
  return replaceUnit(combat, update(unit));
};

const requireActive = (combat: Combat, what: string): DomainError | null =>
  combat.status === 'active' ? null : blocked(`${what} needs an active combat`);

const historyRound = (combat: Combat): number | null =>
  combat.status === 'active' ? combat.round : null;

interface HistoryContext {
  round: number | null;
  at: string;
}

const historyContext = (combat: Combat, now: string): HistoryContext => ({
  round: historyRound(combat),
  at: now,
});

const withEntry = (
  unit: Unit,
  kind: HpHistoryKind,
  amount: number,
  absorbed: number,
  previous: number,
  context: HistoryContext,
): Unit => {
  const entry: HpHistoryEntry = {
    kind,
    amount,
    absorbed,
    previous,
    result: unit.hp,
    max: unit.maxHp,
    round: context.round,
    at: context.at,
  };
  return { ...unit, hpHistory: [...unit.hpHistory, entry].slice(-LIMITS.hpHistory) };
};

export type HpFields = Pick<Unit, 'hp' | 'tempHp' | 'maxHp'>;

export const applyHp = <T extends HpFields>(unit: T, kind: HpHistoryKind, amount: number): T => {
  switch (kind) {
    case 'damage': {
      const absorbed = Math.min(unit.tempHp, amount);
      return {
        ...unit,
        hp: Math.max(unit.hp - (amount - absorbed), -unit.maxHp),
        tempHp: unit.tempHp - absorbed,
      };
    }
    case 'heal':
      return { ...unit, hp: Math.min(unit.hp + amount, unit.maxHp) };
    case 'temp':
      return { ...unit, tempHp: amount };
    case 'max':
      return { ...unit, maxHp: amount, hp: Math.max(Math.min(unit.hp, amount), -amount) };
  }
};

const HP_PREVIOUS = {
  damage: 'hp',
  heal: 'hp',
  temp: 'tempHp',
  max: 'maxHp',
} as const satisfies Record<HpHistoryKind, keyof HpFields>;

const changeHp = (
  unit: Unit,
  kind: HpHistoryKind,
  amount: number,
  context: HistoryContext,
): Unit => {
  const next = applyHp(unit, kind, amount);
  const absorbed = kind === 'damage' ? unit.tempHp - next.tempHp : 0;
  return withEntry(next, kind, amount, absorbed, unit[HP_PREVIOUS[kind]], context);
};

const NO_DEFENSE_MODS = { acMod: 0, pdMod: 0, mdMod: 0 } as const satisfies Partial<Unit>;

const restartedUnit = (unit: Unit): Unit => ({
  ...unit,
  ...NO_DEFENSE_MODS,
  initiative: null,
  hp: unit.maxHp,
  tempHp: 0,
  conditions: [],
  disabled: false,
  hpHistory: [],
});

const firstEligible = (order: readonly Unit[]): Unit | undefined =>
  order.find((unit) => !skipsTurn(unit));

export const nextTurnTarget = (combat: Combat): NextTurnTarget | null => {
  const order = turnOrder(combat.units);
  const first = firstEligible(order);
  if (!first) return null;
  const current = order.findIndex((unit) => unit.id === combat.activeUnitId);
  const after = firstEligible(order.slice(current + 1));
  if (after) return { unitId: after.id, wraps: false };
  return { unitId: first.id, wraps: true };
};

export const nextTurnBlockReason = (combat: Combat): NextTurnBlockReason | null => {
  if (combat.status !== 'active') return 'notActive';
  const target = nextTurnTarget(combat);
  if (!target) return 'everyUnitDisabledOrDead';
  if (target.wraps && combat.round >= LIMITS.round.max) return 'lastRound';
  return null;
};

const start = (combat: Combat, action: ActionOf<'start'>): Step => {
  if (combat.status !== 'setup') return blocked('Start needs a combat in setup');
  if (combat.units.length === 0) return blocked('Add a unit first');
  const units: Unit[] = [];
  for (const unit of combat.units) {
    if (unit.initiative !== null) {
      units.push(unit);
      continue;
    }
    const roll = action.rolls[unit.id];
    if (roll === undefined) return invalid(`Missing initiative roll for unit ${unit.id}`);
    units.push({ ...unit, initiative: rolledInitiative(roll, unit.initiativeBonus) });
  }
  const order = turnOrder(units);
  const active = firstEligible(order) ?? order[0];
  return {
    ...combat,
    status: 'active',
    round: LIMITS.round.min,
    escalation: LIMITS.escalation.min,
    activeUnitId: active?.id ?? null,
    units,
  };
};

const nextTurn = (combat: Combat): Step => {
  const reason = nextTurnBlockReason(combat);
  if (reason) return blocked(reason);
  const target = nextTurnTarget(combat);
  if (!target) return blocked('everyUnitDisabledOrDead');
  if (!target.wraps) return { ...combat, activeUnitId: target.unitId };
  return {
    ...combat,
    activeUnitId: target.unitId,
    round: combat.round + 1,
    escalation: Math.min(combat.escalation + 1, LIMITS.escalation.max),
  };
};

export const restartedCombat = (combat: Combat): Combat => ({
  ...combat,
  status: 'setup',
  round: LIMITS.round.min,
  escalation: LIMITS.escalation.min,
  activeUnitId: null,
  units: combat.units.map(restartedUnit),
});

const restart = (combat: Combat): Step =>
  requireActive(combat, 'Restart') ?? restartedCombat(combat);

const clear = (combat: Combat): Step => ({
  ...combat,
  status: 'setup',
  round: LIMITS.round.min,
  escalation: LIMITS.escalation.min,
  activeUnitId: null,
  units: [],
});

const addUnit = (combat: Combat, action: ActionOf<'addUnit'>): Step => {
  if (combat.units.length >= LIMITS.unitsPerCombat) return unitLimit();
  if (findUnit(combat, action.unitId)) return invalid(`Unit ${action.unitId} already exists`);
  const unit: Unit = {
    id: action.unitId,
    name: action.name,
    role: action.role,
    initiativeBonus: action.initiativeBonus,
    initiative:
      combat.status === 'active' ? rolledInitiative(action.roll, action.initiativeBonus) : null,
    maxHp: action.maxHp,
    hp: action.maxHp,
    tempHp: action.tempHp,
    ac: action.ac,
    pd: action.pd,
    md: action.md,
    ...NO_DEFENSE_MODS,
    note: action.note,
    conditions: [],
    disabled: false,
    claimedBy: null,
    hpHistory: [],
  };
  return { ...combat, units: [...combat.units, unit] };
};

const editUnit = (combat: Combat, action: ActionOf<'editUnit'>, now: string): Step =>
  updateUnit(combat, action.unitId, (unit) => {
    const context = historyContext(combat, now);
    let next: Unit = {
      ...unit,
      name: action.name,
      role: action.role,
      initiativeBonus: action.initiativeBonus,
      ac: action.ac,
      pd: action.pd,
      md: action.md,
      note: action.note,
      claimedBy: action.role === 'hero' ? unit.claimedBy : null,
    };
    if (action.maxHp !== unit.maxHp) next = changeHp(next, 'max', action.maxHp, context);
    if (action.tempHp !== unit.tempHp) next = changeHp(next, 'temp', action.tempHp, context);
    return next;
  });

const duplicateUnit = (combat: Combat, action: ActionOf<'duplicateUnit'>): Step => {
  if (combat.units.length >= LIMITS.unitsPerCombat) return unitLimit();
  const index = combat.units.findIndex((unit) => unit.id === action.unitId);
  const source = combat.units[index];
  if (!source) return notFound(action.unitId);
  if (findUnit(combat, action.newUnitId)) return invalid(`Unit ${action.newUnitId} already exists`);
  const copy: Unit = {
    ...source,
    id: action.newUnitId,
    name: duplicateName(
      source.name,
      combat.units.map((unit) => unit.name),
    ),
    ...NO_DEFENSE_MODS,
    hp: source.maxHp,
    tempHp: 0,
    conditions: [],
    disabled: false,
    claimedBy: null,
    hpHistory: [],
  };
  const units = [...combat.units];
  units.splice(index + 1, 0, copy);
  return { ...combat, units };
};

const removeUnit = (combat: Combat, action: ActionOf<'removeUnit'>): Step => {
  if (!findUnit(combat, action.unitId)) return notFound(action.unitId);
  const units = combat.units.filter((unit) => unit.id !== action.unitId);
  if (combat.status === 'active' && units.length === 0) {
    return {
      ...combat,
      status: 'setup',
      round: LIMITS.round.min,
      escalation: LIMITS.escalation.min,
      activeUnitId: null,
      units,
    };
  }
  if (combat.activeUnitId !== action.unitId) return { ...combat, units };
  const target = nextTurnTarget(combat);
  const activeUnitId = target && target.unitId !== action.unitId ? target.unitId : null;
  return { ...combat, activeUnitId, units };
};

const toggleCondition = (combat: Combat, action: ActionOf<'toggleCondition'>): Step =>
  updateUnit(combat, action.unitId, (unit) => {
    const present = unit.conditions.includes(action.condition);
    const conditions = CONDITIONS.filter((condition) =>
      condition === action.condition ? !present : unit.conditions.includes(condition),
    );
    return { ...unit, conditions };
  });

const claimUnit = (combat: Combat, action: ActionOf<'claimUnit'>, author: Viewer): Step => {
  if (author.kind !== 'player') return new DomainError('forbidden', 'Only a player claims a hero');
  const unit = findUnit(combat, action.unitId);
  if (!unit) return notFound(action.unitId);
  return {
    ...replaceUnit(combat, { ...unit, claimedBy: author.playerId }),
    players: { ...combat.players, [author.playerId]: action.displayName },
  };
};

const step = (
  combat: Combat,
  action: Exclude<Action, { type: 'undo' }>,
  author: Viewer,
  now: string,
): Step => {
  const context = historyContext(combat, now);
  switch (action.type) {
    case 'start':
      return start(combat, action);
    case 'nextTurn':
      return nextTurn(combat);
    case 'editRound':
      return requireActive(combat, 'Edit round') ?? { ...combat, round: action.round };
    case 'setEscalation':
      return (
        requireActive(combat, 'Set escalation die') ?? { ...combat, escalation: action.escalation }
      );
    case 'restart':
      return restart(combat);
    case 'clear':
      return clear(combat);
    case 'addUnit':
      return addUnit(combat, action);
    case 'editUnit':
      return editUnit(combat, action, now);
    case 'duplicateUnit':
      return duplicateUnit(combat, action);
    case 'removeUnit':
      return removeUnit(combat, action);
    case 'setDisabled':
      return updateUnit(combat, action.unitId, (unit) => ({ ...unit, disabled: action.disabled }));
    case 'setInitiative':
      return updateUnit(combat, action.unitId, (unit) => ({
        ...unit,
        initiative: action.initiative,
      }));
    case 'rollInitiative':
      return updateUnit(combat, action.unitId, (unit) => ({
        ...unit,
        initiative: rolledInitiative(action.roll, unit.initiativeBonus),
      }));
    case 'damage':
      return updateUnit(combat, action.unitId, (unit) =>
        changeHp(unit, 'damage', action.amount, context),
      );
    case 'heal':
      return updateUnit(combat, action.unitId, (unit) =>
        changeHp(unit, 'heal', action.amount, context),
      );
    case 'setTempHp':
      return updateUnit(combat, action.unitId, (unit) =>
        changeHp(unit, 'temp', action.amount, context),
      );
    case 'setMaxHp':
      return updateUnit(combat, action.unitId, (unit) =>
        changeHp(unit, 'max', action.amount, context),
      );
    case 'toggleCondition':
      return toggleCondition(combat, action);
    case 'editNote':
      return updateUnit(combat, action.unitId, (unit) => ({ ...unit, note: action.note }));
    case 'setDefenseMods':
      return updateUnit(combat, action.unitId, (unit) => ({
        ...unit,
        acMod: action.ac,
        pdMod: action.pd,
        mdMod: action.md,
      }));
    case 'claimUnit':
      return claimUnit(combat, action, author);
    case 'releaseUnit':
      return updateUnit(combat, action.unitId, (unit) => ({ ...unit, claimedBy: null }));
  }
};

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every((key) => key in right && deepEqual(left[key], right[key]))
    );
  }
  return false;
};

const keep = <T, K extends keyof T>(target: Partial<T>, key: K, value: T[K]) => {
  target[key] = value;
};

const diff = (before: Combat, after: Combat, actionId: ActionId): Patch => {
  const fields: Partial<Combat> = {};
  for (const key of PATCHED_COMBAT_FIELDS) {
    if (!deepEqual(before[key], after[key])) keep(fields, key, before[key]);
  }
  const units: Patch['units'] = {};
  const afterIds = new Set(after.units.map((unit) => unit.id));
  if (before.units.some((unit) => !afterIds.has(unit.id))) {
    fields.units = before.units;
    return { actionId, fields, units };
  }
  for (const unit of after.units) {
    const prior = findUnit(before, unit.id);
    if (!prior) {
      units[unit.id] = null;
      continue;
    }
    const changed: Partial<Unit> = {};
    for (const key of PATCHED_UNIT_FIELDS) {
      if (!deepEqual(prior[key], unit[key])) keep(changed, key, prior[key]);
    }
    if (Object.keys(changed).length > 0) units[unit.id] = changed;
  }
  return { actionId, fields, units };
};

export const apply = (
  combat: Combat,
  action: Action,
  author: Viewer,
  now: string,
  stack: readonly UndoableEntry[] = [],
): ApplyResult => {
  const allowed = authorize(combat, action, author);
  if (allowed !== true) return allowed;
  if (action.version !== combat.version) {
    return new DomainError(
      'version',
      `Action version ${action.version} does not match combat version ${combat.version}`,
    );
  }
  if (action.type === 'undo') return applyUndo(combat, action, now, stack);
  const next = step(combat, action, author, now);
  if (next instanceof DomainError) return next;
  return {
    combat: { ...next, version: combat.version + 1, updatedAt: now },
    patch: ACTIONS_WITHOUT_PATCH.has(action.type) ? null : diff(combat, next, action.id),
  };
};

export const presetFromUnit = (unit: Unit, presetId: PresetId, now: string): Preset => ({
  id: presetId,
  name: unit.name,
  role: unit.role,
  maxHp: unit.maxHp,
  ac: unit.ac,
  pd: unit.pd,
  md: unit.md,
  initiativeBonus: unit.initiativeBonus,
  tags: [],
  createdAt: now,
  updatedAt: now,
});

export const copyCombat = (combat: Combat, combatId: CombatId, now: string): Combat => ({
  ...combat,
  id: combatId,
  title: copyTitle(combat.title),
  status: 'setup',
  round: LIMITS.round.min,
  escalation: LIMITS.escalation.min,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version: 1,
  units: combat.units.map((unit) => ({
    ...restartedUnit(unit),
    disabled: unit.disabled,
    claimedBy: null,
  })),
  players: {},
  createdAt: now,
  updatedAt: now,
});
