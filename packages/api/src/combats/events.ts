import { Hono } from 'hono';
import type { ApiAppEnv } from '../app.ts';
import { requireUser } from '../auth/require-user.ts';
import { streamCombatEvents } from '../live/sse.ts';
import { dmDocument } from './log.ts';
import { NOT_FOUND, findOwnCombat } from './store.ts';

export const eventsApp = new Hono<ApiAppEnv>().use(requireUser).get('/:id/events', (c) => {
  const db = c.get('db');
  const ownerId = c.get('userId');
  const combatId = c.req.param('id');
  if (!findOwnCombat(db, ownerId, combatId)) return c.json(NOT_FOUND, 404);
  return streamCombatEvents(c, {
    combatId,
    viewer: { kind: 'dm' },
    load: () => {
      const combat = findOwnCombat(db, ownerId, combatId);
      return combat && dmDocument(db, combat);
    },
  });
});
