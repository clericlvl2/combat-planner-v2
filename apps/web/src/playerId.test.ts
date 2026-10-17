import { ulidSchema } from '@combat-planner/domain';
import { describe, expect, it } from 'vite-plus/test';
import { PLAYER_ID_KEY, loadPlayerId, playerIdOf } from './playerId.ts';
import type { PlayerIdStorage } from './playerId.ts';

const STORED_ID = '01JA00000000000000000000AB';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  const storage: PlayerIdStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  return { storage, values };
};

describe('loadPlayerId', () => {
  it('generates a ULID on the first visit and stores it', () => {
    const { storage, values } = memoryStorage();
    const playerId = loadPlayerId(storage);
    expect(ulidSchema.safeParse(playerId).success).toBe(true);
    expect(values.get(PLAYER_ID_KEY)).toBe(playerId);
  });

  it('reuses the stored id on the next visit', () => {
    const { storage, values } = memoryStorage({ [PLAYER_ID_KEY]: STORED_ID });
    expect(loadPlayerId(storage, () => 'unused')).toBe(STORED_ID);
    expect(values.get(PLAYER_ID_KEY)).toBe(STORED_ID);
    const first = loadPlayerId(memoryStorage().storage);
    const reopened = memoryStorage({ [PLAYER_ID_KEY]: first });
    expect(loadPlayerId(reopened.storage)).toBe(first);
  });

  it.each(['', 'not-a-ulid', '01ja00000000000000000000ab', `${STORED_ID}X`])(
    'replaces the corrupted value %j',
    (corrupted) => {
      const { storage, values } = memoryStorage({ [PLAYER_ID_KEY]: corrupted });
      expect(loadPlayerId(storage, () => STORED_ID)).toBe(STORED_ID);
      expect(values.get(PLAYER_ID_KEY)).toBe(STORED_ID);
    },
  );

  it('returns a fresh id when the storage refuses access', () => {
    const storage: PlayerIdStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(loadPlayerId(storage, () => STORED_ID)).toBe(STORED_ID);
  });
});

describe('playerIdOf', () => {
  it('reads the storage once and keeps the id for the page', () => {
    let reads = 0;
    const { storage } = memoryStorage({ [PLAYER_ID_KEY]: STORED_ID });
    const counted: PlayerIdStorage = {
      getItem: (key) => {
        reads += 1;
        return storage.getItem(key);
      },
      setItem: storage.setItem,
    };
    const playerId = playerIdOf(counted);
    expect(playerId()).toBe(STORED_ID);
    expect(playerId()).toBe(STORED_ID);
    expect(reads).toBe(1);
  });
});
