import { describe, expect, it } from 'vite-plus/test';
import { DM_STEPS, dmSettled, dmStep } from '../../src/tour/dmTour.ts';
import type { DmCombatState, DmListState } from '../../src/tour/dmTour.ts';
import type { TourProgress } from '../../src/tour/progress.ts';

const list = (patch: Partial<DmListState> = {}): DmListState => ({
  screen: 'list',
  loaded: true,
  calm: true,
  formOpen: false,
  combatIds: [],
  ...patch,
});

const combat = (patch: Partial<DmCombatState> = {}): DmCombatState => ({
  screen: 'combat',
  status: 'setup',
  units: 0,
  missingInitiative: false,
  adding: false,
  initiativeOpen: false,
  numpadOpen: false,
  menuOpen: false,
  shareOpen: false,
  otherOpen: false,
  ...patch,
});

const at = (stage: number, skipped: number[] = [], combatId?: string): TourProgress =>
  combatId === undefined ? { stage, skipped } : { stage, skipped, combatId };

describe('dmSettled', () => {
  it('starts a DM whose first list is empty', () => {
    expect(dmSettled('unset', list())).toEqual(at(1));
  });

  it('never starts for a DM who already has combats', () => {
    expect(dmSettled('unset', list({ combatIds: ['a'] }))).toBe('done');
  });

  it('waits for the list to load and ignores the combat screen while unset', () => {
    expect(dmSettled('unset', list({ loaded: false }))).toBe('unset');
    expect(dmSettled('unset', combat())).toBe('unset');
  });

  it('counts opening a combat as stage 2 done', () => {
    expect(dmSettled(at(2, [], 'c'), combat())).toEqual(at(3, [], 'c'));
  });

  it('moves on from adding units once the combat has one', () => {
    expect(dmSettled(at(3), combat({ units: 1, missingInitiative: true }))).toEqual(at(4));
    expect(dmSettled(at(3), combat({ units: 1, adding: true }))).toEqual(at(3));
  });

  it('skips initiative when every unit has it', () => {
    expect(dmSettled(at(4), combat({ units: 2 }))).toEqual(at(5, [4]));
    expect(dmSettled(at(3), combat({ units: 2 }))).toEqual(at(5, [4]));
    expect(dmSettled(at(4), combat({ units: 2, initiativeOpen: true }))).toEqual(at(4));
  });

  it('moves past start once the combat runs', () => {
    expect(dmSettled(at(5), combat({ status: 'active', units: 1 }))).toEqual(at(6));
    expect(
      dmSettled(at(4), combat({ status: 'active', units: 1, missingInitiative: true })),
    ).toEqual(at(6, [4]));
  });

  it('keeps event-driven stages', () => {
    for (const stage of [6, 7, 8]) {
      expect(dmSettled(at(stage), combat({ status: 'active', units: 1 }))).toEqual(at(stage));
    }
    expect(dmSettled('done', list())).toBe('done');
  });
});

describe('dmStep', () => {
  it('walks the new combat sheet', () => {
    expect(dmStep(at(1), list(), null)).toBe('create');
    expect(dmStep(at(1), list({ formOpen: true }), null)).toBe('title');
    expect(dmStep(at(1), list({ formOpen: true }), 'title')).toBe('confirm');
  });

  it('points at the created combat only while its card is listed', () => {
    expect(dmStep(at(2, [], 'c'), list({ combatIds: ['b', 'c'] }), null)).toBe('open');
    expect(dmStep(at(2, [], 'c'), list({ combatIds: ['b'] }), null)).toBeNull();
    expect(dmStep(at(2, [], 'c'), list({ combatIds: ['c'], formOpen: true }), null)).toBeNull();
  });

  it('shows nothing on the list while it is loading or busy', () => {
    expect(dmStep(at(1), list({ loaded: false }), null)).toBeNull();
    expect(dmStep(at(1), list({ calm: false }), null)).toBeNull();
    expect(dmStep(at(3), list(), null)).toBeNull();
  });

  it('walks adding a unit', () => {
    expect(dmStep(at(3), combat(), null)).toBe('addUnit');
    expect(dmStep(at(3), combat({ adding: true }), null)).toBe('unitName');
    expect(dmStep(at(3), combat({ adding: true }), 'unitName')).toBe('unitSave');
    expect(dmStep(at(3), combat({ menuOpen: true }), null)).toBeNull();
  });

  it('walks initiative', () => {
    expect(dmStep(at(4), combat({ units: 1, missingInitiative: true }), null)).toBe('initiative');
    expect(dmStep(at(4), combat({ units: 1, initiativeOpen: true }), null)).toBe('roll');
  });

  it('rings the turn bar to start and to pass the turn', () => {
    expect(dmStep(at(5), combat({ units: 1 }), null)).toBe('start');
    expect(dmStep(at(7), combat({ status: 'active', units: 1 }), null)).toBe('nextTurn');
    expect(DM_STEPS.start.target).toBe(DM_STEPS.nextTurn.target);
  });

  it('walks damage and healing in a running combat only', () => {
    const active = combat({ status: 'active', units: 1 });
    expect(dmStep(at(6), active, null)).toBe('hp');
    expect(dmStep(at(6), { ...active, numpadOpen: true }, null)).toBe('hpApply');
    expect(dmStep(at(6), combat({ units: 1 }), null)).toBeNull();
    expect(dmStep(at(6), { ...active, otherOpen: true }, null)).toBeNull();
  });

  it('walks sharing through the menu', () => {
    const active = combat({ status: 'active', units: 1 });
    expect(dmStep(at(8), active, null)).toBe('menu');
    expect(dmStep(at(8), { ...active, menuOpen: true }, null)).toBe('share');
    expect(dmStep(at(8), { ...active, shareOpen: true }, null)).toBe('link');
    expect(DM_STEPS.link.action).toBe('finish');
  });

  it('shows nothing before the tour starts or after it ends', () => {
    expect(dmStep('unset', list(), null)).toBeNull();
    expect(dmStep('done', combat(), null)).toBeNull();
  });
});
