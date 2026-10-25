import { readTourProgress, writeTourProgress } from './progress.ts';
import type { TourProgress, TourRole, TourStorage } from './progress.ts';

export interface TourStore {
  get: (role: TourRole) => TourProgress;
  set: (role: TourRole, progress: TourProgress) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createTourStore(storage: TourStorage | null): TourStore {
  const listeners = new Set<() => void>();
  const cache = new Map<TourRole, TourProgress>();
  return {
    get: (role) => {
      if (storage === null) return 'done';
      const cached = cache.get(role);
      if (cached !== undefined) return cached;
      const read = readTourProgress(storage, role);
      cache.set(role, read);
      return read;
    },
    set: (role, progress) => {
      if (storage === null) return;
      cache.set(role, progress);
      writeTourProgress(storage, role, progress);
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
