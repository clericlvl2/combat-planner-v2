import { healthSegments, healthStatus } from './healthStatus.ts';
import { turnOrder } from './sort.ts';
import type { Combat, PlayerCombat, PlayerId, PlayerUnit, Unit, Viewer } from './types.ts';

type DmViewer = Extract<Viewer, { kind: 'dm' }>;
type PlayerViewer = Extract<Viewer, { kind: 'player' }>;

const visibleUnits = (combat: Combat): Unit[] => {
  const order = combat.status === 'active' ? turnOrder(combat.units) : combat.units;
  return order.filter((unit) => !unit.disabled);
};

const playerUnit = (unit: Unit, position: number, playerId: PlayerId): PlayerUnit => {
  const status = healthStatus(unit.hp, unit.maxHp);
  const everyColumn: PlayerUnit = {
    id: unit.id,
    name: unit.name,
    role: unit.role,
    healthStatus: status,
    healthSegments: healthSegments(status, unit.hp, unit.maxHp),
    conditions: unit.conditions,
    position,
    initiative: unit.initiative,
  };
  const friendlyColumns: PlayerUnit = {
    ...everyColumn,
    claimedBy: unit.claimedBy,
    hp: unit.hp,
    tempHp: unit.tempHp,
    maxHp: unit.maxHp,
    ac: unit.ac,
    pd: unit.pd,
    md: unit.md,
  };
  if (unit.claimedBy === playerId) {
    return { ...friendlyColumns, note: unit.note, hpHistory: unit.hpHistory };
  }
  if (unit.role === 'enemy') return everyColumn;
  return friendlyColumns;
};

export function project(combat: Combat, viewer: DmViewer): Combat;
export function project(combat: Combat, viewer: PlayerViewer): PlayerCombat;
export function project(combat: Combat, viewer: Viewer): Combat | PlayerCombat;
export function project(combat: Combat, viewer: Viewer): Combat | PlayerCombat {
  if (viewer.kind === 'dm') return combat;
  return {
    ...combat,
    units: visibleUnits(combat).map((unit, index) => playerUnit(unit, index + 1, viewer.playerId)),
  };
}
