import { describe, expect, it } from 'vite-plus/test';
import { PLAYER_KEY_PREFIX, playerKeysOf } from './playerId.ts';
import type { PlayerKeyStorage } from './playerId.ts';

const COMBAT_ID = '01JA00000000000000000000CB';
const OTHER_COMBAT_ID = '01JA00000000000000000000CC';
const CREDENTIALS = { playerId: '01JA00000000000000000000AB', playerKey: 'key-signature' };

const memoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  let reads = 0;
  const storage: PlayerKeyStorage = {
    getItem: (key) => {
      reads += 1;
      return values.get(key) ?? null;
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  return { storage, values, reads: () => reads };
};

describe('playerKeysOf', () => {
  it('has nothing for a combat the device has not joined and generates nothing', () => {
    const { storage, values } = memoryStorage();
    expect(playerKeysOf(storage).get(COMBAT_ID)).toBeNull();
    expect(values.size).toBe(0);
  });

  it('stores the issued id and key per combat and reads them on the next visit', () => {
    const { storage, values } = memoryStorage();
    playerKeysOf(storage).set(COMBAT_ID, CREDENTIALS);
    expect(JSON.parse(values.get(`${PLAYER_KEY_PREFIX}${COMBAT_ID}`) ?? '')).toEqual(CREDENTIALS);
    const reopened = playerKeysOf(memoryStorage(Object.fromEntries(values)).storage);
    expect(reopened.get(COMBAT_ID)).toEqual(CREDENTIALS);
    expect(reopened.get(OTHER_COMBAT_ID)).toBeNull();
  });

  it.each(['', 'not json', '{"playerId":"not-a-ulid","playerKey":"k"}', '{"playerId":null}'])(
    'ignores the corrupted value %j',
    (corrupted) => {
      const { storage } = memoryStorage({ [`${PLAYER_KEY_PREFIX}${COMBAT_ID}`]: corrupted });
      expect(playerKeysOf(storage).get(COMBAT_ID)).toBeNull();
    },
  );

  it('keeps the credentials for the page when the storage refuses access', () => {
    const storage: PlayerKeyStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    const keys = playerKeysOf(storage);
    expect(keys.get(COMBAT_ID)).toBeNull();
    keys.set(COMBAT_ID, CREDENTIALS);
    expect(keys.get(COMBAT_ID)).toEqual(CREDENTIALS);
  });

  it('reads the storage once per combat', () => {
    const { storage, reads } = memoryStorage({
      [`${PLAYER_KEY_PREFIX}${COMBAT_ID}`]: JSON.stringify(CREDENTIALS),
    });
    const keys = playerKeysOf(storage);
    expect(keys.get(COMBAT_ID)).toEqual(CREDENTIALS);
    expect(keys.get(COMBAT_ID)).toEqual(CREDENTIALS);
    expect(reads()).toBe(1);
  });
});
