import { actionSchema } from '@combat-planner/domain';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { ApiAppEnv } from '../app.ts';
import { requireUser } from '../auth/require-user.ts';
import { dispatch } from './dispatch.ts';
import { nowIso } from './store.ts';

export const actionsApp = new Hono<ApiAppEnv>()
  .use(requireUser)
  .post('/:id/actions', zValidator('json', actionSchema), (c) => {
    const outcome = dispatch(c.get('db'), {
      combatId: c.req.param('id'),
      ownerId: c.get('userId'),
      viewer: { kind: 'dm' },
      action: c.req.valid('json'),
      now: nowIso(),
    });
    if (!outcome.ok) {
      return c.json({ code: outcome.code, message: outcome.message }, outcome.status);
    }
    return c.json({ version: outcome.version });
  });
