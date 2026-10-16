import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { ApiAppEnv } from '../app.ts';
import { requireUser } from '../auth/require-user.ts';
import { settingsSchema } from '../client.ts';
import { USER_NOT_FOUND, findSettings, saveSettings } from './store.ts';

export const settingsApp = new Hono<ApiAppEnv>()
  .use(requireUser)
  .get('/', (c) => {
    const settings = findSettings(c.get('db'), c.get('userId'));
    if (!settings) return c.json(USER_NOT_FOUND, 404);
    return c.json(settings);
  })
  .patch('/', zValidator('json', settingsSchema), (c) => {
    const settings = c.req.valid('json');
    if (!saveSettings(c.get('db'), c.get('userId'), settings)) return c.json(USER_NOT_FOUND, 404);
    return c.json(settings);
  });
