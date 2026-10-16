import type { Combat, CombatId, Viewer } from '@combat-planner/domain';
import { project } from '@combat-planner/domain';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { ApiEvent } from '../client.ts';
import { subscribe } from './registry.ts';

export const HEARTBEAT_MS = 15_000;

const LAST_EVENT_ID = 'Last-Event-ID';

export interface StreamRequest {
  combatId: CombatId;
  viewer: Viewer;
  load: () => Combat | undefined;
}

const toMessage = (event: ApiEvent) => ({
  event: event.type,
  data: JSON.stringify(event),
  ...(event.type === 'document' ? { id: String(event.version) } : {}),
});

export const streamCombatEvents = (
  c: Context,
  { combatId, viewer, load }: StreamRequest,
): Response => {
  const lastEventId = c.req.header(LAST_EVENT_ID);
  const signal = c.req.raw.signal;
  return streamSSE(
    c,
    (stream) =>
      new Promise<void>((resolve, reject) => {
        let accepting = true;
        const stop = () => {
          if (!accepting) return;
          accepting = false;
          clearInterval(heartbeat);
          signal.removeEventListener('abort', finish);
          unsubscribe();
        };
        const finish = () => {
          stop();
          resolve();
        };
        const send = (event: ApiEvent) => {
          if (!accepting) return;
          if (event.type === 'document') {
            void stream.writeSSE(toMessage(event));
            return;
          }
          stop();
          void stream.writeSSE(toMessage(event)).then(finish);
        };
        const unsubscribe = subscribe(combatId, { viewer, send });
        const heartbeat = setInterval(() => {
          void stream.write(':\n\n');
        }, HEARTBEAT_MS);
        stream.onAbort(finish);
        signal.addEventListener('abort', finish);
        if (signal.aborted) {
          finish();
          return;
        }
        try {
          const combat = load();
          if (!combat) {
            finish();
            return;
          }
          if (lastEventId === String(combat.version)) return;
          send({ type: 'document', version: combat.version, document: project(combat, viewer) });
        } catch (error) {
          stop();
          reject(error);
        }
      }),
  );
};
