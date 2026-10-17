import type { PlayerId } from '@combat-planner/domain';
import { ulidSchema } from '@combat-planner/domain';
import { ulid } from 'ulid';

export const PLAYER_ID_KEY = 'combat-planner.player-id';

export type PlayerIdStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const browserStorage: PlayerIdStorage = {
  getItem: (key) => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
};

const stored = (storage: PlayerIdStorage): string | null => {
  try {
    return storage.getItem(PLAYER_ID_KEY);
  } catch {
    return null;
  }
};

export function loadPlayerId(storage: PlayerIdStorage, generate: () => string = ulid): PlayerId {
  const existing = ulidSchema.safeParse(stored(storage));
  if (existing.success) return existing.data;
  const created = generate();
  try {
    storage.setItem(PLAYER_ID_KEY, created);
  } catch {
    return created;
  }
  return created;
}

export function playerIdOf(storage: PlayerIdStorage): () => PlayerId {
  let current: PlayerId | undefined;
  return () => {
    current ??= loadPlayerId(storage);
    return current;
  };
}
