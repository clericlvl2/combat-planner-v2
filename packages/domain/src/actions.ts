import { z } from 'zod';
import {
  amountSchema,
  conditionSchema,
  defenseSchema,
  displayNameSchema,
  escalationSchema,
  initiativeBonusSchema,
  initiativeSchema,
  maxHpSchema,
  noteSchema,
  roleSchema,
  rollSchema,
  roundSchema,
  tempHpSchema,
  ulidSchema,
  unitNameSchema,
} from './schemas.ts';

const base = {
  id: ulidSchema,
  version: z.number().int().nonnegative(),
};

const unitTarget = { ...base, unitId: ulidSchema };

export const unitFormSchema = z.object({
  name: unitNameSchema,
  role: roleSchema,
  maxHp: maxHpSchema,
  ac: defenseSchema,
  pd: defenseSchema,
  md: defenseSchema,
  initiativeBonus: initiativeBonusSchema,
  tempHp: tempHpSchema,
  note: noteSchema,
});

export const startActionSchema = z.object({
  ...base,
  type: z.literal('start'),
  rolls: z.record(ulidSchema, rollSchema),
});
export const nextTurnActionSchema = z.object({ ...base, type: z.literal('nextTurn') });
export const editRoundActionSchema = z.object({
  ...base,
  type: z.literal('editRound'),
  round: roundSchema,
});
export const setEscalationActionSchema = z.object({
  ...base,
  type: z.literal('setEscalation'),
  escalation: escalationSchema,
});
export const restartActionSchema = z.object({ ...base, type: z.literal('restart') });
export const clearActionSchema = z.object({ ...base, type: z.literal('clear') });
export const undoActionSchema = z.object({ ...base, type: z.literal('undo') });
export const addUnitActionSchema = z.object({
  ...base,
  ...unitFormSchema.shape,
  type: z.literal('addUnit'),
  unitId: ulidSchema,
  roll: rollSchema,
});
export const editUnitActionSchema = z.object({
  ...unitTarget,
  ...unitFormSchema.shape,
  type: z.literal('editUnit'),
});
export const duplicateUnitActionSchema = z.object({
  ...unitTarget,
  type: z.literal('duplicateUnit'),
  newUnitId: ulidSchema,
});
export const removeUnitActionSchema = z.object({ ...unitTarget, type: z.literal('removeUnit') });
export const setDisabledActionSchema = z.object({
  ...unitTarget,
  type: z.literal('setDisabled'),
  disabled: z.boolean(),
});
export const setInitiativeActionSchema = z.object({
  ...unitTarget,
  type: z.literal('setInitiative'),
  initiative: initiativeSchema,
});
export const rollInitiativeActionSchema = z.object({
  ...unitTarget,
  type: z.literal('rollInitiative'),
  roll: rollSchema,
});
export const damageActionSchema = z.object({
  ...unitTarget,
  type: z.literal('damage'),
  amount: amountSchema.min(1),
});
export const healActionSchema = z.object({
  ...unitTarget,
  type: z.literal('heal'),
  amount: amountSchema.min(1),
});
export const setTempHpActionSchema = z.object({
  ...unitTarget,
  type: z.literal('setTempHp'),
  amount: tempHpSchema,
});
export const setMaxHpActionSchema = z.object({
  ...unitTarget,
  type: z.literal('setMaxHp'),
  amount: maxHpSchema,
});
export const toggleConditionActionSchema = z.object({
  ...unitTarget,
  type: z.literal('toggleCondition'),
  condition: conditionSchema,
});
export const editNoteActionSchema = z.object({
  ...unitTarget,
  type: z.literal('editNote'),
  note: noteSchema,
});
export const claimUnitActionSchema = z.object({
  ...unitTarget,
  type: z.literal('claimUnit'),
  displayName: displayNameSchema,
});
export const releaseUnitActionSchema = z.object({ ...unitTarget, type: z.literal('releaseUnit') });

export const actionSchema = z.discriminatedUnion('type', [
  startActionSchema,
  nextTurnActionSchema,
  editRoundActionSchema,
  setEscalationActionSchema,
  restartActionSchema,
  clearActionSchema,
  undoActionSchema,
  addUnitActionSchema,
  editUnitActionSchema,
  duplicateUnitActionSchema,
  removeUnitActionSchema,
  setDisabledActionSchema,
  setInitiativeActionSchema,
  rollInitiativeActionSchema,
  damageActionSchema,
  healActionSchema,
  setTempHpActionSchema,
  setMaxHpActionSchema,
  toggleConditionActionSchema,
  editNoteActionSchema,
  claimUnitActionSchema,
  releaseUnitActionSchema,
]);

export type UnitForm = z.infer<typeof unitFormSchema>;
export type Action = z.infer<typeof actionSchema>;
export type ActionType = Action['type'];
export type ActionOf<T extends ActionType> = Extract<Action, { type: T }>;
export type StartAction = ActionOf<'start'>;
export type NextTurnAction = ActionOf<'nextTurn'>;
export type EditRoundAction = ActionOf<'editRound'>;
export type SetEscalationAction = ActionOf<'setEscalation'>;
export type RestartAction = ActionOf<'restart'>;
export type ClearAction = ActionOf<'clear'>;
export type UndoAction = ActionOf<'undo'>;
export type AddUnitAction = ActionOf<'addUnit'>;
export type EditUnitAction = ActionOf<'editUnit'>;
export type DuplicateUnitAction = ActionOf<'duplicateUnit'>;
export type RemoveUnitAction = ActionOf<'removeUnit'>;
export type SetDisabledAction = ActionOf<'setDisabled'>;
export type SetInitiativeAction = ActionOf<'setInitiative'>;
export type RollInitiativeAction = ActionOf<'rollInitiative'>;
export type DamageAction = ActionOf<'damage'>;
export type HealAction = ActionOf<'heal'>;
export type SetTempHpAction = ActionOf<'setTempHp'>;
export type SetMaxHpAction = ActionOf<'setMaxHp'>;
export type ToggleConditionAction = ActionOf<'toggleCondition'>;
export type EditNoteAction = ActionOf<'editNote'>;
export type ClaimUnitAction = ActionOf<'claimUnit'>;
export type ReleaseUnitAction = ActionOf<'releaseUnit'>;

export const ACTION_TYPES = actionSchema.options.map((option) => option.shape.type.value);
