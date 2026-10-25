import type { PlayerCombat, PlayerUnit } from '@combat-planner/domain';

export const TURN_VIBRATION_MS = 30;

export const ownsUnit = (unit: PlayerUnit): boolean => unit.role !== 'enemy' && unit.mine === true;

export const turnHeroOf = (combat: PlayerCombat): PlayerUnit | undefined =>
  combat.status === 'setup'
    ? undefined
    : combat.units.find((unit) => unit.id === combat.activeUnitId && ownsUnit(unit));

export function ownTurnStarted(previous: PlayerCombat, next: PlayerCombat): boolean {
  const hero = turnHeroOf(next);
  if (hero === undefined) return false;
  return hero.id !== turnHeroOf(previous)?.id || next.round !== previous.round;
}

export function vibrateOwnTurn(): void {
  if ('vibrate' in navigator) navigator.vibrate(TURN_VIBRATION_MS);
}
