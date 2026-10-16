import type { Tick } from '@combat-planner/domain';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export function createEventsApp(intervalMs: number) {
  return new Hono().get('/', (c) =>
    streamSSE(c, async (stream) => {
      let tick = 0;
      while (!stream.aborted) {
        const payload: Tick = { tick };
        await stream.writeSSE({ event: 'tick', id: String(tick), data: JSON.stringify(payload) });
        tick += 1;
        await stream.sleep(intervalMs);
      }
    }),
  );
}
