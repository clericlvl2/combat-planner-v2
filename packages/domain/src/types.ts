export type Ulid = string;
export type CombatId = Ulid;
export type UnitId = Ulid;
export type PlayerId = Ulid;
export type PresetId = Ulid;
export type TagId = Ulid;
export type ActionId = Ulid;
export type DisplayName = string;

export const COMBAT_STATUSES = ['setup', 'active'] as const;
export type CombatStatus = (typeof COMBAT_STATUSES)[number];

export const ROLES = ['hero', 'enemy', 'ally'] as const;
export type Role = (typeof ROLES)[number];

export const CONDITIONS = [
  'charmed',
  'confused',
  'dazed',
  'fear',
  'helpless',
  'hindered',
  'shocked',
  'staggered',
  'stuck',
  'stunned',
  'vulnerable',
  'weakened',
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const HEALTH_STATUSES = ['full', 'wounded', 'bloodied', 'dead'] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const HP_HISTORY_KINDS = ['damage', 'heal', 'temp', 'max'] as const;
export type HpHistoryKind = (typeof HP_HISTORY_KINDS)[number];

export type Viewer = { kind: 'dm' } | { kind: 'player'; playerId: PlayerId };

export interface HpHistoryEntry {
  kind: HpHistoryKind;
  amount: number;
  absorbed: number;
  previous: number | null;
  result: number;
  round: number | null;
  at: string;
}

export interface Unit {
  id: UnitId;
  name: string;
  role: Role;
  initiativeBonus: number;
  initiative: number | null;
  maxHp: number;
  hp: number;
  tempHp: number;
  ac: number;
  pd: number;
  md: number;
  note: string;
  conditions: Condition[];
  disabled: boolean;
  claimedBy: PlayerId | null;
  hpHistory: HpHistoryEntry[];
}

export interface Combat {
  id: CombatId;
  title: string;
  description: string;
  color: number;
  status: CombatStatus;
  round: number;
  escalation: number;
  activeUnitId: UnitId | null;
  lastPlayedAt: string | null;
  linkGeneration: number;
  version: number;
  units: Unit[];
  players: Record<PlayerId, DisplayName>;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: TagId;
  name: string;
}

export interface Preset {
  id: PresetId;
  name: string;
  role: Role;
  maxHp: number;
  ac: number;
  pd: number;
  md: number;
  initiativeBonus: number;
  tags: TagId[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayerUnit {
  id: UnitId;
  name: string;
  role: Role;
  healthStatus: HealthStatus;
  conditions: Condition[];
  initiative: number | null;
  claimedBy?: PlayerId | null;
  hp?: number;
  tempHp?: number;
  maxHp?: number;
  ac?: number;
  pd?: number;
  md?: number;
  note?: string;
  hpHistory?: HpHistoryEntry[];
}

export interface PlayerCombat {
  id: CombatId;
  title: string;
  description: string;
  color: number;
  status: CombatStatus;
  round: number;
  escalation: number;
  activeUnitId: UnitId | null;
  lastPlayedAt: string | null;
  linkGeneration: number;
  version: number;
  units: PlayerUnit[];
  players: Record<PlayerId, DisplayName>;
  createdAt: string;
  updatedAt: string;
}
