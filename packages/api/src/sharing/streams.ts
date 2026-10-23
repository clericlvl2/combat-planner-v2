import type { AppDatabase } from '../db/index.ts';
import { subscriptions } from '../live/registry.ts';
import { liveSessionIds } from './store.ts';

export function closeEndedDmStreams(db: AppDatabase, now = new Date().toISOString()): void {
  const live = liveSessionIds(db, now);
  for (const { subscriber } of subscriptions()) {
    if (subscriber.viewer.kind !== 'dm' || subscriber.sessionId === undefined) continue;
    if (!live.has(subscriber.sessionId)) subscriber.close?.();
  }
}
