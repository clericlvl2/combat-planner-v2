import type { Combat, Unit } from '../src/index.ts';

const ULID_PREFIX = '01ARZ3NDEKTSV4RRFFQ69G5';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const id = (n: number): string => {
  const a = ALPHABET[Math.floor(n / 1024) % 32];
  const b = ALPHABET[Math.floor(n / 32) % 32];
  const c = ALPHABET[n % 32];
  return `${ULID_PREFIX}${a}${b}${c}`;
};

export const NOW = '2026-10-16T12:00:00.000Z';
export const LATER = '2026-10-16T12:00:01.000Z';
export const DM = { kind: 'dm' } as const;
export const PLAYER_ID = id(900);
export const OTHER_PLAYER_ID = id(901);
export const PLAYER = { kind: 'player', playerId: PLAYER_ID } as const;
export const OTHER_PLAYER = { kind: 'player', playerId: OTHER_PLAYER_ID } as const;

export const makeUnit = (overrides: Partial<Unit> = {}): Unit => ({
  id: id(1),
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
  acMod: 0,
  pdMod: 0,
  mdMod: 0,
  note: '',
  conditions: [],
  disabled: false,
  claimedBy: null,
  hpHistory: [],
  ...overrides,
});

export const makeCombat = (overrides: Partial<Combat> = {}): Combat => ({
  id: id(500),
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
  units: [],
  players: {},
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});
