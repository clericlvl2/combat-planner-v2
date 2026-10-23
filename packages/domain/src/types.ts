import type { z } from 'zod';
import type {
  combatSchema,
  hpHistoryEntrySchema,
  playerCombatSchema,
  playerUnitSchema,
  presetSchema,
  tagSchema,
  unitSchema,
  viewerSchema,
} from './schemas.ts';

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
  'hampered',
  'shocked',
  'stuck',
  'stunned',
  'vulnerable',
  'weakened',
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const HEALTH_STATUSES = ['full', 'wounded', 'staggered', 'unconscious', 'dead'] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const HP_HISTORY_KINDS = ['damage', 'heal', 'temp', 'max'] as const;
export type HpHistoryKind = (typeof HP_HISTORY_KINDS)[number];

export type Viewer = z.infer<typeof viewerSchema>;
export type HpHistoryEntry = z.infer<typeof hpHistoryEntrySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type Combat = z.infer<typeof combatSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type PlayerUnit = z.infer<typeof playerUnitSchema>;
export type PlayerCombat = z.infer<typeof playerCombatSchema>;
