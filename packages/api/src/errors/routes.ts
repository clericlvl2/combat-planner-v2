import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { ApiAppEnv } from '../app.ts';
import { errorReportSchema } from '../client.ts';
import { recordError } from './store.ts';

export const errorsApp = new Hono<ApiAppEnv>().post(
  '/',
  zValidator('json', errorReportSchema),
  (c) => {
    recordError(c.get('db'), 'client', c.req.valid('json'));
    return c.body(null, 204);
  },
);
