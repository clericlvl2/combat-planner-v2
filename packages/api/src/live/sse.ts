import type { CombatId, PlayerCombat, Viewer } from '@combat-planner/domain';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { ApiEvent, DmCombat, Locale } from '../client.ts';
import { subscribe } from './registry.ts';

export const HEARTBEAT_MS = 15_000;

const LAST_EVENT_ID = 'Last-Event-ID';

type DmViewer = Extract<Viewer, { kind: 'dm' }>;
type PlayerViewer = Extract<Viewer, { kind: 'player' }>;

export type StreamRequest =
  | { combatId: CombatId; viewer: DmViewer; load: () => DmCombat | undefined }
  | {
      combatId: CombatId;
      viewer: PlayerViewer;
      load: () => PlayerCombat | undefined;
      language: () => Locale;
    };

const toMessage = (event: ApiEvent) => ({
  event: event.type,
  data: JSON.stringify(event),
  ...(event.type === 'document' ? { id: String(event.version) } : {}),
});

export const streamCombatEvents = (c: Context, request: StreamRequest): Response => {
  const { combatId, viewer, load } = request;
  const language = 'language' in request ? request.language : undefined;
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
        const unsubscribe = subscribe(
          combatId,
          language === undefined ? { viewer, send } : { viewer, send, language },
        );
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
          const document = load();
          if (!document) {
            finish();
            return;
          }
          if (lastEventId === String(document.version)) return;
          send({
            type: 'document',
            version: document.version,
            document,
            ...(language === undefined ? {} : { language: language() }),
          });
        } catch (error) {
          stop();
          reject(error);
        }
      }),
  );
};
