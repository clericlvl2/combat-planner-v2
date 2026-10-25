export type TourStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type TourRole = 'dm' | 'player' | 'turn';

export const TOUR_KEYS: Record<TourRole, string> = {
  dm: 'combat-planner.tour.dm.v1',
  player: 'combat-planner.tour.player.v1',
  turn: 'combat-planner.tour.turn.v1',
};

export const TOUR_ROLES = Object.keys(TOUR_KEYS) as TourRole[];

export interface TourStage {
  stage: number;
  skipped: readonly number[];
  combatId?: string;
}

export type TourProgress = 'unset' | 'done' | TourStage;

export const isStage = (progress: TourProgress): progress is TourStage =>
  typeof progress === 'object';

function parseStage(raw: string): TourStage | null {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null) return null;
  const { stage, skipped, combatId } = value as Record<string, unknown>;
  if (typeof stage !== 'number' || !Number.isInteger(stage) || stage < 1) return null;
  if (!Array.isArray(skipped) || !skipped.every((item) => typeof item === 'number')) return null;
  const numbers = skipped as number[];
  return typeof combatId === 'string'
    ? { stage, skipped: numbers, combatId }
    : { stage, skipped: numbers };
}

export function parseTourProgress(raw: string | null): TourProgress {
  if (raw === null) return 'unset';
  if (raw === 'done') return 'done';
  try {
    return parseStage(raw) ?? 'done';
  } catch {
    return 'done';
  }
}

export const serializeTourProgress = (progress: TourStage | 'done'): string =>
  progress === 'done' ? 'done' : JSON.stringify(progress);

export function readTourProgress(storage: TourStorage, role: TourRole): TourProgress {
  try {
    return parseTourProgress(storage.getItem(TOUR_KEYS[role]));
  } catch {
    return 'done';
  }
}

export function writeTourProgress(
  storage: TourStorage,
  role: TourRole,
  progress: TourProgress,
): void {
  try {
    if (progress === 'unset') storage.removeItem(TOUR_KEYS[role]);
    else storage.setItem(TOUR_KEYS[role], serializeTourProgress(progress));
  } catch {
    return;
  }
}

export function memoryTourStorage(seed: Partial<Record<TourRole, TourProgress>> = {}): TourStorage {
  const values = new Map<string, string>();
  const storage: TourStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  for (const role of TOUR_ROLES) {
    const progress = seed[role];
    if (progress !== undefined) writeTourProgress(storage, role, progress);
  }
  return storage;
}

export function resetTours(storage: TourStorage): void {
  writeTourProgress(storage, 'dm', { stage: 1, skipped: [] });
  writeTourProgress(storage, 'player', 'unset');
  writeTourProgress(storage, 'turn', 'unset');
}

export const TOUR_RESET_PARAM = 'tour';

export function resetToursFromUrl(
  storage: TourStorage,
  location: Pick<Location, 'href'>,
  history: Pick<History, 'replaceState' | 'state'>,
): void {
  const url = new URL(location.href);
  if (url.searchParams.get(TOUR_RESET_PARAM) !== 'reset') return;
  resetTours(storage);
  url.searchParams.delete(TOUR_RESET_PARAM);
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
