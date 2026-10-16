import { healthSchema, tickSchema } from '@combat-planner/domain';
import { describe, expect, it } from 'vite-plus/test';
import { createApiApp } from './app.ts';

const app = createApiApp({ tickIntervalMs: 5 });

describe('api app', () => {
  it('answers /health with an ok status', async () => {
    const response = await app.request('/health');
    expect(response.status).toBe(200);
    expect(healthSchema.parse(await response.json())).toEqual({ status: 'ok' });
  });

  it('streams numbered ticks from /events', async () => {
    const response = await app.request('/events');
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    let received = '';
    while (!received.includes('id: 1\n')) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value;
    }
    await reader.cancel();
    const dataLines = received.split('\n').filter((line) => line.startsWith('data: '));
    const ticks = dataLines.map((line) => tickSchema.parse(JSON.parse(line.slice(6))).tick);
    expect(ticks.slice(0, 2)).toEqual([0, 1]);
  });
});
