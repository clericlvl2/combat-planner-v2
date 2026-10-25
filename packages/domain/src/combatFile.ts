import { z } from 'zod';
import {
  colorSchema,
  combatDescriptionSchema,
  combatStatusSchema,
  combatTitleSchema,
  conditionsSchema,
  defenseSchema,
  escalationSchema,
  hpSchema,
  initiativeBonusSchema,
  initiativeSchema,
  maxHpSchema,
  noteSchema,
  roleSchema,
  roundSchema,
  tempHpSchema,
  ulidSchema,
  unitNameSchema,
} from './schemas.ts';
import { restartedCombat } from './reduce.ts';
import type { Combat, CombatId, UnitId } from './types.ts';

export const COMBAT_FILE_FORMAT = 'combat-planner/combat';
export const COMBAT_FILE_VERSION = 1;

const unique = <T>(items: T[]) => new Set(items).size === items.length;

export const combatFileUnitSchema = z
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
  })
  .refine((unit) => unit.hp >= -unit.maxHp);

export const combatFileSchema = z.object({
  format: z.literal(COMBAT_FILE_FORMAT),
  version: z.literal(COMBAT_FILE_VERSION),
  combat: z
    .object({
      title: combatTitleSchema,
      description: combatDescriptionSchema,
      color: colorSchema,
      status: combatStatusSchema,
      round: roundSchema,
      escalation: escalationSchema,
      activeUnitId: ulidSchema.nullable(),
      units: z.array(combatFileUnitSchema),
    })
    .refine((combat) => unique(combat.units.map((unit) => unit.id)))
    .refine(
      (combat) =>
        combat.activeUnitId === null ||
        combat.units.some((unit) => unit.id === combat.activeUnitId),
    ),
});

export type CombatFile = z.infer<typeof combatFileSchema>;
export type CombatFileUnit = z.infer<typeof combatFileUnitSchema>;

export const toCombatFile = (source: Combat): CombatFile => {
  const combat = restartedCombat(source);
  return {
    format: COMBAT_FILE_FORMAT,
    version: COMBAT_FILE_VERSION,
    combat: {
      title: combat.title,
      description: combat.description,
      color: combat.color,
      status: combat.status,
      round: combat.round,
      escalation: combat.escalation,
      activeUnitId: combat.activeUnitId,
      units: combat.units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        role: unit.role,
        initiativeBonus: unit.initiativeBonus,
        initiative: unit.initiative,
        maxHp: unit.maxHp,
        hp: unit.hp,
        tempHp: unit.tempHp,
        ac: unit.ac,
        pd: unit.pd,
        md: unit.md,
        note: unit.note,
        conditions: [...unit.conditions],
        disabled: unit.disabled,
      })),
    },
  };
};

export interface CombatFileIds {
  combatId: CombatId;
  unitId: () => UnitId;
}

export const fromCombatFile = (file: CombatFile, ids: CombatFileIds, now: string): Combat => {
  const unitIds = new Map(file.combat.units.map((unit) => [unit.id, ids.unitId()]));
  const remap = (unitId: UnitId): UnitId => unitIds.get(unitId) ?? unitId;
  const { activeUnitId, units, ...fields } = file.combat;
  return {
    ...fields,
    id: ids.combatId,
    activeUnitId: activeUnitId === null ? null : remap(activeUnitId),
    lastPlayedAt: null,
    linkGeneration: 0,
    version: 1,
    players: {},
    createdAt: now,
    updatedAt: now,
    units: units.map((unit) => ({
      ...unit,
      id: remap(unit.id),
      acMod: 0,
      pdMod: 0,
      mdMod: 0,
      claimedBy: null,
      hpHistory: [],
    })),
  };
};
