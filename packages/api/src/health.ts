import type { Health } from '@combat-planner/domain';
import { Hono } from 'hono';

export const healthApp = new Hono().get('/', (c) => c.json({ status: 'ok' } satisfies Health));
