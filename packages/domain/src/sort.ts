import { healthStatus } from './healthStatus.ts';
import type { Unit } from './types.ts';

export const skipsTurn = (unit: Unit): boolean =>
  unit.disabled || healthStatus(unit.hp, unit.maxHp, unit.role) === 'dead';

export const turnOrder = (units: readonly Unit[]): Unit[] =>
  units
    .map((unit, index) => ({ unit, index }))
    .sort((a, b) => {
      if (a.unit.initiative === null || b.unit.initiative === null) {
        if (a.unit.initiative !== null) return -1;
        if (b.unit.initiative !== null) return 1;
        return a.index - b.index;
      }
      return (
        b.unit.initiative - a.unit.initiative ||
        b.unit.initiativeBonus - a.unit.initiativeBonus ||
        a.index - b.index
      );
    })
    .map(({ unit }) => unit);
