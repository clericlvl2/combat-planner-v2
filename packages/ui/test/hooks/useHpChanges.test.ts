import type { HealthStatus } from '@combat-planner/domain';
import { describe, expect, it } from 'vite-plus/test';
import { initialHpState, nextHpState } from '../../src/hooks/useHpChanges.ts';
import type { HpChangeSource } from '../../src/hooks/useHpChanges.ts';

const HERO = '01ARZ3NDEKTSV4RRFFQ69G5HR1';
const ENEMY = '01ARZ3NDEKTSV4RRFFQ69G5EN1';

const hero = (hp: number, tempHp = 0, healthStatus: HealthStatus = 'wounded'): HpChangeSource => ({
  id: HERO,
  hp,
  tempHp,
  healthStatus,
});

const enemy = (healthStatus: HealthStatus): HpChangeSource => ({ id: ENEMY, healthStatus });

describe('useHpChanges state', () => {
  it('reports nothing for the first units', () => {
    expect(initialHpState([hero(20)]).latest.size).toBe(0);
  });

  it('reports damage as the loss of HP and temp HP together', () => {
    const state = nextHpState(initialHpState([hero(20, 2)]), [hero(19, 0)]);
    expect(state.latest.get(HERO)).toEqual({ key: 1, unitId: HERO, kind: 'damage', amount: 3 });
  });

  it('reports a heal and new temp HP', () => {
    const healed = nextHpState(initialHpState([hero(20)]), [hero(30)]);
    expect(healed.latest.get(HERO)).toMatchObject({ kind: 'heal', amount: 10 });
    const temp = nextHpState(healed, [hero(30, 5)]);
    expect(temp.latest.get(HERO)).toEqual({ key: 2, unitId: HERO, kind: 'temp', amount: 5 });
  });

  it('reports a heal of an unconscious hero as the HP gained from 0', () => {
    const state = nextHpState(initialHpState([hero(-4, 0, 'unconscious')]), [
      hero(5, 0, 'staggered'),
    ]);
    expect(state.latest.get(HERO)).toMatchObject({ kind: 'heal', amount: 5 });
  });

  it('reports a heal of a dead unit as the whole rise', () => {
    const state = nextHpState(initialHpState([hero(-4, 0, 'dead')]), [hero(2, 0, 'staggered')]);
    expect(state.latest.get(HERO)).toMatchObject({ kind: 'heal', amount: 6 });
  });

  it('fires once for an optimistic change followed by the same server values', () => {
    const optimistic = nextHpState(initialHpState([hero(20)]), [hero(17)]);
    expect(nextHpState(optimistic, [{ ...hero(17) }])).toBe(optimistic);
  });

  it('adds the ribbon status when the health status turns staggered, unconscious or dead', () => {
    const staggered = nextHpState(initialHpState([hero(20)]), [hero(15, 0, 'staggered')]);
    expect(staggered.latest.get(HERO)).toMatchObject({ kind: 'damage', status: 'staggered' });
    const healed = nextHpState(staggered, [hero(16, 0, 'staggered')]);
    expect(healed.latest.get(HERO)).not.toHaveProperty('status');
  });

  it('reports only the status for a unit without HP, such as an enemy seen by a player', () => {
    const state = nextHpState(initialHpState([enemy('wounded')]), [enemy('dead')]);
    expect(state.latest.get(ENEMY)).toEqual({ key: 1, unitId: ENEMY, status: 'dead' });
    expect(nextHpState(state, [enemy('staggered'), hero(20)]).latest.get(HERO)).toBeUndefined();
  });

  it('forgets a removed unit', () => {
    const damaged = nextHpState(initialHpState([hero(20)]), [hero(10)]);
    expect(nextHpState(damaged, []).latest.size).toBe(0);
  });
});
