import { z } from 'zod';
import { COMBAT_STATUSES, CONDITIONS, HEALTH_STATUSES, HP_HISTORY_KINDS, ROLES } from './types.ts';

export const LIMITS = {
  combatsPerDm: 100,
  unitsPerCombat: 99,
  presetsPerDm: 1000,
  unitName: 40,
  combatTitle: 80,
  combatDescription: 500,
  note: 250,
  tagName: 24,
  displayName: 40,
  maxHp: { min: 1, max: 999 },
  hp: { min: -999, max: 999 },
  tempHp: { min: 0, max: 999 },
  defense: { min: 0, max: 99 },
  initiativeBonus: { min: -99, max: 99 },
  initiative: { min: -9, max: 99 },
  round: { min: 1, max: 99 },
  escalation: { min: 0, max: 6 },
  color: { min: 0, max: 7 },
  roll: { min: 1, max: 20 },
  amount: { min: 0, max: 999 },
  undoDepth: 10,
} as const;

export interface IntRange {
  readonly min: number;
  readonly max: number;
}

export const intRange = (range: IntRange) => z.number().int().min(range.min).max(range.max);

const unique = <T>(items: T[]) => new Set(items).size === items.length;

export const ulidSchema = z.string().regex(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
export const isoDateSchema = z.iso.datetime();
export const unitNameSchema = z.string().min(1).max(LIMITS.unitName);
export const combatTitleSchema = z.string().min(1).max(LIMITS.combatTitle);
export const combatDescriptionSchema = z.string().max(LIMITS.combatDescription);
export const noteSchema = z.string().max(LIMITS.note);
export const tagNameSchema = z.string().min(1).max(LIMITS.tagName);
export const displayNameSchema = z.string().min(1).max(LIMITS.displayName);
export const maxHpSchema = intRange(LIMITS.maxHp);
export const hpSchema = intRange(LIMITS.hp);
export const tempHpSchema = intRange(LIMITS.tempHp);
export const defenseSchema = intRange(LIMITS.defense);
export const initiativeBonusSchema = intRange(LIMITS.initiativeBonus);
export const initiativeSchema = intRange(LIMITS.initiative);
export const roundSchema = intRange(LIMITS.round);
export const escalationSchema = intRange(LIMITS.escalation);
export const colorSchema = intRange(LIMITS.color);
export const rollSchema = intRange(LIMITS.roll);
export const amountSchema = intRange(LIMITS.amount);

export const combatStatusSchema = z.enum(COMBAT_STATUSES);
export const roleSchema = z.enum(ROLES);
export const conditionSchema = z.enum(CONDITIONS);
export const healthStatusSchema = z.enum(HEALTH_STATUSES);
export const hpHistoryKindSchema = z.enum(HP_HISTORY_KINDS);
export const conditionsSchema = z.array(conditionSchema).max(CONDITIONS.length).refine(unique);

export const viewerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('dm') }),
  z.object({ kind: z.literal('player'), playerId: ulidSchema }),
]);

export const hpHistoryEntrySchema = z.object({
  kind: hpHistoryKindSchema,
  amount: amountSchema,
  absorbed: amountSchema,
  previous: z.number().int().nullable(),
  result: hpSchema,
  round: roundSchema.nullable(),
  at: isoDateSchema,
});

export const unitSchema = z
  .object({
    id: ulidSchema,
    name: unitNameSchema,
    role: roleSchema,
    initiativeBonus: initiativeBonusSchema,
    initiative: initiativeSchema.nullable(),
    maxHp: maxHpSchema,
    hp: hpSchema,
    tempHp: tempHpSchema,
    ac: defenseSchema,
    pd: defenseSchema,
    md: defenseSchema,
    note: noteSchema,
    conditions: conditionsSchema,
    disabled: z.boolean(),
    claimedBy: ulidSchema.nullable(),
    hpHistory: z.array(hpHistoryEntrySchema),
  })
  .refine((unit) => unit.hp >= -unit.maxHp);

export const playersSchema = z.record(ulidSchema, displayNameSchema);

const combatFields = {
  id: ulidSchema,
  title: combatTitleSchema,
  description: combatDescriptionSchema,
  color: colorSchema,
  status: combatStatusSchema,
  round: roundSchema,
  escalation: escalationSchema,
  activeUnitId: ulidSchema.nullable(),
  lastPlayedAt: isoDateSchema.nullable(),
  linkGeneration: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
  players: playersSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
};

export const combatSchema = z
  .object({ ...combatFields, units: z.array(unitSchema).max(LIMITS.unitsPerCombat) })
  .refine((combat) => unique(combat.units.map((unit) => unit.id)))
  .refine(
    (combat) =>
      combat.activeUnitId === null || combat.units.some((unit) => unit.id === combat.activeUnitId),
  );

export const tagSchema = z.object({
  id: ulidSchema,
  name: tagNameSchema,
});

export const presetSchema = z.object({
  id: ulidSchema,
  name: unitNameSchema,
  role: roleSchema,
  maxHp: maxHpSchema,
  ac: defenseSchema,
  pd: defenseSchema,
  md: defenseSchema,
  initiativeBonus: initiativeBonusSchema,
  tags: z.array(ulidSchema).refine(unique),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const playerUnitSchema = z.object({
  id: ulidSchema,
  name: unitNameSchema,
  role: roleSchema,
  healthStatus: healthStatusSchema,
  conditions: conditionsSchema,
  initiative: initiativeSchema.nullable(),
  claimedBy: ulidSchema.nullable().optional(),
  hp: hpSchema.optional(),
  tempHp: tempHpSchema.optional(),
  maxHp: maxHpSchema.optional(),
  ac: defenseSchema.optional(),
  pd: defenseSchema.optional(),
  md: defenseSchema.optional(),
  note: noteSchema.optional(),
  hpHistory: z.array(hpHistoryEntrySchema).optional(),
});

export const playerCombatSchema = z.object({
  ...combatFields,
  units: z.array(playerUnitSchema).max(LIMITS.unitsPerCombat),
});
