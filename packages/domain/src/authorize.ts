import type { Action } from './actions.ts';
import { DomainError } from './errors.ts';
import type { Combat, Unit, UnitId, Viewer } from './types.ts';

export const PLAYER_ACTION_TYPES = [
  'editUnit',
  'setInitiative',
  'rollInitiative',
  'damage',
  'heal',
  'setTempHp',
  'toggleCondition',
  'editNote',
  'claimUnit',
  'releaseUnit',
] as const satisfies readonly Action['type'][];

export type PlayerActionType = (typeof PLAYER_ACTION_TYPES)[number];

const playerActionTypes: ReadonlySet<Action['type']> = new Set(PLAYER_ACTION_TYPES);

export const isPlayerAction = (
  action: Action,
): action is Extract<Action, { type: PlayerActionType }> => playerActionTypes.has(action.type);

const forbidden = (message: string) => new DomainError('forbidden', message);

const findUnit = (combat: Combat, unitId: UnitId): Unit | DomainError =>
  combat.units.find((unit) => unit.id === unitId) ??
  new DomainError('notFound', `Unit ${unitId} is not in this combat`);

const authorizeClaim = (combat: Combat, unitId: UnitId): true | DomainError => {
  const unit = findUnit(combat, unitId);
  if (unit instanceof DomainError) return unit;
  if (unit.role !== 'hero') return forbidden('Only a hero can be claimed');
  if (unit.claimedBy !== null) return forbidden('This hero is already claimed');
  return true;
};

const authorizePlayer = (combat: Combat, action: Action, playerId: string): true | DomainError => {
  if (!isPlayerAction(action)) return forbidden(`A player does not send ${action.type}`);
  if (action.type === 'claimUnit') return authorizeClaim(combat, action.unitId);
  const unit = findUnit(combat, action.unitId);
  if (unit instanceof DomainError) return unit;
  if (unit.claimedBy !== playerId) return forbidden('A player acts only on their own heroes');
  if (action.type === 'editUnit' && action.role !== 'hero') {
    return forbidden('A player keeps the type Hero');
  }
  if (action.type === 'editUnit' && action.maxHp !== unit.maxHp) {
    return forbidden('A player does not set max HP');
  }
  return true;
};

export const authorize = (combat: Combat, action: Action, viewer: Viewer): true | DomainError => {
  if (viewer.kind === 'player') return authorizePlayer(combat, action, viewer.playerId);
  if (action.type === 'claimUnit') return forbidden('Only a player claims a hero');
  return true;
};
