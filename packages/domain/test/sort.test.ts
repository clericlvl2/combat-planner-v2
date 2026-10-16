import { describe, expect, it } from 'vite-plus/test';
import { skipsTurn, turnOrder } from '../src/index.ts';
import { id, makeUnit } from './fixtures.ts';

const names = (units: ReturnType<typeof makeUnit>[]) => units.map((unit) => unit.name);

describe('turnOrder', () => {
  it('Unit order: initiative high → low; ties by initiative bonus, then insertion order; units without initiative at the bottom.', () => {
    const units = [
      makeUnit({ id: id(1), name: 'none-first', initiative: null, initiativeBonus: 9 }),
      makeUnit({ id: id(2), name: 'low', initiative: 3 }),
      makeUnit({ id: id(3), name: 'tie-later', initiative: 15, initiativeBonus: 2 }),
      makeUnit({ id: id(4), name: 'tie-bonus', initiative: 15, initiativeBonus: 5 }),
      makeUnit({ id: id(5), name: 'high', initiative: 20 }),
      makeUnit({ id: id(6), name: 'tie-earlier-same-bonus', initiative: 15, initiativeBonus: 2 }),
      makeUnit({ id: id(7), name: 'none-second', initiative: null, initiativeBonus: 0 }),
    ];
    expect(names(turnOrder(units))).toEqual([
      'high',
      'tie-bonus',
      'tie-later',
      'tie-earlier-same-bonus',
      'low',
      'none-first',
      'none-second',
    ]);
  });

  it('keeps disabled and dead units in the order', () => {
    const units = [
      makeUnit({ id: id(1), name: 'dead', initiative: 18, hp: 0 }),
      makeUnit({ id: id(2), name: 'alive', initiative: 10 }),
      makeUnit({ id: id(3), name: 'disabled', initiative: 12, disabled: true }),
    ];
    expect(names(turnOrder(units))).toEqual(['dead', 'disabled', 'alive']);
  });

  it('does not mutate the input', () => {
    const units = [
      makeUnit({ id: id(1), name: 'a', initiative: 1 }),
      makeUnit({ id: id(2), name: 'b', initiative: 2 }),
    ];
    turnOrder(units);
    expect(names(units)).toEqual(['a', 'b']);
  });
});

describe('skipsTurn', () => {
  it('Disabled and dead units are skipped in turn order and can still be edited and damaged.', () => {
    expect(skipsTurn(makeUnit({ disabled: true }))).toBe(true);
    expect(skipsTurn(makeUnit({ hp: 0 }))).toBe(true);
    expect(skipsTurn(makeUnit({ hp: -3 }))).toBe(true);
    expect(skipsTurn(makeUnit({ hp: 1 }))).toBe(false);
  });
});
