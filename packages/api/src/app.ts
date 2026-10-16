import { Hono } from 'hono';
import { createEventsApp } from './events.ts';
import { healthApp } from './health.ts';

export function createApiApp({ tickIntervalMs }: { tickIntervalMs: number }) {
  return new Hono().route('/health', healthApp).route('/events', createEventsApp(tickIntervalMs));
}

export type AppType = ReturnType<typeof createApiApp>;
