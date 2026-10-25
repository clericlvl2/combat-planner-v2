import { describe, expect, it } from 'vite-plus/test';
import { advanced, counterOf, skippedStage } from '../../src/tour/flow.ts';
import {
  TOUR_KEYS,
  memoryTourStorage,
  parseTourProgress,
  readTourProgress,
  resetTours,
  resetToursFromUrl,
  writeTourProgress,
} from '../../src/tour/progress.ts';
import type { TourStorage } from '../../src/tour/progress.ts';
import { createTourStore } from '../../src/tour/store.ts';

const brokenStorage: TourStorage = {
  getItem: () => {
    throw new Error('storage disabled');
  },
  setItem: () => {
    throw new Error('storage disabled');
  },
  removeItem: () => {
    throw new Error('storage disabled');
  },
};

describe('tour progress storage', () => {
  it('reads a missing key as unset', () => {
    expect(readTourProgress(memoryTourStorage(), 'dm')).toBe('unset');
  });

  it('round-trips done and a stage with its created combat', () => {
    const storage = memoryTourStorage();
    writeTourProgress(storage, 'dm', { stage: 2, skipped: [], combatId: 'c1' });
    expect(storage.getItem(TOUR_KEYS.dm)).toBe('{"stage":2,"skipped":[],"combatId":"c1"}');
    expect(readTourProgress(storage, 'dm')).toEqual({ stage: 2, skipped: [], combatId: 'c1' });
    writeTourProgress(storage, 'dm', 'done');
    expect(readTourProgress(storage, 'dm')).toBe('done');
  });

  it('reads an unreadable value or a throwing storage as done', () => {
    expect(parseTourProgress('{')).toBe('done');
    expect(parseTourProgress('{"stage":0,"skipped":[]}')).toBe('done');
    expect(parseTourProgress('{"stage":2,"skipped":["x"]}')).toBe('done');
    expect(readTourProgress(brokenStorage, 'player')).toBe('done');
    expect(() => writeTourProgress(brokenStorage, 'player', 'done')).not.toThrow();
  });

  it('removes the key when written unset', () => {
    const storage = memoryTourStorage({ turn: 'done' });
    writeTourProgress(storage, 'turn', 'unset');
    expect(storage.getItem(TOUR_KEYS.turn)).toBeNull();
  });

  it('restarts the DM tour from the first stage and forgets the player tours on reset', () => {
    const storage = memoryTourStorage({ dm: 'done', player: 'done', turn: 'done' });
    resetTours(storage);
    expect(readTourProgress(storage, 'dm')).toEqual({ stage: 1, skipped: [] });
    expect(readTourProgress(storage, 'player')).toBe('unset');
    expect(readTourProgress(storage, 'turn')).toBe('unset');
  });

  it('resets from ?tour=reset and drops the parameter from the address', () => {
    const storage = memoryTourStorage({ dm: 'done' });
    const replaced: string[] = [];
    const history = {
      state: null,
      replaceState: (_: unknown, __: string, url?: string | URL | null) => {
        replaced.push(String(url));
      },
    };
    resetToursFromUrl(storage, { href: 'https://x.test/combats?tour=reset&a=1#top' }, history);
    expect(readTourProgress(storage, 'dm')).toEqual({ stage: 1, skipped: [] });
    expect(replaced).toEqual(['/combats?a=1#top']);
  });

  it('leaves storage alone without the parameter', () => {
    const storage = memoryTourStorage({ dm: 'done' });
    const history = {
      state: null,
      replaceState: () => {
        throw new Error('unexpected');
      },
    };
    resetToursFromUrl(storage, { href: 'https://x.test/combats' }, history);
    expect(readTourProgress(storage, 'dm')).toBe('done');
  });

  it('answers done without storage and notifies subscribers on write', () => {
    expect(createTourStore(null).get('dm')).toBe('done');
    const store = createTourStore(memoryTourStorage());
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.set('player', { stage: 3, skipped: [] });
    expect(store.get('player')).toEqual({ stage: 3, skipped: [] });
    expect(calls).toBe(1);
  });
});

describe('tour stages', () => {
  it('advances only from the current stage and ends after the last', () => {
    expect(advanced({ stage: 2, skipped: [] }, 2, 8)).toEqual({ stage: 3, skipped: [] });
    expect(advanced({ stage: 2, skipped: [] }, 5, 8)).toEqual({ stage: 2, skipped: [] });
    expect(advanced({ stage: 8, skipped: [] }, 8, 8)).toBe('done');
    expect(advanced('done', 1, 8)).toBe('done');
  });

  it('records a skipped stage', () => {
    expect(skippedStage({ stage: 4, skipped: [] }, 4, 8)).toEqual({ stage: 5, skipped: [4] });
  });

  it('counts only reachable stages', () => {
    expect(counterOf({ stage: 1, skipped: [] }, 8)).toEqual({ current: 1, total: 8 });
    expect(counterOf({ stage: 5, skipped: [4] }, 8)).toEqual({ current: 4, total: 7 });
    expect(counterOf({ stage: 2, skipped: [1] }, 6)).toEqual({ current: 1, total: 5 });
    expect(counterOf({ stage: 2, skipped: [1] }, 6, [3])).toEqual({ current: 1, total: 4 });
    expect(counterOf({ stage: 4, skipped: [1, 3] }, 6)).toEqual({ current: 2, total: 4 });
    expect(counterOf('done', 6)).toBeNull();
  });
});
