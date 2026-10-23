import { playerCredentialsSchema } from '@combat-planner/api/client';
import type { PlayerCredentials, PlayerKeyStore } from '@combat-planner/api/client';
import type { CombatId } from '@combat-planner/domain';

export const PLAYER_KEY_PREFIX = 'combat-planner.player.';

export type PlayerKeyStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const browserStorage: PlayerKeyStorage = {
  getItem: (key) => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
};

const storageKey = (combatId: CombatId): string => `${PLAYER_KEY_PREFIX}${combatId}`;

const read = (storage: PlayerKeyStorage, combatId: CombatId): PlayerCredentials | null => {
  try {
    const parsed = playerCredentialsSchema.safeParse(
      JSON.parse(storage.getItem(storageKey(combatId)) ?? 'null'),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export function playerKeysOf(storage: PlayerKeyStorage): PlayerKeyStore {
  const known = new Map<CombatId, PlayerCredentials>();
  return {
    get: (combatId) => {
      const cached = known.get(combatId);
      if (cached) return cached;
      const stored = read(storage, combatId);
      if (stored) known.set(combatId, stored);
      return stored;
    },
    set: (combatId, credentials) => {
      known.set(combatId, credentials);
      try {
        storage.setItem(storageKey(combatId), JSON.stringify(credentials));
      } catch {
        return;
      }
    },
  };
}
