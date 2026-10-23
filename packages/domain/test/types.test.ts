import { describe, expect, it } from 'vite-plus/test';
import {
  COMBAT_STATUSES,
  CONDITIONS,
  HEALTH_STATUSES,
  HP_HISTORY_KINDS,
  ROLES,
} from '../src/index.ts';
import type { Combat, PlayerCombat, Unit, Viewer } from '../src/index.ts';

describe('types', () => {
  it('lists the 11 conditions in vision order', () => {
    expect(CONDITIONS).toEqual([
      'charmed',
      'confused',
      'dazed',
      'fear',
      'helpless',
      'hampered',
      'shocked',
      'stuck',
      'stunned',
      'vulnerable',
      'weakened',
    ]);
  });

  it('lists the roles, combat statuses, health statuses and history kinds', () => {
    expect(ROLES).toEqual(['hero', 'enemy', 'ally']);
    expect(COMBAT_STATUSES).toEqual(['setup', 'active']);
    expect(HEALTH_STATUSES).toEqual(['full', 'wounded', 'staggered', 'dead']);
    expect(HP_HISTORY_KINDS).toEqual(['damage', 'heal', 'temp', 'max']);
  });

  it('types a combat, a unit, a player projection and a viewer', () => {
    const unit: Unit = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      name: 'Goblin',
      role: 'enemy',
      initiativeBonus: 0,
      initiative: null,
      maxHp: 10,
      hp: 10,
      tempHp: 0,
      ac: 10,
      pd: 10,
      md: 10,
      note: '',
      conditions: [],
      disabled: false,
      claimedBy: null,
      hpHistory: [],
    };
    const combat: Combat = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      title: 'Ambush',
      description: '',
      color: 0,
      status: 'setup',
      round: 1,
      escalation: 0,
      activeUnitId: null,
      lastPlayedAt: null,
      linkGeneration: 0,
      version: 0,
      units: [unit],
      players: {},
      createdAt: '2026-10-16T00:00:00.000Z',
      updatedAt: '2026-10-16T00:00:00.000Z',
    };
    const {
      linkGeneration: _linkGeneration,
      players: _players,
      units: _units,
      ...playerFields
    } = combat;
    const projection: PlayerCombat = {
      ...playerFields,
      myName: null,
      units: [
        {
          id: unit.id,
          name: unit.name,
          role: unit.role,
          healthStatus: 'full',
          healthSegments: 4,
          conditions: [],
          position: 1,
          initiative: null,
        },
      ],
    };
    const viewer: Viewer = { kind: 'player', playerId: '01ARZ3NDEKTSV4RRFFQ69G5FAX' };
    expect(combat.units[0]?.id).toBe(projection.units[0]?.id);
    expect(viewer.kind).toBe('player');
  });
});
