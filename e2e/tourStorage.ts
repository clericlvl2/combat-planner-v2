export const TOUR_STORAGE_KEYS = [
  'combat-planner.tour.dm.v1',
  'combat-planner.tour.player.v1',
  'combat-planner.tour.turn.v1',
] as const;

export interface StorageState {
  cookies: [];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
}

export const emptyStorage: StorageState = { cookies: [], origins: [] };

export function toursDone(origin: string): StorageState {
  return {
    cookies: [],
    origins: [{ origin, localStorage: TOUR_STORAGE_KEYS.map((name) => ({ name, value: 'done' })) }],
  };
}
