import { healthSegments, healthStatus } from './healthStatus.ts';
import { turnOrder } from './sort.ts';
import type { Combat, PlayerCombat, PlayerId, PlayerUnit, Unit, Viewer } from './types.ts';

type DmViewer = Extract<Viewer, { kind: 'dm' }>;
type PlayerViewer = Extract<Viewer, { kind: 'player' }>;

const visibleUnits = (combat: Combat): Unit[] => {
  const order = combat.status === 'active' ? turnOrder(combat.units) : combat.units;
  return order.filter((unit) => !unit.disabled);
};

const playerUnit = (
  unit: Unit,
  position: number,
  playerId: PlayerId,
  players: Combat['players'],
): PlayerUnit => {
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
    claimedByName: unit.claimedBy === null ? null : (players[unit.claimedBy] ?? null),
    mine: unit.claimedBy === playerId,
    hp: unit.hp,
    tempHp: unit.tempHp,
    maxHp: unit.maxHp,
    ac: unit.ac,
    pd: unit.pd,
    md: unit.md,
  };
  if (unit.role === 'enemy') return everyColumn;
  if (unit.claimedBy === playerId) {
    return {
      ...friendlyColumns,
      initiativeBonus: unit.initiativeBonus,
      note: unit.note,
      hpHistory: unit.hpHistory,
    };
  }
  return friendlyColumns;
};

export function project(combat: Combat, viewer: DmViewer): Combat;
export function project(combat: Combat, viewer: PlayerViewer): PlayerCombat;
export function project(combat: Combat, viewer: Viewer): Combat | PlayerCombat;
export function project(combat: Combat, viewer: Viewer): Combat | PlayerCombat {
  if (viewer.kind === 'dm') return combat;
  const visible = visibleUnits(combat);
  const activeVisible = visible.some((unit) => unit.id === combat.activeUnitId);
  return {
    id: combat.id,
    title: combat.title,
    description: combat.description,
    color: combat.color,
    status: combat.status,
    round: combat.round,
    escalation: combat.escalation,
    activeUnitId: activeVisible ? combat.activeUnitId : null,
    lastPlayedAt: combat.lastPlayedAt,
    version: combat.version,
    myName: combat.players[viewer.playerId] ?? null,
    createdAt: combat.createdAt,
    updatedAt: combat.updatedAt,
    units: visible.map((unit, index) =>
      playerUnit(unit, index + 1, viewer.playerId, combat.players),
    ),
  };
}
