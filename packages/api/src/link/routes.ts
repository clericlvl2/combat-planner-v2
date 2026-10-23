import { reissueLink, shareLink } from '@combat-planner/domain';
import { Hono } from 'hono';
import type { UserAppEnv } from '../app.ts';
import { NOT_FOUND, findOwnCombat, nowIso } from '../combats/store.ts';
import { readLink, writeLink } from '../sharing/store.ts';
import { announceReissue, reissueGeneration } from './reissue.ts';
import { signLink } from './token.ts';

export const linkApp = new Hono<UserAppEnv>()
  .get('/:id/link', (c) => {
    const db = c.get('db');
    const combat = findOwnCombat(db, c.get('userId'), c.req.param('id'));
    if (!combat) return c.json(NOT_FOUND, 404);
    const link = readLink(db, combat.id);
    if (link && link.phase !== 'live') writeLink(db, combat.id, shareLink(link));
    const generation = combat.linkGeneration;
    const token = signLink({ combatId: combat.id, generation }, c.get('env').linkSecret);
    return c.json({ token, generation });
  })
  .post('/:id/link/reissue', (c) => {
    const combat = c.get('db').transaction((tx) => {
      const found = findOwnCombat(tx, c.get('userId'), c.req.param('id'));
      return found && reissueGeneration(tx, found, reissueLink(), nowIso());
    });
    if (!combat) return c.json(NOT_FOUND, 404);
    announceReissue(combat);
    const token = signLink(
      { combatId: combat.id, generation: combat.linkGeneration },
      c.get('env').linkSecret,
    );
    return c.json({ token, generation: combat.linkGeneration });
  });
