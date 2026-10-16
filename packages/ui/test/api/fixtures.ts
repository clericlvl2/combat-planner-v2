import type { Combat, Unit } from '@combat-planner/domain';

export const NOW = '2026-10-16T12:00:00.000Z';
export const COMBAT_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
export const PLAYER_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
export const OTHER_PLAYER_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAX';
export const HERO_ID = '01ARZ3NDEKTSV4RRFFQ69G5FB0';
export const ENEMY_ID = '01ARZ3NDEKTSV4RRFFQ69G5FB1';
export const HIDDEN_ID = '01ARZ3NDEKTSV4RRFFQ69G5FB2';
export const ACTION_ID = '01ARZ3NDEKTSV4RRFFQ69G5FC0';
export const TOKEN = `${COMBAT_ID}.0.fake`;

export const unit = (overrides: Partial<Unit> & Pick<Unit, 'id' | 'name' | 'role'>): Unit => ({
  initiativeBonus: 2,
  initiative: null,
  maxHp: 30,
  hp: 30,
  tempHp: 0,
  ac: 15,
  pd: 12,
  md: 11,
  note: '',
  conditions: [],
  disabled: false,
  claimedBy: null,
  hpHistory: [],
  ...overrides,
});

export const combat = (overrides: Partial<Combat> = {}): Combat => ({
  id: COMBAT_ID,
  title: 'Засада гоблинов',
  description: '',
  color: 3,
  status: 'setup',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version: 1,
  players: { [PLAYER_ID]: 'Aria' },
  createdAt: NOW,
  updatedAt: NOW,
  units: [
    unit({
      id: HERO_ID,
      name: 'Aria',
      role: 'hero',
      claimedBy: PLAYER_ID,
      note: 'hero private note',
    }),
    unit({ id: ENEMY_ID, name: 'Goblin boss', role: 'enemy', note: 'enemy secret plan' }),
    unit({ id: HIDDEN_ID, name: 'Hidden ogre', role: 'enemy', disabled: true }),
  ],
  ...overrides,
});
